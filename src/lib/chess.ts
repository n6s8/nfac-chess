import { Chess } from 'chess.js'
import type { ChessMove, GameResult, PlayerColor } from '@/types'

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function createGame(fen = INITIAL_FEN): Chess {
  return new Chess(fen)
}

export function makeMove(
  game: Chess,
  move: { from: string; to: string; promotion?: string }
): ChessMove | null {
  try {
    const result = game.move(move)
    if (!result) return null

    return {
      san: result.san,
      from: result.from,
      to: result.to,
      fen: game.fen(),
      promotion: result.promotion,
      color: result.color === 'w' ? 'white' : 'black',
      uci: `${result.from}${result.to}${result.promotion ?? ''}`,
      captured: result.captured,
    }
  } catch {
    return null
  }
}

export function undoMove(game: Chess): void {
  game.undo()
}

export function getGameResult(game: Chess): GameResult {
  if (!game.isGameOver()) return null

  if (game.isCheckmate()) {
    return game.turn() === 'w' ? 'black' : 'white'
  }

  return 'draw'
}

export function isGameOver(game: Chess): boolean {
  return game.isGameOver()
}

export function isInCheck(game: Chess): boolean {
  return game.isCheck()
}

export function getCurrentTurn(game: Chess): PlayerColor {
  return game.turn() === 'w' ? 'white' : 'black'
}

export function getOpponentColor(color: PlayerColor): PlayerColor {
  return color === 'white' ? 'black' : 'white'
}

export function getPgn(game: Chess): string {
  return game.pgn()
}

export function getFen(game: Chess): string {
  return game.fen()
}

export function getMoveHistory(game: Chess): string[] {
  return game.history()
}

export function loadMovesIntoGame(moves: ChessMove[]): Chess {
  const game = new Chess()

  for (const move of moves) {
    game.move({ from: move.from, to: move.to, promotion: move.promotion })
  }

  return game
}

export function uciToSan(fen: string, uci: string): string | null {
  try {
    const tempGame = new Chess(fen)
    const from = uci.slice(0, 2)
    const to = uci.slice(2, 4)
    const promotion = uci.length === 5 ? uci[4] : undefined
    const move = tempGame.move({ from, to, promotion })
    return move ? move.san : null
  } catch {
    return null
  }
}

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20_000,
}

type FallbackCandidate = {
  from: string
  to: string
  san: string
  piece: string
  captured?: string
  promotion?: string
}

export function chooseFallbackMove(game: Chess): ChessMove | null {
  const candidates = game.moves({ verbose: true }) as FallbackCandidate[]

  if (candidates.length === 0) {
    return null
  }

  const ranked = [...candidates].sort((left, right) => scoreFallbackMove(right) - scoreFallbackMove(left))
  const best = ranked[0]

  return makeMove(game, {
    from: best.from,
    to: best.to,
    promotion: best.promotion,
  })
}

function scoreFallbackMove(move: FallbackCandidate): number {
  let score = 0

  if (move.captured) {
    score += 300 + (PIECE_VALUES[move.captured] ?? 0)
  }

  if (move.promotion) {
    score += 700
  }

  if (move.san.includes('+')) {
    score += 120
  }

  if (move.san === 'O-O' || move.san === 'O-O-O') {
    score += 80
  }

  if (move.piece === 'n' || move.piece === 'b') {
    score += 30
  }

  if (['d4', 'e4', 'd5', 'e5', 'Nf3', 'Nc3', 'Nf6', 'Nc6'].includes(move.san.replace(/[+#]/g, ''))) {
    score += 20
  }

  return score
}

export function formatEvaluation(centipawns: number): string {
  if (Math.abs(centipawns) > 900) {
    return centipawns > 0 ? '+M' : '-M'
  }

  const pawns = centipawns / 100
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`
}

export function getEvalBarPercentage(centipawns: number): number {
  const clamped = Math.max(-1000, Math.min(1000, centipawns))
  return 50 + clamped / 20
}
