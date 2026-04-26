import { useCallback, useEffect, useReducer, useRef } from 'react'
import { Chess } from 'chess.js'
import { analyzeGame, buildStructuredInsight, classifyMoveStyle, enrichAnalysisWithExplanations } from '@/lib/ai'
import {
  chooseFallbackMove,
  getFen,
  getGameResult,
  getPgn,
  getCurrentTurn,
  INITIAL_FEN,
  isGameOver,
  isInCheck,
  makeMove,
  uciToSan,
} from '@/lib/chess'
import { getEngine, LEVEL_CONFIG } from '@/lib/stockfish'
import { saveGame, upsertProfile } from '@/lib/supabase'
import type {
  AuthUser,
  ChessMove,
  EngineLevel,
  GameResult,
  GameState,
  LiveMovePreview,
  MoveAnalysis,
  MistakeType,
} from '@/types'

export interface ThinkingStyleProfile {
  greedy: number
  minimax: number
  tradeoff: number
  positional: number
}

type Action =
  | { type: 'MOVE'; move: ChessMove; fen: string }
  | { type: 'AI_THINKING'; value: boolean }
  | { type: 'GAME_OVER'; result: GameResult }
  | { type: 'START_ANALYSIS' }
  | { type: 'ANALYSIS_PROGRESS'; pct: number }
  | { type: 'ANALYSIS_DONE'; analysis: MoveAnalysis[]; thinkingStyle: ThinkingStyleProfile }
  | { type: 'SET_EVAL'; value: number }
  | { type: 'SET_LIVE_INSIGHT'; insight: GameState['liveInsight'] }
  | { type: 'RESET' }
  | { type: 'RESIGN' }
  | { type: 'OFFER_DRAW' }
  | { type: 'DRAW_ACCEPTED' }
  | { type: 'DRAW_DECLINED' }

interface ExtendedGameState extends GameState {
  thinkingStyle: ThinkingStyleProfile | null
  drawOffered: boolean
}

const initialState: ExtendedGameState = {
  fen: INITIAL_FEN,
  moves: [],
  status: 'playing',
  result: null,
  playerColor: 'white',
  isAiThinking: false,
  analysis: [],
  isAnalyzing: false,
  analysisProgress: 0,
  currentEval: 0,
  liveInsight: null,
  mode: 'ai',
  thinkingStyle: null,
  drawOffered: false,
}

function getLevelConfig(level: EngineLevel) {
  return LEVEL_CONFIG[level] ?? LEVEL_CONFIG.Intermediate
}

function reducer(state: ExtendedGameState, action: Action): ExtendedGameState {
  switch (action.type) {
    case 'MOVE':
      return { ...state, fen: action.fen, moves: [...state.moves, action.move], status: 'playing', drawOffered: false }
    case 'AI_THINKING':
      return { ...state, isAiThinking: action.value }
    case 'GAME_OVER':
      return { ...state, result: action.result, status: action.result === 'draw' ? 'draw' : 'checkmate', isAiThinking: false }
    case 'START_ANALYSIS':
      return { ...state, isAnalyzing: true, analysisProgress: 0, status: 'analyzing' }
    case 'ANALYSIS_PROGRESS':
      return { ...state, analysisProgress: action.pct }
    case 'ANALYSIS_DONE':
      return { ...state, analysis: action.analysis, thinkingStyle: action.thinkingStyle, isAnalyzing: false, analysisProgress: 100, status: 'analyzed' }
    case 'SET_EVAL':
      return { ...state, currentEval: action.value }
    case 'SET_LIVE_INSIGHT':
      return { ...state, liveInsight: action.insight }
    case 'RESIGN':
      return { ...state, result: state.playerColor === 'white' ? 'black' : 'white', status: 'checkmate', isAiThinking: false }
    case 'OFFER_DRAW':
      return { ...state, drawOffered: true }
    case 'DRAW_ACCEPTED':
      return { ...state, result: 'draw', status: 'draw', drawOffered: false, isAiThinking: false }
    case 'DRAW_DECLINED':
      return { ...state, drawOffered: false }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

function computeThinkingStyle(moves: ChessMove[]): ThinkingStyleProfile {
  const counts: Record<MistakeType, number> = { greedy: 0, minimax: 0, tradeoff: 0, positional: 0 }
  const playerMoves = moves.filter((_, i) => i % 2 === 0) // white moves = player moves
  if (playerMoves.length === 0) return { greedy: 0, minimax: 0, tradeoff: 0, positional: 100 }

  for (const move of playerMoves) {
    const style = classifyMoveStyle(move.san)
    counts[style]++
  }

  const total = playerMoves.length
  return {
    greedy: Math.round((counts.greedy / total) * 100),
    minimax: Math.round((counts.minimax / total) * 100),
    tradeoff: Math.round((counts.tradeoff / total) * 100),
    positional: Math.round((counts.positional / total) * 100),
  }
}

async function updateEloAfterGame(
  user: AuthUser,
  result: GameResult,
  playerColor: 'white' | 'black'
) {
  const playerWon = result === playerColor
  const isDraw = result === 'draw'
  const ratingChange = isDraw ? 0 : playerWon ? 15 : -15

  const newRating = Math.max(100, (user.rating ?? 1200) + ratingChange)
  const newWins = user.games_won + (playerWon ? 1 : 0)
  const newLosses = user.games_lost + (!playerWon && !isDraw ? 1 : 0)
  const newDraws = user.games_drawn + (isDraw ? 1 : 0)

  await upsertProfile({
    id: user.id,
    email: user.email,
    username: user.username ?? null,
    country: user.country ?? null,
    city: user.city ?? null,
    rating: newRating,
    games_won: newWins,
    games_lost: newLosses,
    games_drawn: newDraws,
  })
}

export function useGame(user?: AuthUser | null, engineLevel: EngineLevel = 'Intermediate') {
  const [state, dispatch] = useReducer(reducer, initialState)
  const gameRef = useRef<Chess>(new Chess())
  const gameRecordId = useRef<string | null>(null)
  const isProcessingAi = useRef(false)
  const previewRef = useRef<LiveMovePreview | null>(null)
  const previewInFlightFen = useRef<string | null>(null)
  const levelConfig = getLevelConfig(engineLevel)

  useEffect(() => {
    if (state.status === 'playing' || !state.result || !user || gameRecordId.current) return

    const thinkingStyle = computeThinkingStyle(state.moves)

    void saveGame({
      user_id: user.id,
      room_id: null,
      mode: 'ai',
      pgn: getPgn(gameRef.current),
      moves: state.moves,
      result: state.result,
      analysis: state.analysis.length > 0 ? state.analysis : null,
      winner_id: state.result === state.playerColor ? user.id : null,
      loser_id: state.result && state.result !== 'draw' && state.result !== state.playerColor ? user.id : null,
      white_player_id: state.playerColor === 'white' ? user.id : null,
      black_player_id: state.playerColor === 'black' ? user.id : null,
      white_player_email: state.playerColor === 'white' ? user.email : 'Stockfish',
      black_player_email: state.playerColor === 'black' ? user.email : 'Stockfish',
      metadata: { source: 'single-player', thinkingStyle },
    })
      .then((record) => {
        if (record?.id) {
          gameRecordId.current = record.id
        }
      })
      .catch((error) => console.error('[useGame] auto-save error:', error))
  }, [state.status, state.result, state.moves, state.analysis, state.playerColor, user])

  const primePlayerPreview = useCallback(async () => {
    const game = gameRef.current
    const fen = getFen(game)

    if (state.status !== 'playing') return
    if (state.isAiThinking) return
    if (getCurrentTurn(game) !== state.playerColor) return
    if (previewRef.current?.fen === fen || previewInFlightFen.current === fen) return

    previewInFlightFen.current = fen

    try {
      // Use shallow depth for preview, no skill override needed
      const evaluation = await getEngine().evaluate(fen, Math.min(levelConfig.depth, 8))
      previewRef.current = { fen, evaluation }
      dispatch({ type: 'SET_EVAL', value: evaluation.score })
    } catch (error) {
      console.error('[useGame] preview error:', error)
    } finally {
      previewInFlightFen.current = null
    }
  }, [levelConfig.depth, state.isAiThinking, state.playerColor, state.status])

  const onPlayerMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      const game = gameRef.current

      if (state.status !== 'playing' && state.status !== 'checking') return false
      if (state.isAiThinking) return false
      if (game.turn() !== state.playerColor[0]) return false

      const move = makeMove(game, { from, to, promotion: promotion ?? 'q' })
      if (!move) return false

      const type = classifyMoveStyle(move.san)
      const mappedTypeString = type === 'minimax' ? 'Strategic' : type.charAt(0).toUpperCase() + type.slice(1)
      
      dispatch({
        type: 'SET_LIVE_INSIGHT',
        insight: {
          move: move.san,
          bestMove: '',
          evaluationDiff: 0,
          type,
          severity: 0,
          explanation: `This move is ${mappedTypeString}.`,
        }
      })

      dispatch({ type: 'MOVE', move, fen: getFen(game) })

      if (isGameOver(game)) {
        const result = getGameResult(game)
        dispatch({ type: 'GAME_OVER', result })
        if (user && result !== null) {
          void updateEloAfterGame(user, result, state.playerColor).catch(console.error)
        }
      }

      return true
    },
    [state.isAiThinking, state.playerColor, state.status, user]
  )

  const triggerAiMove = useCallback(async () => {
    const game = gameRef.current
    if (isProcessingAi.current) return
    if (isGameOver(game)) return
    if (game.turn() === state.playerColor[0]) return

    isProcessingAi.current = true
    dispatch({ type: 'AI_THINKING', value: true })

    try {
      const engine = getEngine()
      // Pass correct depth AND skill level for this difficulty
      const evaluation = await engine.evaluate(getFen(game), levelConfig.depth, levelConfig.skill)
      const lastMove = state.moves[state.moves.length - 1]
      const preview = previewRef.current

      if (preview && lastMove) {
        const bestMove = uciToSan(preview.fen, preview.evaluation.bestMove) ?? preview.evaluation.bestMove
        const evaluationDiff =
          state.playerColor === 'white'
            ? evaluation.score - preview.evaluation.score
            : preview.evaluation.score - evaluation.score

        dispatch({
          type: 'SET_LIVE_INSIGHT',
          insight: buildStructuredInsight(lastMove.san, bestMove, evaluationDiff, undefined, state.moves.length - 1),
        })
      }

      const uci = evaluation.bestMove
      if (!uci) throw new Error('Stockfish did not return a best move')

      const aiMove = makeMove(game, {
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length === 5 ? uci[4] : undefined,
      })

      if (!aiMove) throw new Error(`Stockfish suggested invalid move ${uci}`)

      previewRef.current = null
      dispatch({ type: 'MOVE', move: aiMove, fen: getFen(game) })
      dispatch({ type: 'AI_THINKING', value: false })

      if (isGameOver(game)) {
        const result = getGameResult(game)
        dispatch({ type: 'GAME_OVER', result })
        if (user && result !== null) {
          void updateEloAfterGame(user, result, state.playerColor).catch(console.error)
        }
      }
    } catch (error) {
      console.error('[useGame] AI move error:', error)

      const fallbackMove = chooseFallbackMove(game)
      if (fallbackMove) {
        previewRef.current = null
        dispatch({ type: 'MOVE', move: fallbackMove, fen: getFen(game) })

        if (isGameOver(game)) {
          const result = getGameResult(game)
          dispatch({ type: 'GAME_OVER', result })
          if (user && result !== null) {
            void updateEloAfterGame(user, result, state.playerColor).catch(console.error)
          }
        }
      }
    } finally {
      dispatch({ type: 'AI_THINKING', value: false })
      isProcessingAi.current = false
    }
  }, [levelConfig.depth, levelConfig.skill, state.moves, state.playerColor, user])

  useEffect(() => {
    if (state.status !== 'playing') return
    if (state.isAiThinking) return
    if (getCurrentTurn(gameRef.current) !== state.playerColor) return
    void primePlayerPreview()
  }, [state.fen, state.isAiThinking, state.playerColor, state.status, primePlayerPreview])

  useEffect(() => {
    const game = gameRef.current
    if (state.status !== 'playing') return
    if (state.isAiThinking) return
    if (game.turn() === state.playerColor[0]) return

    const timer = window.setTimeout(() => {
      void triggerAiMove()
    }, 350)

    return () => window.clearTimeout(timer)
  }, [state.moves, state.status, state.isAiThinking, state.playerColor, triggerAiMove])

  const runAnalysis = useCallback(async () => {
    if (state.moves.length === 0) return

    dispatch({ type: 'START_ANALYSIS' })

    try {
      const rawAnalysis = await analyzeGame(state.moves, (pct) => {
        dispatch({ type: 'ANALYSIS_PROGRESS', pct: Math.round(pct * 0.7) })
      })

      const enriched = await enrichAnalysisWithExplanations(rawAnalysis, (pct) => {
        dispatch({ type: 'ANALYSIS_PROGRESS', pct: 70 + Math.round(pct * 0.3) })
      })

      const thinkingStyle = computeThinkingStyle(state.moves)
      dispatch({ type: 'ANALYSIS_DONE', analysis: enriched, thinkingStyle })

      if (user?.id) {
        await saveGame({
          id: gameRecordId.current ?? undefined,
          user_id: user.id,
          room_id: null,
          mode: 'ai',
          pgn: getPgn(gameRef.current),
          moves: state.moves,
          result: state.result,
          analysis: enriched,
          winner_id: state.result === state.playerColor ? user.id : null,
          loser_id: state.result && state.result !== 'draw' && state.result !== state.playerColor ? user.id : null,
          white_player_id: state.playerColor === 'white' ? user.id : null,
          black_player_id: state.playerColor === 'black' ? user.id : null,
          white_player_email: state.playerColor === 'white' ? user.email : 'Stockfish',
          black_player_email: state.playerColor === 'black' ? user.email : 'Stockfish',
          metadata: { source: 'single-player', thinkingStyle },
        }).then(record => {
          if (record?.id) gameRecordId.current = record.id
        }).catch((error) => {
          console.error('[useGame] saveGame error:', error)
        })
      }
    } catch (error) {
      console.error('[useGame] analysis error:', error)
      dispatch({ type: 'ANALYSIS_DONE', analysis: [], thinkingStyle: { greedy: 0, minimax: 0, tradeoff: 0, positional: 100 } })
    }
  }, [state.moves, state.playerColor, state.result, user])

  const resign = useCallback(() => {
    dispatch({ type: 'RESIGN' })
    if (user) {
      const result = state.playerColor === 'white' ? 'black' : 'white'
      void updateEloAfterGame(user, result, state.playerColor).catch(console.error)
    }
  }, [state.playerColor, user])

  const offerDraw = useCallback(() => {
    dispatch({ type: 'OFFER_DRAW' })
    // For AI game: auto-decline draw after a brief moment (AI doesn't accept draws easily)
    setTimeout(() => {
      dispatch({ type: 'DRAW_DECLINED' })
    }, 2000)
  }, [])

  const acceptDraw = useCallback(() => {
    dispatch({ type: 'DRAW_ACCEPTED' })
    if (user) {
      void updateEloAfterGame(user, 'draw', state.playerColor).catch(console.error)
    }
  }, [user, state.playerColor])

  const reset = useCallback(() => {
    gameRef.current = new Chess()
    getEngine().newGame()
    gameRecordId.current = null
    isProcessingAi.current = false
    previewRef.current = null
    previewInFlightFen.current = null
    dispatch({ type: 'RESET' })
  }, [])

  const inCheck = isInCheck(gameRef.current)
  const turn = getCurrentTurn(gameRef.current)

  return {
    state,
    onPlayerMove,
    runAnalysis,
    reset,
    resign,
    offerDraw,
    acceptDraw,
    inCheck,
    turn,
  } as const
}
