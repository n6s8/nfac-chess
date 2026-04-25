import { useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { AnalysisPanel } from '@/components/AnalysisPanel'
import { ChessBoardPanel } from '@/components/ChessBoard'
import { MoveHistory } from '@/components/MoveHistory'
import { getGameById } from '@/lib/supabase'
import type { ChessMove, GameRecord, GameState, ThemePreferences } from '@/types'

interface Props {
  gameId?: string
  preferences: ThemePreferences
}

export function ReplayPage({ gameId, preferences }: Props) {
  const [record, setRecord] = useState<GameRecord | null>(null)
  const [moveIndex, setMoveIndex] = useState(-1)

  useEffect(() => {
    if (!gameId) return

    void getGameById(gameId)
      .then((game) => {
        setRecord(game)
      })
      .catch((error) => {
        console.error('[replay] load error:', error)
        setRecord(null)
      })
  }, [gameId])

  const moves = useMemo(() => buildReplayMoves(record), [record])

  const replayState = useMemo<GameState>(() => {
    const chess = new Chess()
    const visibleMoves = moves.slice(0, moveIndex + 1)

    for (const move of visibleMoves) {
      chess.move({ from: move.from, to: move.to, promotion: move.promotion })
    }

    return {
      fen: chess.fen(),
      moves: visibleMoves,
      status: 'analyzed',
      result: record?.result ?? null,
      playerColor: 'white',
      isAiThinking: false,
      analysis: record?.analysis ?? [],
      isAnalyzing: false,
      analysisProgress: 100,
      currentEval: record?.analysis?.[moveIndex]?.scoreAfter ?? 0,
      liveInsight:
        moveIndex >= 0 && record?.analysis?.[moveIndex]
          ? {
              move: record.analysis[moveIndex].move,
              type: record.analysis[moveIndex].type,
              explanation: record.analysis[moveIndex].explanation,
              severity: record.analysis[moveIndex].severity,
              bestMove: record.analysis[moveIndex].bestMove,
              evaluationDiff: record.analysis[moveIndex].evaluationDiff,
              moveIndex,
            }
          : null,
      mode: 'replay',
    }
  }, [moveIndex, moves, record])

  if (!record) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-chess-border bg-chess-panel p-6">
          <h1 className="font-display text-2xl text-chess-gold">Replay unavailable</h1>
          <p className="mt-3 text-chess-muted">
            This game could not be loaded from your history.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <section className="rounded-xl border border-chess-border bg-chess-panel p-5">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-chess-muted">Replay</p>
        <h1 className="mt-1 font-display text-2xl text-chess-gold">Review finished game</h1>
        <p className="mt-2 text-sm text-chess-muted">
          Step through every move, inspect the stored analysis, and revisit the critical decision points.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="rounded-xl border border-chess-border bg-chess-panel/60 p-3 sm:p-4">
            <div className="mx-auto w-full max-w-[680px]">
              <ChessBoardPanel
                state={replayState}
                onMove={() => false}
                inCheck={false}
                boardTheme={preferences.boardTheme}
                statusText={
                  moveIndex >= 0 ? `Replay move ${moveIndex + 1} of ${moves.length}` : 'Replay start position'
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 rounded-xl border border-chess-border bg-chess-panel p-4">
            <ReplayButton label="Start" onClick={() => setMoveIndex(-1)} />
            <ReplayButton label="Back" onClick={() => setMoveIndex((current) => Math.max(-1, current - 1))} />
            <ReplayButton label="Forward" onClick={() => setMoveIndex((current) => Math.min(moves.length - 1, current + 1))} />
            <ReplayButton label="End" onClick={() => setMoveIndex(moves.length - 1)} />
          </div>
        </section>

        <aside
          className={`flex min-w-0 flex-col gap-4 ${
            preferences.sidebarCollapsed ? 'lg:hidden' : ''
          }`}
        >
          <div className="rounded-xl border border-chess-border bg-chess-panel p-4">
            <MoveHistory
              moves={moves}
              analysis={record.analysis ?? []}
              activeIndex={moveIndex}
              onSelect={setMoveIndex}
            />
          </div>
          <div className="rounded-xl border border-chess-border bg-chess-panel p-4">
            <AnalysisPanel state={replayState} onRunAnalysis={() => undefined} />
          </div>
        </aside>
      </div>
    </main>
  )
}

function buildReplayMoves(record: GameRecord | null): ChessMove[] {
  if (!record) return []

  if (Array.isArray(record.moves) && record.moves.length > 0 && typeof record.moves[0] !== 'string') {
    return record.moves as ChessMove[]
  }

  if (!record.pgn) return []

  const chess = new Chess()
  chess.loadPgn(record.pgn)

  const replay = new Chess()
  return chess.history({ verbose: true }).map((move) => {
    replay.move({ from: move.from, to: move.to, promotion: move.promotion })
    return {
      san: move.san,
      from: move.from,
      to: move.to,
      fen: replay.fen(),
      promotion: move.promotion,
      color: move.color === 'w' ? 'white' : 'black',
      uci: `${move.from}${move.to}${move.promotion ?? ''}`,
    }
  })
}

function ReplayButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-chess-border bg-chess-surface px-4 py-2 text-sm font-mono text-chess-text transition-colors hover:border-chess-gold/30"
    >
      {label}
    </button>
  )
}
