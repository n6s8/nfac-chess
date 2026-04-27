import type { BoardTheme, EngineLevel, ThemePreferences } from '@/types'

interface Props {
  preferences: ThemePreferences
  onChange: (patch: Partial<ThemePreferences>) => void
}

const BOARD_OPTIONS: Array<{ value: BoardTheme; label: string }> = [
  { value: 'classic', label: 'Classic' },
  { value: 'neon', label: 'Neon' },
  { value: 'minimal', label: 'Minimal' },
]

const ENGINE_OPTIONS: Array<{ value: EngineLevel; label: string; elo: string; description: string }> = [
  { value: 'Beginner',     label: 'Beginner',     elo: '800',  description: 'Makes random blunders. Good for learning.' },
  { value: 'Intermediate', label: 'Intermediate', elo: '1500', description: 'Avoids obvious mistakes. Plays solid chess.' },
  { value: 'Advanced',    label: 'Advanced',     elo: '2000', description: 'Punishes every inaccuracy. Plays tactically.' },
  { value: 'Master',      label: 'Master',       elo: '3200', description: 'Near perfect play. Full depth Stockfish.' },
]

export function PreferenceToolbar({ preferences, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-chess-border bg-chess-panel/70 p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono uppercase tracking-wide text-chess-muted">Board</span>
        <div className="flex overflow-hidden rounded-md border border-chess-border">
          {BOARD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ boardTheme: option.value })}
              className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                preferences.boardTheme === option.value
                  ? 'bg-chess-gold text-chess-bg'
                  : 'bg-chess-surface text-chess-muted hover:text-chess-text'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          onChange({ colorMode: preferences.colorMode === 'dark' ? 'light' : 'dark' })
        }
        className="rounded-md border border-chess-border bg-chess-surface px-3 py-1.5 text-xs font-mono text-chess-text transition-colors hover:border-chess-gold/40"
      >
        {preferences.colorMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </button>

      <button
        type="button"
        onClick={() => onChange({ algorithmicMode: !preferences.algorithmicMode })}
        className={`rounded-md border px-3 py-1.5 text-xs font-mono transition-colors ${
          preferences.algorithmicMode
            ? 'border-chess-gold/40 bg-chess-gold/10 text-chess-gold'
            : 'border-chess-border bg-chess-surface text-chess-muted'
        }`}
      >
        Algorithmic Mode {preferences.algorithmicMode ? 'On' : 'Off'}
      </button>

      <button
        type="button"
        onClick={() => onChange({ sidebarCollapsed: !preferences.sidebarCollapsed })}
        className="rounded-md border border-chess-border bg-chess-surface px-3 py-1.5 text-xs font-mono text-chess-muted transition-colors hover:border-chess-gold/40 hover:text-chess-gold"
      >
        {preferences.sidebarCollapsed ? 'Show Sidebar' : 'Collapse Sidebar'}
      </button>

      <button
        type="button"
        onClick={() =>
          onChange({
            focusMode: !preferences.focusMode,
            sidebarCollapsed: preferences.focusMode ? preferences.sidebarCollapsed : true,
          })
        }
        className={`rounded-md border px-3 py-1.5 text-xs font-mono transition-colors ${
          preferences.focusMode
            ? 'border-chess-gold/40 bg-chess-gold/10 text-chess-gold'
            : 'border-chess-border bg-chess-surface text-chess-muted'
        }`}
      >
        {preferences.focusMode ? 'Exit Full Board View' : 'Full Board View'}
      </button>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-chess-muted">
          Engine
          <select
            value={preferences.engineLevel}
            onChange={(event) => onChange({ engineLevel: event.target.value as EngineLevel })}
            className="rounded-md border border-chess-border bg-chess-surface px-3 py-1.5 text-xs font-mono text-chess-text focus:border-chess-gold/40 focus:outline-none"
          >
            {ENGINE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.elo} ELO)
              </option>
            ))}
          </select>
        </label>
        {(() => {
          const current = ENGINE_OPTIONS.find(o => o.value === preferences.engineLevel)
          return current ? (
            <p className="ml-[4.5rem] text-[10px] text-chess-muted font-mono">{current.description}</p>
          ) : null
        })()}
      </div>
    </div>
  )
}
