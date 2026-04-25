import { useMemo } from 'react'
import { AnalysisPanel } from '@/components/AnalysisPanel'
import { ChessBoardPanel } from '@/components/ChessBoard'
import { MoveHistory } from '@/components/MoveHistory'
import { PreferenceToolbar } from '@/components/PreferenceToolbar'
import { ThinkingStylePanel } from '@/components/ThinkingStylePanel'
import { useGame } from '@/hooks/useGame'
import { formatEvaluation } from '@/lib/chess'
import type { AuthUser, ThemePreferences } from '@/types'

interface Props {
  user: AuthUser | null
  preferences: ThemePreferences
  onPreferencesChange: (patch: Partial<ThemePreferences>) => void
  onAuthRequested: () => void
  onCreateRoom: () => void
  creatingRoom: boolean
}

export function GamePage({
  user,
  preferences,
  onPreferencesChange,
  onAuthRequested,
  onCreateRoom,
  creatingRoom,
}: Props) {
  const { state, onPlayerMove, runAnalysis, reset, resign, offerDraw, inCheck, turn } = useGame(
    user,
    preferences.engineLevel
  )

  const extState = state as typeof state & { thinkingStyle: import('@/hooks/useGame').ThinkingStyleProfile | null; drawOffered: boolean }

  const statusText = useMemo(() => {
    if (state.result) return null
    return turn === state.playerColor ? 'Your move' : 'Engine thinking...'
  }, [state.playerColor, state.result, turn])

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
      <PreferenceToolbar preferences={preferences} onChange={onPreferencesChange} />

      <div
        className={`grid gap-4 ${
          preferences.focusMode ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1fr)_340px]'
        }`}
      >
        {/* Left: Board column */}
        <section className="flex min-w-0 flex-col gap-3">
          {/* Algorithmic live insight banner */}
          {preferences.algorithmicMode && (
            <AlgorithmicBanner
              enabled={preferences.algorithmicMode}
              insight={state.liveInsight?.explanation ?? null}
              type={state.liveInsight?.type ?? null}
            />
          )}

          {/* Board */}
          <div className="rounded-xl border border-chess-border bg-chess-panel/60 p-3 sm:p-4">
            <div
              className={`mx-auto w-full ${
                preferences.focusMode ? 'max-w-[1040px]' : 'max-w-[680px]'
              }`}
            >
              <ChessBoardPanel
                state={extState}
                onMove={onPlayerMove}
                inCheck={inCheck}
                boardTheme={preferences.boardTheme}
                statusText={statusText}
                onResign={resign}
                onOfferDraw={offerDraw}
              />
            </div>
          </div>

          {/* Eval bar */}
          <EvalBar value={state.currentEval} />

          {/* Info row */}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="rounded-xl border border-chess-border bg-chess-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base text-chess-gold">Single-player</h2>
                  <p className="mt-1 text-sm text-chess-muted">
                    Play Stockfish, then analyse mistakes through greedy, minimax, trade-off, and positional lenses.
                  </p>
                  <p className="mt-2 text-xs font-mono uppercase tracking-wide text-chess-muted">
                    Engine level: {preferences.engineLevel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) { onAuthRequested(); return }
                    onCreateRoom()
                  }}
                  disabled={creatingRoom}
                  className="rounded-lg border border-chess-gold/30 bg-chess-gold/10 px-4 py-2 text-xs font-mono uppercase tracking-wide text-chess-gold transition-colors hover:bg-chess-gold/20 disabled:opacity-60"
                >
                  {creatingRoom ? 'Creating...' : 'Multiplayer room'}
                </button>
              </div>
            </div>

            {!user ? (
              <button
                type="button"
                onClick={onAuthRequested}
                className="rounded-xl border border-chess-border bg-chess-surface px-4 py-3 text-sm font-mono text-chess-text transition-colors hover:border-chess-gold/30"
              >
                Sign in for history
              </button>
            ) : null}
          </div>
        </section>

        {/* Right: Sidebar */}
        <aside
          className={`flex min-w-0 flex-col gap-3 ${
            preferences.sidebarCollapsed || preferences.focusMode ? 'lg:hidden' : ''
          }`}
        >
          {/* Player cards */}
          <div className="grid grid-cols-2 gap-3">
            <PlayerCard
              label={user?.username || user?.email || 'You'}
              subtitle="Human"
              rating={user?.rating}
              isActive={turn === 'white' && !state.result}
            />
            <PlayerCard
              label="Stockfish"
              subtitle={preferences.engineLevel}
              isActive={turn === 'black' && !state.result}
            />
          </div>

          {/* Move history - compact scrollable */}
          <div className="rounded-xl border border-chess-border bg-chess-panel p-3 max-h-48 overflow-y-auto">
            <MoveHistory moves={state.moves} analysis={state.analysis} />
          </div>

          {/* Analysis panel */}
          <div className="rounded-xl border border-chess-border bg-chess-panel p-4">
            <AnalysisPanel state={state} onRunAnalysis={runAnalysis} onReset={reset} />
          </div>

          {/* Thinking style - shown after analysis */}
          {extState.thinkingStyle && (
            <ThinkingStylePanel profile={extState.thinkingStyle} />
          )}
        </aside>
      </div>
    </main>
  )
}

function AlgorithmicBanner({
  enabled,
  insight,
  type,
}: {
  enabled: boolean
  insight: string | null
  type: string | null
}) {
  if (!enabled) return null

  const typeColors: Record<string, string> = {
    greedy: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
    minimax: 'text-sky-300 border-sky-400/30 bg-sky-400/10',
    tradeoff: 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-400/10',
    positional: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
  }

  return (
    <div className="rounded-xl border border-chess-border bg-chess-panel p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-mono uppercase tracking-[0.15em] text-chess-muted">
          ⚡ Live Algorithmic Feedback
        </p>
        {type ? (
          <span className={`rounded-full border px-3 py-0.5 text-xs font-mono uppercase tracking-wide ${typeColors[type] ?? 'text-chess-gold border-chess-gold/30 bg-chess-gold/10'}`}>
            {type}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-chess-text">
        {insight || 'Make a move — AlgoChess will tag it as Greedy, Minimax, Trade-off, or Positional.'}
      </p>
    </div>
  )
}

function PlayerCard({
  label,
  subtitle,
  rating,
  isActive,
}: {
  label: string
  subtitle: string
  rating?: number
  isActive: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        isActive ? 'border-chess-gold/40 bg-chess-gold/10' : 'border-chess-border bg-chess-panel'
      }`}
    >
      <p className="truncate font-display text-sm text-chess-text">{label}</p>
      <p className="mt-0.5 text-xs text-chess-muted">{subtitle}</p>
      {rating !== undefined && (
        <p className="mt-1 text-xs font-mono text-chess-gold">{rating}</p>
      )}
      {isActive ? (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-chess-gold animate-pulse" />
          <p className="text-xs font-mono uppercase tracking-wide text-chess-gold">Active</p>
        </div>
      ) : null}
    </div>
  )
}

function EvalBar({ value }: { value: number }) {
  const whitePercent = Math.max(10, Math.min(90, 50 + value / 20))

  return (
    <div className="flex items-center gap-3 rounded-xl border border-chess-border bg-chess-panel px-4 py-2.5">
      <span className="w-10 text-right text-xs font-mono text-chess-muted">
        {formatEvaluation(value)}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-chess-border">
        <div
          className="h-full rounded-full bg-gradient-to-r from-white via-chess-gold to-chess-gold transition-all duration-500"
          style={{ width: `${whitePercent}%` }}
        />
      </div>
      <span className="w-10 text-xs font-mono text-chess-muted">
        {formatEvaluation(-value)}
      </span>
    </div>
  )
}
