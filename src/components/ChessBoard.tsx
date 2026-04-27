import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess, type Square } from 'chess.js'
import type { CSSProperties } from 'react'
import type { BoardTheme, GameState, PlayerColor } from '@/types'
import { soundCapture, soundCheck, soundDraw, soundGameOver, soundMove } from '@/hooks/useChessSound'

interface Props {
  state: GameState
  onMove: (from: string, to: string, promotion?: string) => boolean
  inCheck: boolean
  boardTheme: BoardTheme
  orientation?: PlayerColor
  statusText?: string | null
  onResign?: () => void
  onOfferDraw?: () => void
}

const BOARD_THEMES: Record<BoardTheme, { light: string; dark: string; border: string }> = {
  classic: { light: '#f0d9b5', dark: '#b58863', border: 'rgba(232, 184, 75, 0.18)' },
  neon: { light: '#d6fff8', dark: '#145b73', border: 'rgba(56, 189, 248, 0.45)' },
  minimal: { light: '#f5f5f4', dark: '#78716c', border: 'rgba(148, 163, 184, 0.35)' },
}

export function ChessBoardPanel({
  state,
  onMove,
  inCheck,
  boardTheme,
  orientation,
  statusText,
  onResign,
  onOfferDraw,
}: Props) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showResignConfirm, setShowResignConfirm] = useState(false)
  const prevMoveCount = useRef(0)
  const prevResult = useRef<string | null>(null)
  const prevInCheck = useRef(false)

  // Sound effects
  useEffect(() => {
    const moveCount = state.moves.length
    if (moveCount > prevMoveCount.current) {
      const lastMove = state.moves[moveCount - 1]
      if (lastMove?.captured) {
        soundCapture()
      } else {
        soundMove()
      }
      prevMoveCount.current = moveCount
    }
  }, [state.moves])

  useEffect(() => {
    if (inCheck && !prevInCheck.current) soundCheck()
    prevInCheck.current = inCheck
  }, [inCheck])

  useEffect(() => {
    if (state.result && state.result !== prevResult.current) {
      if (state.result === 'draw') soundDraw()
      else soundGameOver(state.result === state.playerColor)
      prevResult.current = state.result
    }
  }, [state.result, state.playerColor])

  const isInteractive =
    state.status === 'playing' && !state.isAiThinking && state.result === null

  const theme = BOARD_THEMES[boardTheme]

  // Determine board orientation: use explicit override, or player color XOR flip state
  const boardOrientation: PlayerColor = useMemo(() => {
    if (orientation) return isFlipped ? (orientation === 'white' ? 'black' : 'white') : orientation
    return isFlipped
      ? state.playerColor === 'white' ? 'black' : 'white'
      : state.playerColor
  }, [orientation, isFlipped, state.playerColor])

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {}

    if (state.moves.length > 0) {
      const lastMove = state.moves[state.moves.length - 1]
      const severityTint =
        state.liveInsight && state.liveInsight.severity > 60
          ? 'rgba(239, 68, 68, 0.24)'
          : 'rgba(232, 184, 75, 0.24)'
      styles[lastMove.from] = { backgroundColor: 'rgba(232, 184, 75, 0.16)' }
      styles[lastMove.to] = { backgroundColor: severityTint }
    }

    if (selectedSquare) {
      styles[selectedSquare] = { backgroundColor: 'rgba(59, 130, 246, 0.25)' }

      // Show legal moves from the selected square
      try {
        const game = new Chess(state.fen)
        
        // If the user clicks their piece when it's NOT their turn (e.g., just exploring moves),
        // chess.js won't return moves because it respects the FEN's active color.
        // To allow seeing moves for any piece, we can temporarily set the turn to that piece's color.
        const piece = game.get(selectedSquare as Square)
        if (piece) {
          const fenParts = state.fen.split(' ')
          fenParts[1] = piece.color // Force the turn to the selected piece's color
          game.load(fenParts.join(' '))
        }

        const moves = game.moves({ square: selectedSquare as Square, verbose: true })
        
        for (const move of moves) {
          const isCapture = !!game.get(move.to as Square)
          
          styles[move.to] = {
            ...styles[move.to],
            backgroundImage: isCapture 
              ? 'radial-gradient(transparent 0%, transparent 79%, rgba(0,0,0,.3) 80%)'
              : 'radial-gradient(circle, rgba(0,0,0,.3) 25%, transparent 25%)',
            // If we set borderRadius: 50% here, it clips the whole square (including any backgroundColor).
            // But since radial-gradient is already circular, we don't strictly need borderRadius for the dot.
            // We just let the gradient draw the circle/ring over the square.
          }
        }
      } catch (error) {
        // ignore invalid FENs
      }
    }

    return styles
  }, [selectedSquare, state.liveInsight, state.moves, state.fen])

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!isInteractive) return
      
      if (selectedSquare === square) {
        // Deselect if clicking the same square twice
        setSelectedSquare(null)
        return
      }

      // If a square is already selected, try to move to the newly clicked square
      if (selectedSquare) {
        try {
          const game = new Chess(state.fen)
          const moves = game.moves({ square: selectedSquare as Square, verbose: true })
          const validMove = moves.find((m) => m.to === square)

          if (validMove) {
            // It's a valid move, execute it!
            const success = onMove(selectedSquare, square, validMove.promotion ? 'q' : undefined)
            if (success) {
              setSelectedSquare(null)
              return
            }
          }
        } catch (error) {
          // Ignore FEN parsing errors
        }
      }

      // Otherwise, select the newly clicked square
      setSelectedSquare(square)
    },
    [isInteractive, selectedSquare, state.fen, onMove]
  )

  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string, piece: string): boolean => {
      if (!isInteractive) return false
      const isPromotion =
        piece[1] === 'P' &&
        ((piece[0] === 'w' && targetSquare[1] === '8') ||
          (piece[0] === 'b' && targetSquare[1] === '1'))
      const success = onMove(sourceSquare, targetSquare, isPromotion ? 'q' : undefined)
      if (success) setSelectedSquare(null)
      return success
    },
    [isInteractive, onMove]
  )

  const bannerText =
    statusText ??
    (state.status === 'checkmate'
      ? 'Checkmate!'
      : state.status === 'stalemate'
        ? 'Stalemate!'
        : state.isAiThinking
          ? 'Engine thinking...'
          : state.status === 'waiting'
            ? 'Waiting for opponent...'
            : inCheck
              ? '⚠ Check!'
              : null)

  const gameOver = state.result !== null && state.status !== 'analyzing' && state.status !== 'analyzed'

  return (
    <div className="relative w-full flex flex-col gap-3">
      {/* Board Controls Row */}
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={() => setIsFlipped((f) => !f)}
          title="Flip board"
          className="flex items-center gap-1.5 rounded-lg border border-chess-border bg-chess-surface px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-chess-muted transition-colors hover:border-chess-gold/40 hover:text-chess-gold"
        >
          <FlipIcon />
          Flip
        </button>

        {isInteractive && onResign && onOfferDraw && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOfferDraw()}
              className="rounded-lg border border-chess-border bg-chess-surface px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-chess-muted transition-colors hover:border-sky-400/40 hover:text-sky-400"
            >
              ½ Draw
            </button>
            <button
              type="button"
              onClick={() => setShowResignConfirm(true)}
              className="rounded-lg border border-chess-border bg-chess-surface px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-chess-muted transition-colors hover:border-red-400/40 hover:text-red-400"
            >
              Resign
            </button>
          </div>
        )}
      </div>

      {/* The Board */}
      <div className="relative w-full">
        {bannerText ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-chess-border bg-chess-panel/95 px-4 py-1.5 text-xs font-mono tracking-wide text-chess-gold shadow-panel whitespace-nowrap">
            {bannerText}
          </div>
        ) : null}

        {/* Draw offered notification */}
        {'drawOffered' in state && (state as { drawOffered: boolean }).drawOffered && (
          <div className="pointer-events-none absolute left-1/2 top-12 z-10 -translate-x-1/2 rounded-lg border border-sky-400/40 bg-chess-panel/95 px-4 py-2 text-xs font-mono text-sky-400 shadow-panel whitespace-nowrap">
            Draw offer sent — AI is thinking...
          </div>
        )}

        <div
          className="overflow-hidden rounded-lg border bg-chess-surface shadow-panel transition-all duration-300"
          style={{ borderColor: theme.border, boxShadow: '0 18px 60px rgba(0, 0, 0, 0.32)' }}
        >
          <Chessboard
            position={state.fen}
            onPieceDrop={handlePieceDrop}
            onSquareClick={handleSquareClick}
            boardOrientation={boardOrientation}
            arePiecesDraggable={isInteractive}
            customBoardStyle={{ borderRadius: '6px' }}
            customLightSquareStyle={{ backgroundColor: theme.light }}
            customDarkSquareStyle={{ backgroundColor: theme.dark }}
            customSquareStyles={customSquareStyles}
            animationDuration={220}
          />
        </div>

        {/* Game over overlay */}
        {gameOver ? (
          <div className="mt-4 rounded-lg border border-chess-border bg-chess-panel p-4 text-center animate-slide-up">
            <p className="font-display text-lg text-chess-gold">
              {state.result === 'white' && '♔ White wins'}
              {state.result === 'black' && '♚ Black wins'}
              {state.result === 'draw' && '½ Draw'}
            </p>
            <p className="mt-1 text-sm font-mono text-chess-muted">
              {state.moves.length} moves played
            </p>
          </div>
        ) : null}
      </div>

      {/* Resign confirm modal */}
      {showResignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl border border-chess-border bg-chess-panel p-6 shadow-panel max-w-sm w-full mx-4">
            <h3 className="font-display text-lg text-chess-gold">Resign the game?</h3>
            <p className="mt-2 text-sm text-chess-muted">This will count as a loss. Are you sure?</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowResignConfirm(false)
                  onResign?.()
                }}
                className="flex-1 rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2.5 text-sm font-mono text-red-400 transition-colors hover:bg-red-500/30"
              >
                Yes, resign
              </button>
              <button
                type="button"
                onClick={() => setShowResignConfirm(false)}
                className="flex-1 rounded-lg border border-chess-border bg-chess-surface px-4 py-2.5 text-sm font-mono text-chess-muted transition-colors hover:border-chess-gold/30"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FlipIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 4L4 1L7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 8L8 11L5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 11V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
