import type { ThinkingStyleProfile } from '@/hooks/useGame'

interface Props {
  profile: ThinkingStyleProfile
  gameId?: string | null
}

const STYLE_CONFIG = {
  greedy: {
    label: 'Greedy',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    weakness: 'You prioritise immediate material gain over long-term structure.',
    drills: [
      'Before every capture, ask: what does my opponent play next?',
      'Solve 3 puzzles tagged "Positional advantage" — no tactics',
      'Play 1 game aiming for 0 captures before move 10',
    ],
  },
  minimax: {
    label: 'Minimax / Strategic',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.3)',
    weakness: "You underestimate the opponent's strongest defensive resource.",
    drills: [
      "After your planned move, spend 5 seconds on opponent's best reply",
      'Solve 3 "Defend the position" puzzles',
      'Play 1 game as Black — practice reactive minimax thinking',
    ],
  },
  tradeoff: {
    label: 'Trade-off',
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.12)',
    border: 'rgba(192, 132, 252, 0.3)',
    weakness: 'You misvalue piece exchanges — trading too eagerly or avoiding good swaps.',
    drills: [
      'Evaluate: is my piece more active than the one I am swapping it for?',
      'Solve 3 "Piece activity" puzzles',
      'Study one bishop vs knight endgame from the classics',
    ],
  },
  positional: {
    label: 'Positional',
    color: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.12)',
    border: 'rgba(74, 222, 128, 0.3)',
    weakness: 'You make small structural concessions that quietly compound.',
    drills: [
      'Identify your weakest pawn before every move',
      'Solve 3 "Pawn structure" puzzles',
      'Play 1 game in classical time control — slow down your positional decisions',
    ],
  },
} as const

type StyleKey = keyof typeof STYLE_CONFIG

export function TrainingPlan({ profile, gameId }: Props) {
  const entries = (Object.entries(profile) as [StyleKey, number][]).sort((a, b) => b[1] - a[1])
  const [dominantKey, dominantPct] = entries[0]
  const [secondKey, secondPct] = entries[1]
  const config = STYLE_CONFIG[dominantKey]
  const secondConfig = STYLE_CONFIG[secondKey]

  return (
    <div className="rounded-xl border border-chess-border bg-chess-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-chess-muted">
            Weekly Training Plan
          </p>
          <h3 className="mt-1 font-display text-lg" style={{ color: config.color }}>
            Focus: {config.label} ({dominantPct}%)
          </h3>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-mono uppercase tracking-wide"
          style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.color }}
        >
          Primary weakness
        </span>
      </div>

      <p className="text-sm text-chess-muted leading-relaxed">{config.weakness}</p>

      <div className="mt-4 space-y-2">
        {config.drills.map((drill, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-chess-border bg-chess-surface px-3 py-2.5">
            <span
              className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-mono font-bold"
              style={{ background: config.bg, color: config.color }}
            >
              {i + 1}
            </span>
            <p className="text-sm text-chess-text leading-snug">{drill}</p>
          </div>
        ))}
      </div>

      {secondPct > 15 && (
        <div className="mt-4 rounded-lg border border-chess-border bg-chess-surface px-3 py-2.5">
          <p className="text-xs font-mono uppercase tracking-wide" style={{ color: secondConfig.color }}>
            Secondary pattern — {secondConfig.label} ({secondPct}%)
          </p>
          <p className="mt-1 text-xs text-chess-muted">{secondConfig.weakness}</p>
        </div>
      )}

      {gameId && (
        <div className="mt-4 border-t border-chess-border pt-4">
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/replay/${gameId}`
              void navigator.clipboard.writeText(url).then(() => {
                // quick visual feedback handled by parent
              })
            }}
            className="w-full rounded-lg border border-chess-border bg-chess-surface px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-chess-muted transition-colors hover:border-chess-gold/40 hover:text-chess-gold"
          >
            📋 Copy replay link
          </button>
        </div>
      )}
    </div>
  )
}
