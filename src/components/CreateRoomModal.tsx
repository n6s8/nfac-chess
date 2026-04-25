import { useState } from 'react'
import { TIME_CONTROL_OPTIONS } from '@/lib/time-controls'
import type { TimeControlKey } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (timeControl: TimeControlKey) => Promise<void>
  loading: boolean
}

export function CreateRoomModal({ open, onClose, onCreate, loading }: Props) {
  const [timeControl, setTimeControl] = useState<TimeControlKey>('blitz')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-chess-border bg-chess-panel p-6 shadow-panel">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-chess-gold">Create multiplayer room</h2>
            <p className="mt-1 text-sm text-chess-muted">
              Choose a time control before sharing the room link.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-chess-border px-3 py-1 text-sm text-chess-muted transition-colors hover:border-chess-gold/30 hover:text-chess-gold"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          {TIME_CONTROL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTimeControl(option.value)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                timeControl === option.value
                  ? 'border-chess-gold/40 bg-chess-gold/10'
                  : 'border-chess-border bg-chess-surface'
              }`}
            >
              <p className="font-display text-lg text-chess-text">{option.label}</p>
              <p className="mt-1 text-xs font-mono uppercase tracking-wide text-chess-muted">
                {option.value}
              </p>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void onCreate(timeControl)}
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-chess-gold px-4 py-3 text-sm font-display tracking-wider text-chess-bg transition-colors hover:bg-chess-gold-dim disabled:opacity-60"
        >
          {loading ? 'Creating room...' : 'Create room'}
        </button>
      </div>
    </div>
  )
}
