import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { analyzeGame, buildStructuredInsight, enrichAnalysisWithExplanations } from '@/lib/ai'
import {
  getCurrentTurn,
  getFen,
  getGameResult,
  getPgn,
  INITIAL_FEN,
  isGameOver,
  makeMove,
  getOpponentColor,
  uciToSan,
} from '@/lib/chess'
import { getEngine } from '@/lib/stockfish'
import { getTimeControlConfig } from '@/lib/time-controls'
import {
  getGameRoom,
  joinGameRoom,
  recordMultiplayerResult,
  sendRoomMessage,
  subscribeToRoom,
  updateGameRoomState,
} from '@/lib/supabase'
import type {
  AuthUser,
  ChessMove,
  GameResult,
  GameRoomRecord,
  GameState,
  LiveMovePreview,
  MoveAnalysis,
} from '@/types'

function deriveStatus(room: GameRoomRecord | null): GameState['status'] {
  if (!room) return 'waiting'
  if (room.status === 'waiting') return 'waiting'
  if (room.status === 'finished') {
    return room.result === 'draw' ? 'draw' : 'checkmate'
  }
  return 'playing'
}

export function useGameRoom(roomId: string | undefined, user?: AuthUser | null) {
  const [room, setRoom] = useState<GameRoomRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<MoveAnalysis[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [liveInsight, setLiveInsight] = useState<GameState['liveInsight']>(null)
  const [clockTick, setClockTick] = useState(() => Date.now())
  const previewRef = useRef<LiveMovePreview | null>(null)
  const previewInFlightFen = useRef<string | null>(null)
  const finalizeAttemptedRef = useRef(false)
  const joinAttemptedRef = useRef(false)

  useEffect(() => {
    joinAttemptedRef.current = false
    finalizeAttemptedRef.current = false
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    const currentRoomId = roomId

    let active = true
    setLoading(true)
    setError(null)

    async function bootstrap() {
      try {
        const currentRoom = await getGameRoom(currentRoomId)
        if (!active) return

        if (!currentRoom) {
          setError('Game room not found.')
          setLoading(false)
          return
        }

        setRoom(currentRoom)
        setLoading(false)
      } catch (bootstrapError) {
        console.error('[room] bootstrap error:', bootstrapError)
        if (active) {
          setError('Unable to load this room.')
          setLoading(false)
        }
      }
    }

    void bootstrap()

    const unsubscribe = subscribeToRoom(currentRoomId, (nextRoom) => {
      setRoom(nextRoom)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [roomId])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockTick(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!roomId) return

    const interval = window.setInterval(() => {
      void getGameRoom(roomId)
        .then((nextRoom) => {
          if (nextRoom) {
            setRoom((current) => {
              if (!current) {
                return nextRoom
              }

              const changed =
                current.updated_at !== nextRoom.updated_at ||
                current.fen !== nextRoom.fen ||
                current.moves.length !== nextRoom.moves.length ||
                current.status !== nextRoom.status ||
                current.turn !== nextRoom.turn ||
                current.result !== nextRoom.result ||
                current.white_time_ms !== nextRoom.white_time_ms ||
                current.black_time_ms !== nextRoom.black_time_ms ||
                (current.chat_messages?.length ?? 0) !== (nextRoom.chat_messages?.length ?? 0)

              if (changed) {
                return nextRoom
              }

              return current
            })
          }
        })
        .catch((pollError) => {
          console.error('[room] poll error:', pollError)
        })
    }, 1200)

    return () => window.clearInterval(interval)
  }, [roomId])

  useEffect(() => {
    if (!roomId || !room || !user || joinAttemptedRef.current) return

    const isParticipant = room.white_player_id === user.id || room.black_player_id === user.id
    const hasSeat = !room.white_player_id || !room.black_player_id

    if (!isParticipant && !hasSeat) return

    joinAttemptedRef.current = true

    void joinGameRoom(roomId, user)
      .then((nextRoom) => {
        if (nextRoom) {
          setRoom(nextRoom)
        }
      })
      .catch((joinError) => {
        console.error('[room] join error:', joinError)
      })
  }, [room, roomId, user])

  const role = useMemo(() => {
    if (!room || !user) return null
    if (room.white_player_id === user.id) return 'white'
    if (room.black_player_id === user.id) return 'black'
    return null
  }, [room, user])

  const clockTimes = useMemo(() => {
    const config = getTimeControlConfig(room?.time_control ?? 'blitz')
    const whiteTime = room?.white_time_ms ?? config.initialMs
    const blackTime = room?.black_time_ms ?? config.initialMs

    if (!room || room.status === 'finished' || !room.last_move_at) {
      return { white: whiteTime, black: blackTime }
    }

    const elapsed = Math.max(0, clockTick - new Date(room.last_move_at).getTime())

    if (room.turn === 'white') {
      return { white: Math.max(0, whiteTime - elapsed), black: blackTime }
    }

    return { white: whiteTime, black: Math.max(0, blackTime - elapsed) }
  }, [clockTick, room])

  const primePreview = useCallback(async () => {
    if (!room || !role) return
    if (room.status === 'finished') return
    if (room.turn !== role) return
    if (previewRef.current?.fen === room.fen || previewInFlightFen.current === room.fen) return

    previewInFlightFen.current = room.fen

    try {
      const evaluation = await getEngine().evaluate(room.fen, 10)
      previewRef.current = { fen: room.fen, evaluation }
    } catch (previewError) {
      console.error('[room] preview error:', previewError)
    } finally {
      previewInFlightFen.current = null
    }
  }, [role, room])

  useEffect(() => {
    void primePreview()
  }, [primePreview, room?.fen, room?.turn])

  const onPlayerMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!room || !role || room.status === 'finished') return false
      if (room.turn !== role) return false

      const game = new Chess(room.fen)
      const move = makeMove(game, { from, to, promotion: promotion ?? 'q' })
      if (!move) return false

      const result = isGameOver(game) ? getGameResult(game) : null
      const nextTurn = getCurrentTurn(game)
      const nowIso = new Date().toISOString()
      const config = getTimeControlConfig(room.time_control ?? 'blitz')
      const elapsed = room.last_move_at
        ? Math.max(0, Date.now() - new Date(room.last_move_at).getTime())
        : 0
      const whiteTime = room.white_time_ms ?? config.initialMs
      const blackTime = room.black_time_ms ?? config.initialMs
      const winnerId =
        result === 'white'
          ? room.white_player_id
          : result === 'black'
            ? room.black_player_id
            : null
      const nextWhiteTime =
        role === 'white'
          ? Math.max(0, whiteTime - elapsed + config.incrementMs)
          : whiteTime
      const nextBlackTime =
        role === 'black'
          ? Math.max(0, blackTime - elapsed + config.incrementMs)
          : blackTime

      const optimisticRoom: GameRoomRecord = {
        ...room,
        fen: getFen(game),
        pgn: getPgn(game),
        moves: [...room.moves, move],
        status: result ? 'finished' : 'playing',
        turn: nextTurn,
        result,
        winner_id: winnerId,
        white_time_ms: nextWhiteTime,
        black_time_ms: nextBlackTime,
        last_move_at: nowIso,
      }

      setRoom(optimisticRoom)

      void updateGameRoomState(room.id, {
        fen: optimisticRoom.fen,
        pgn: optimisticRoom.pgn,
        moves: optimisticRoom.moves,
        status: optimisticRoom.status,
        turn: optimisticRoom.turn,
        result: optimisticRoom.result,
        winner_id: optimisticRoom.winner_id,
        white_time_ms: optimisticRoom.white_time_ms,
        black_time_ms: optimisticRoom.black_time_ms,
        last_move_at: optimisticRoom.last_move_at,
        updated_at: nowIso,
      })
        .then((nextRoom) => {
          if (nextRoom) {
            setRoom(nextRoom)
          }
        })
        .catch((moveError) => {
          console.error('[room] move error:', moveError)
          setRoom(room)
        })

      const preview = previewRef.current
      if (preview) {
        void getEngine()
          .evaluate(optimisticRoom.fen, 10)
          .then((afterEvaluation) => {
            const bestMove = uciToSan(preview.fen, preview.evaluation.bestMove) ?? preview.evaluation.bestMove
            const evaluationDiff =
              role === 'white'
                ? afterEvaluation.score - preview.evaluation.score
                : preview.evaluation.score - afterEvaluation.score

            setLiveInsight(
              buildStructuredInsight(
                move.san,
                bestMove,
                evaluationDiff,
                undefined,
                optimisticRoom.moves.length - 1
              )
            )
          })
          .catch((insightError) => {
            console.error('[room] live insight error:', insightError)
          })
      }

      previewRef.current = null
      return true
    },
    [role, room]
  )

  const runAnalysis = useCallback(async () => {
    if (!room || room.moves.length === 0) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)

    try {
      const raw = await analyzeGame(room.moves, (pct) => {
        setAnalysisProgress(Math.round(pct * 0.7))
      })
      const enriched = await enrichAnalysisWithExplanations(raw, (pct) => {
        setAnalysisProgress(70 + Math.round(pct * 0.3))
      })

      setAnalysis(enriched)
      setAnalysisProgress(100)

      if (!finalizeAttemptedRef.current && user?.id === room.created_by) {
        finalizeAttemptedRef.current = true
        const loserId =
          room.result === 'white'
            ? room.black_player_id
            : room.result === 'black'
              ? room.white_player_id
              : null

        await recordMultiplayerResult({
          roomId: room.id,
          pgn: room.pgn,
          moves: room.moves,
          result: room.result,
          winnerId: room.winner_id,
          loserId,
          analysis: enriched,
          whitePlayerId: room.white_player_id,
          blackPlayerId: room.black_player_id,
          whitePlayerEmail: room.white_player_email,
          blackPlayerEmail: room.black_player_email,
        })
      }
    } catch (analysisError) {
      console.error('[room] analysis error:', analysisError)
    } finally {
      setIsAnalyzing(false)
    }
  }, [room, user?.id])

  const resignGame = useCallback(async () => {
    if (!room || !role) return

    const winnerColor = getOpponentColor(role)
    const winnerId = winnerColor === 'white' ? room.white_player_id : room.black_player_id

    const nextRoom = await updateGameRoomState(room.id, {
      fen: room.fen,
      pgn: room.pgn,
      moves: room.moves,
      status: 'finished',
      turn: room.turn,
      result: winnerColor,
      winner_id: winnerId,
      white_time_ms: room.white_time_ms,
      black_time_ms: room.black_time_ms,
      last_move_at: new Date().toISOString(),
      chat_messages: [
        ...(room.chat_messages ?? []),
        {
          id: crypto.randomUUID(),
          sender_id: user?.id ?? 'system',
          sender_label: user?.username || user?.email || role,
          message: `${user?.username || user?.email || 'A player'} resigned.`,
          created_at: new Date().toISOString(),
        },
      ],
    })
    setRoom(nextRoom)
  }, [role, room, user?.email, user?.id, user?.username])

  const offerDraw = useCallback(async () => {
    if (!room || !user) return

    const nextMessages = [
      ...(room.chat_messages ?? []),
      {
        id: crypto.randomUUID(),
        sender_id: user.id,
        sender_label: user.username || user.email,
        message: 'offers a draw.',
        created_at: new Date().toISOString(),
      },
    ]

    const nextRoom = await sendRoomMessage(room.id, nextMessages)
    setRoom(nextRoom)
  }, [room, user])

  const sendChatMessage = useCallback(
    async (message: string) => {
      if (!room || !user || !message.trim()) return

      const nextMessages = [
        ...(room.chat_messages ?? []),
        {
          id: crypto.randomUUID(),
          sender_id: user.id,
          sender_label: user.username || user.email,
          message: message.trim(),
          created_at: new Date().toISOString(),
        },
      ]

      const nextRoom = await sendRoomMessage(room.id, nextMessages)
      setRoom(nextRoom)
    },
    [room, user]
  )

  useEffect(() => {
    if (!room || room.status !== 'finished') return
    if (room.moves.length === 0) return
    if (analysis.length > 0 || isAnalyzing) return

    void runAnalysis()
  }, [analysis.length, isAnalyzing, room, runAnalysis])

  useEffect(() => {
    if (!room || room.status === 'finished') return
    if (!user || user.id !== room.created_by) return

    const whiteFlagged = clockTimes.white <= 0
    const blackFlagged = clockTimes.black <= 0

    if (!whiteFlagged && !blackFlagged) return

    const result = whiteFlagged ? 'black' : 'white'
    const winnerId = result === 'white' ? room.white_player_id : room.black_player_id

    void updateGameRoomState(room.id, {
      fen: room.fen,
      pgn: room.pgn,
      moves: room.moves,
      status: 'finished',
      turn: room.turn,
      result,
      winner_id: winnerId,
      white_time_ms: Math.max(0, clockTimes.white),
      black_time_ms: Math.max(0, clockTimes.black),
      last_move_at: new Date().toISOString(),
      chat_messages: [
        ...(room.chat_messages ?? []),
        {
          id: crypto.randomUUID(),
          sender_id: 'system',
          sender_label: 'Clock',
          message: `${whiteFlagged ? 'White' : 'Black'} lost on time.`,
          created_at: new Date().toISOString(),
        },
      ],
    })
      .then((nextRoom) => {
        if (nextRoom) {
          setRoom(nextRoom)
        }
      })
      .catch((clockError) => {
        console.error('[room] clock result error:', clockError)
      })
  }, [clockTimes.black, clockTimes.white, room, user])

  const state: GameState = {
    fen: room?.fen ?? INITIAL_FEN,
    moves: room?.moves ?? [],
    status: deriveStatus(room),
    result: room?.result ?? null,
    playerColor: role ?? 'white',
    isAiThinking: false,
    analysis,
    isAnalyzing,
    analysisProgress,
    currentEval: 0,
    liveInsight,
    mode: 'multiplayer',
  }

  return {
    room,
    state,
    role,
    loading,
    error,
    clockTimes,
    onPlayerMove,
    runAnalysis,
    resignGame,
    offerDraw,
    sendChatMessage,
    shareUrl:
      roomId && typeof window !== 'undefined' ? `${window.location.origin}/game/${roomId}` : '',
    canMove: Boolean(role && room?.turn === role && room.status !== 'finished'),
  } as const
}
