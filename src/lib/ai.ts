/**
 * ai.ts — Post-game analysis orchestration.
 *
 * SECURITY: NO LLM API keys in this file. All Groq calls are proxied through
 * the `ai-debrief` Supabase Edge Function (server-side).
 * The Stockfish engine analysis still runs locally in the browser Web Worker.
 */
import { Chess } from 'chess.js'
import { uciToSan } from './chess'
import { getEngine } from './stockfish'
import { supabase } from './supabase'
import type { ChessMove, MistakeType, MoveAnalysis, MoveInsight } from '@/types'

const BLUNDER_THRESHOLD = parseInt(import.meta.env.VITE_BLUNDER_THRESHOLD ?? '150', 10)
const MISTAKE_THRESHOLD = 50
const FALLBACK_EXPLANATION = 'This move prioritizes short-term gain over long-term strategy.'

export async function analyzeGame(
  moves: ChessMove[],
  onProgress?: (pct: number) => void
): Promise<MoveAnalysis[]> {
  const engine = getEngine()
  await engine.waitReady()

  const results: MoveAnalysis[] = []
  const game = new Chess()

  let previousEvaluation = await engine.evaluate(game.fen(), 12)
  let previousScore = previousEvaluation.score

  for (let index = 0; index < moves.length; index += 1) {
    const move = moves[index]
    const fenBefore = game.fen()
    const isWhiteMove = game.turn() === 'w'

    game.move({ from: move.from, to: move.to, promotion: move.promotion })
    const fenAfter = game.fen()

    const afterEvaluation = await engine.evaluate(fenAfter, 12)
    const afterScore = afterEvaluation.score

    const evaluationDiff = isWhiteMove
      ? afterScore - previousScore
      : previousScore - afterScore

    const bestMoveSan = uciToSan(fenBefore, previousEvaluation.bestMove) ?? previousEvaluation.bestMove
    const insight = buildStructuredInsight(move.san, bestMoveSan, evaluationDiff, undefined, index)

    results.push({
      moveIndex: index,
      move: move.san,
      fen: fenAfter,
      scoreBefore: previousScore,
      scoreAfter: afterScore,
      evaluationDiff,
      bestMove: bestMoveSan,
      bestMoveUci: previousEvaluation.bestMove,
      mistake: evaluationDiff < -MISTAKE_THRESHOLD && evaluationDiff >= -BLUNDER_THRESHOLD,
      blunder: evaluationDiff < -BLUNDER_THRESHOLD,
      type: insight.type,
      explanation: insight.explanation,
      severity: insight.severity,
    })

    previousEvaluation = afterEvaluation
    previousScore = afterScore
    onProgress?.(Math.round(((index + 1) / moves.length) * 100))
  }

  return results
}

/**
 * Explain a move via the secure Edge Function (no browser-side API key).
 * Falls back to a heuristic explanation if the Edge Function is unreachable.
 */
export async function explainMove(move: string, bestMove: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-debrief', {
      body: { mode: 'explain-move', move, bestMove },
    })

    if (error) throw error
    return (data?.explanation as string) || FALLBACK_EXPLANATION
  } catch (err) {
    console.error('[AI] explainMove edge function error:', err)
    return FALLBACK_EXPLANATION
  }
}

export async function enrichAnalysisWithExplanations(
  analyses: MoveAnalysis[],
  onProgress?: (pct: number) => void
): Promise<MoveAnalysis[]> {
  const issues = analyses.filter((analysis) => analysis.blunder || analysis.mistake)
  const result = [...analyses]

  for (let index = 0; index < issues.length; index += 1) {
    const issue = issues[index]
    const targetIndex = analyses.findIndex((item) => item.moveIndex === issue.moveIndex)
    if (targetIndex === -1) continue

    const explanation = await explainMove(issue.move, issue.bestMove)
    const insight = buildStructuredInsight(
      issue.move,
      issue.bestMove,
      issue.evaluationDiff,
      explanation,
      issue.moveIndex
    )

    result[targetIndex] = {
      ...result[targetIndex],
      type: insight.type,
      explanation: insight.explanation,
      severity: insight.severity,
    }

    onProgress?.(Math.round(((index + 1) / Math.max(issues.length, 1)) * 100))

    if (index < issues.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
  }

  return result
}

export function buildStructuredInsight(
  move: string,
  bestMove: string,
  evaluationDiff: number,
  explanation?: string,
  moveIndex?: number
): MoveInsight {
  const type = classifyMistakeType(move, bestMove, evaluationDiff, explanation)
  const severity = getSeverity(evaluationDiff)
  const fallback = createFallbackExplanation(type, move, bestMove)

  return {
    move,
    bestMove,
    evaluationDiff,
    moveIndex,
    type,
    severity,
    explanation: normalizeExplanation(explanation ?? fallback),
  }
}

export function classifyMistakeType(
  move: string,
  bestMove: string,
  evaluationDiff: number,
  explanation?: string
): MistakeType {
  const lower = `${move} ${bestMove} ${explanation ?? ''}`.toLowerCase()

  if (lower.includes('greedy') || (move.includes('x') && evaluationDiff < -100)) {
    return 'greedy'
  }

  if (
    lower.includes('minimax') ||
    lower.includes('opponent') ||
    lower.includes('response') ||
    evaluationDiff < -220
  ) {
    return 'minimax'
  }

  if (
    lower.includes('trade') ||
    lower.includes('trade-off') ||
    lower.includes('tradeoff') ||
    lower.includes('tempo')
  ) {
    return 'tradeoff'
  }

  return 'positional'
}

function getSeverity(evaluationDiff: number): number {
  return Math.max(5, Math.min(100, Math.round(Math.abs(evaluationDiff) / 4)))
}

function createFallbackExplanation(type: MistakeType, move: string, bestMove: string): string {
  switch (type) {
    case 'greedy':
      return `Playing ${move} behaves like a greedy algorithm by capturing immediately, while ${bestMove} keeps the stronger long-term plan.`
    case 'minimax':
      return `Playing ${move} missed the opponent's best response, while ${bestMove} matches a deeper minimax calculation tree.`
    case 'tradeoff':
      return `Playing ${move} miscalculated the trade-off costs between tempo and safety, while ${bestMove} balances them.`
    case 'positional':
    default:
      return `Playing ${move} weakens the position incrementally, while ${bestMove} preserves long-term structure.`
  }
}

function normalizeExplanation(content: string | null | undefined): string {
  if (!content) {
    return FALLBACK_EXPLANATION
  }

  const cleaned = content.replace(/\s+/g, ' ').trim()
  if (!cleaned) {
    return FALLBACK_EXPLANATION
  }

  const sentences =
    cleaned.match(/[^.!?]+[.!?]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? []

  return sentences.slice(0, 2).join(' ').trim() || FALLBACK_EXPLANATION
}

// Classify a move's style based on heuristics (captures=greedy, checks=minimax, etc.)
export function classifyMoveStyle(san: string): import('@/types').MistakeType {
  // Captures suggest greedy (taking material immediately)
  if (san.includes('x')) return 'greedy'
  // Checks suggest minimax thinking (forcing opponent response)
  if (san.includes('+') || san.includes('#')) return 'minimax'
  // Piece trades and exchanges
  if (/^[QRBN]/.test(san) && san.length <= 3) return 'tradeoff'
  // Default: positional (pawn moves, castling, quiet moves)
  return 'positional'
}
