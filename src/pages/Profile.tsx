import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COUNTRY_OPTIONS, getCitiesForCountry } from '@/lib/location'
import { getUserGames, upsertProfile } from '@/lib/supabase'
import type { AuthUser, GameRecord } from '@/types'

interface Props {
  user: AuthUser | null
  onAuthRequested: () => void
  onProfileUpdated: () => Promise<unknown>
}

export function ProfilePage({ user, onAuthRequested, onProfileUpdated }: Props) {
  const [games, setGames] = useState<GameRecord[]>([])
  const [country, setCountry] = useState(user?.country ?? 'Kazakhstan')
  const [city, setCity] = useState(user?.city ?? 'Almaty')
  const [username, setUsername] = useState(user?.username ?? '')
  const [saving, setSaving] = useState(false)
  const cityOptions = getCitiesForCountry(country)

  useEffect(() => {
    setCountry(user?.country ?? 'Kazakhstan')
    setCity(user?.city ?? 'Almaty')
    setUsername(user?.username ?? '')
  }, [user?.city, user?.country, user?.username])

  useEffect(() => {
    if (!user) return

    void getUserGames(user.id)
      .then(setGames)
      .catch((error) => {
        console.error('[profile] games error:', error)
        setGames([])
      })
  }, [user])

  const summary = useMemo(() => {
    if (!user) {
      return {
        total: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      }
    }

    return {
      total: user.games_won + user.games_lost + user.games_drawn,
      wins: user.games_won,
      losses: user.games_lost,
      draws: user.games_drawn,
    }
  }, [user])

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-chess-border bg-chess-panel p-6 text-center">
          <h1 className="font-display text-2xl text-chess-gold">Sign in to unlock your profile</h1>
          <p className="mt-3 text-chess-muted">
            Game history, replay, and country-based leaderboard placement all live here.
          </p>
          <button
            type="button"
            onClick={onAuthRequested}
            className="mt-5 rounded-lg bg-chess-gold px-4 py-3 text-sm font-display tracking-wider text-chess-bg transition-colors hover:bg-chess-gold-dim"
          >
            Open sign in
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-xl border border-chess-border bg-chess-panel p-5">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-chess-muted">Profile</p>
          <h1 className="mt-1 font-display text-2xl text-chess-gold">
            {user.username || user.email}
          </h1>
          <p className="mt-2 text-sm text-chess-muted">{user.email}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatCard label="Rating" value={user.rating} />
            <StatCard label="Games" value={summary.total} />
            <StatCard label="Wins" value={summary.wins} />
            <StatCard label="Draws" value={summary.draws} />
          </div>

          <form
            className="mt-6 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              setSaving(true)
              void upsertProfile({
                id: user.id,
                email: user.email,
                username: username || null,
                country: country || null,
                city: city || null,
              })
                .then(() => onProfileUpdated())
                .finally(() => setSaving(false))
            }}
          >
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              className="w-full rounded-lg border border-chess-border bg-chess-surface px-4 py-3 font-mono text-sm text-chess-text placeholder:text-chess-muted focus:border-chess-gold/40 focus:outline-none"
            />
            <select
              value={country}
              onChange={(event) => {
                const nextCountry = event.target.value
                setCountry(nextCountry)
                setCity(getCitiesForCountry(nextCountry)[0] ?? '')
              }}
              className="w-full rounded-lg border border-chess-border bg-chess-surface px-4 py-3 font-mono text-sm text-chess-text focus:border-chess-gold/40 focus:outline-none"
            >
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="w-full rounded-lg border border-chess-border bg-chess-surface px-4 py-3 font-mono text-sm text-chess-text focus:border-chess-gold/40 focus:outline-none"
            >
              {cityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg border border-chess-gold/30 bg-chess-gold/10 px-4 py-3 text-xs font-mono uppercase tracking-wide text-chess-gold transition-colors hover:bg-chess-gold/20 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-chess-border bg-chess-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-chess-muted">
                Game history
              </p>
              <h2 className="mt-1 font-display text-xl text-chess-gold">Saved games and replays</h2>
            </div>
            <span className="text-xs font-mono text-chess-muted">{games.length} games</span>
          </div>

          <div className="mt-5 space-y-3">
            {games.length > 0 ? (
              games.map((game) => (
                <Link
                  key={game.id}
                  to={`/replay/${game.id}`}
                  className="block rounded-lg border border-chess-border bg-chess-surface p-4 transition-colors hover:border-chess-gold/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-mono text-chess-text">
                        {game.mode === 'multiplayer' ? 'Multiplayer' : 'Single-player'}
                      </p>
                      <p className="mt-1 text-xs text-chess-muted">
                        {game.created_at ? new Date(game.created_at).toLocaleString() : 'Saved game'}
                      </p>
                    </div>
                    <span className="rounded-full border border-chess-border px-3 py-1 text-xs font-mono uppercase tracking-wide text-chess-gold">
                      {game.result ?? 'open'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-chess-muted">
                    {game.pgn || 'Replay the move list and inspect the algorithmic analysis.'}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-chess-muted">
                Finished games are saved here automatically after analysis or multiplayer completion.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-chess-border bg-chess-surface p-3">
      <p className="text-xs font-mono uppercase tracking-wide text-chess-muted">{label}</p>
      <p className="mt-2 font-display text-2xl text-chess-gold">{value}</p>
    </div>
  )
}
