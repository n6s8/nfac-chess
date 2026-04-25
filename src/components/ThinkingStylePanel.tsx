import type { ThinkingStyleProfile } from '@/hooks/useGame'

interface Props {
  profile: ThinkingStyleProfile
}

const STYLE_CONFIG = {
  greedy: {
    label: 'Greedy',
    emoji: '🎯',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    description: 'You grabbed material immediately',
  },
  minimax: {
    label: 'Strategic',
    emoji: '🧠',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.3)',
    description: 'You forced opponent responses',
  },
  tradeoff: {
    label: 'Trade-off',
    emoji: '⚖️',
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.12)',
    border: 'rgba(192, 132, 252, 0.3)',
    description: 'You weighed piece exchanges',
  },
  positional: {
    label: 'Positional',
    emoji: '🏰',
    color: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.12)',
    border: 'rgba(74, 222, 128, 0.3)',
    description: 'You built structural advantage',
  },
} as const

type StyleKey = keyof typeof STYLE_CONFIG

export function ThinkingStylePanel({ profile }: Props) {
  const entries = (Object.entries(profile) as [StyleKey, number][])
    .sort((a, b) => b[1] - a[1])

  const dominant = entries[0]
  const dominantConfig = STYLE_CONFIG[dominant[0]]

  return (
    <div className="rounded-xl border border-chess-border bg-chess-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-chess-muted">
            Your Thinking Style
          </p>
          <h3 className="mt-1 font-display text-lg" style={{ color: dominantConfig.color }}>
            {dominantConfig.emoji} {dominantConfig.label} Player
          </h3>
        </div>
        <div
          className="rounded-full px-3 py-1 text-xs font-mono"
          style={{ background: dominantConfig.bg, border: `1px solid ${dominantConfig.border}`, color: dominantConfig.color }}
        >
          {dominant[1]}%
        </div>
      </div>

      <div className="space-y-3">
        {entries.map(([key, pct]) => {
          const config = STYLE_CONFIG[key]
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-chess-muted">
                  {config.emoji} {config.label}
                </span>
                <span className="text-xs font-mono" style={{ color: config.color }}>
                  {pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-chess-border">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: config.color }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-chess-muted border-t border-chess-border pt-3">
        Based on your move patterns: {dominantConfig.description.toLowerCase()}
        {entries[1][1] > 20 && ` with a secondary ${STYLE_CONFIG[entries[1][0]].label.toLowerCase()} tendency (${entries[1][1]}%)`}.
      </p>
    </div>
  )
}
