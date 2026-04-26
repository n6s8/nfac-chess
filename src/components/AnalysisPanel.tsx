import { useMemo, useState } from 'react'
import type { GameState, MistakeType, MoveAnalysis } from '@/types'
import { MasterCouncilPanel } from './MasterCouncilPanel'

interface Props {
  state: GameState
  onRunAnalysis: () => void
  onReset?: () => void
  isPro?: boolean
  onUpgradeRequested?: () => void
}

const TYPE_META: Record<
  MistakeType,
  { label: string; classes: string; description: string }
> = {
  greedy: {
    label: 'Greedy',
    classes: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    description: 'Local gain over long-term structure.',
  },
  minimax: {
    label: 'Minimax',
    classes: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
    description: "Missed the opponent's strongest reply.",
  },
  tradeoff: {
    label: 'Trade-off',
    classes: 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300',
    description: 'Miscalculated the balance between costs and benefits.',
  },
  positional: {
    label: 'Positional',
    classes: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    description: 'Small structural concession that compounds over time.',
  },
}

export function AnalysisPanel({ state, onRunAnalysis, onReset, isPro = false, onUpgradeRequested }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const gameOver = state.result !== null || state.status === 'draw' || state.status === 'checkmate'
  const issues = useMemo(
    () => state.analysis.filter((item) => item.blunder || item.mistake),
    [state.analysis]
  )

  const selected =
    selectedIndex !== null ? state.analysis.find((item) => item.moveIndex === selectedIndex) ?? null : null

  const worstMoves = [...issues].sort((left, right) => right.severity - left.severity).slice(0, 3)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm uppercase tracking-widest text-chess-gold">
          Analysis
        </h2>
        {state.analysis.length > 0 ? (
          <span className="text-xs font-mono text-chess-muted">{issues.length} issues</span>
        ) : null}
      </div>

      {!gameOver && state.analysis.length === 0 ? (
        <>
          <div className="rounded-lg border border-chess-border bg-chess-surface p-4 text-center">
            <p className="text-sm text-chess-muted">
              Finish the game to unlock full-game Stockfish analysis and algorithmic explanations.
            </p>
          </div>
          <TypeLegend />
        </>
      ) : null}

      {gameOver && !state.isAnalyzing && state.analysis.length === 0 ? (
        <button
          type="button"
          onClick={onRunAnalysis}
          className="w-full rounded-lg bg-chess-gold px-4 py-3 text-sm font-display tracking-wider text-chess-bg transition-colors hover:bg-yellow-400"
        >
          Analyse Game
        </button>
      ) : null}

      {/* Master Council — Pro gate */}
      {gameOver && !state.isAnalyzing ? (
        <div className="mb-2">
          {isPro && state.analysis.length > 0 ? (
            <MasterCouncilPanel moves={state.moves} analysis={state.analysis} />
          ) : isPro && state.analysis.length === 0 ? (
            <div className="rounded-xl border border-chess-gold/20 bg-chess-gold/5 p-4 text-center">
              <p className="font-mono text-xs text-chess-muted">
                👑 Pro: Click "Analyse Game" above first, then run Master Council.
              </p>
            </div>
          ) : (
            <button
              id="master-council-upgrade-btn"
              onClick={onUpgradeRequested}
              className="w-full rounded-lg border border-chess-gold/30 bg-gradient-to-r from-chess-gold/10 to-chess-gold/5 px-4 py-3.5 text-sm font-mono uppercase tracking-wide text-chess-gold transition-all hover:bg-chess-gold/20 flex items-center justify-center gap-2"
            >
              <span>⚡</span>
              <span>Unlock Master Council Debrief — Pro</span>
            </button>
          )}
        </div>
      ) : null}

      {state.isAnalyzing ? (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-chess-muted">
            <span>
              {state.analysisProgress < 70
                ? 'Stockfish is scoring each move...'
                : 'AI is explaining the critical mistakes...'}
            </span>
            <span>{state.analysisProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-chess-border">
            <div
              className="h-full rounded-full bg-chess-gold transition-all duration-300"
              style={{ width: `${state.analysisProgress}%` }}
            />
          </div>
        </div>
      ) : null}

      {state.analysis.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {worstMoves.map((move) => (
              <button
                key={move.moveIndex}
                type="button"
                onClick={() => setSelectedIndex(move.moveIndex)}
                className="rounded-lg border border-chess-border bg-chess-surface p-3 text-left transition-colors hover:border-chess-gold/30"
              >
                <p className="font-mono text-xs text-chess-muted">Worst move</p>
                <p className="mt-1 font-mono text-sm text-chess-text">{move.move}</p>
                <p className="mt-2 text-xs text-chess-blunder">Severity {move.severity}</p>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {issues.length === 0 ? (
              <div className="rounded-lg border border-chess-good/30 bg-chess-surface p-3 text-center">
                <p className="font-mono text-sm text-chess-good">No major mistakes found.</p>
              </div>
            ) : (
              issues.map((item) => {
                const meta = TYPE_META[item.type]
                return (
                  <button
                    key={item.moveIndex}
                    type="button"
                    onClick={() => setSelectedIndex(item.moveIndex)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedIndex === item.moveIndex
                        ? 'border-chess-gold/50 bg-chess-gold/10'
                        : 'border-chess-border bg-chess-surface hover:border-chess-border/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm text-chess-text">{item.move}</p>
                        <p className="mt-1 text-xs text-chess-muted">{meta.description}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide ${meta.classes}`}>
                          {meta.label}
                        </span>
                        <p className="mt-2 text-xs text-chess-blunder">
                          {Math.abs(item.evaluationDiff / 100).toFixed(1)} pawns
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {selected ? <SelectedMove analysis={selected} /> : null}
        </>
      ) : null}

      {gameOver && onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-chess-border px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-chess-muted transition-colors hover:border-chess-gold/40 hover:text-chess-gold"
        >
          New Game
        </button>
      ) : null}
    </div>
  )
}

function TypeLegend() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.values(TYPE_META).map((item) => (
        <div key={item.label} className={`rounded-lg border px-3 py-2 ${item.classes}`}>
          <p className="text-xs font-mono uppercase tracking-wide">{item.label}</p>
          <p className="mt-1 text-xs text-chess-muted">{item.description}</p>
        </div>
      ))}
    </div>
  )
}

function SelectedMove({ analysis }: { analysis: MoveAnalysis }) {
  const meta = TYPE_META[analysis.type]

  return (
    <div className="animate-slide-up rounded-lg border border-chess-border bg-chess-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-chess-muted">Selected move</p>
          <h3 className="mt-1 font-display text-lg text-chess-gold">{analysis.move}</h3>
        </div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-wide ${meta.classes}`}>
          {meta.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-chess-panel p-3">
          <p className="text-xs font-mono text-chess-muted">Played</p>
          <p className="mt-1 font-mono text-chess-text">{analysis.move}</p>
        </div>
        <div className="rounded-lg border border-chess-good/20 bg-chess-panel p-3">
          <p className="text-xs font-mono text-chess-muted">Best move</p>
          <p className="mt-1 font-mono text-chess-good">{analysis.bestMove}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs font-mono text-chess-muted">
          <span>Severity</span>
          <span>{analysis.severity}/100</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-chess-border">
          <div
            className="h-full rounded-full bg-chess-blunder"
            style={{ width: `${analysis.severity}%` }}
          />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-chess-border bg-chess-panel p-3">
        <p className="text-xs font-mono uppercase tracking-wide text-chess-gold">
          Algorithmic explanation
        </p>
        <p className="mt-2 text-sm leading-relaxed text-chess-text">{analysis.explanation}</p>
      </div>
    </div>
  )
}
