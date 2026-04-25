import { useEffect, useMemo, useState } from 'react'
import { listCities, listCountries, listLeaderboard } from '@/lib/supabase'
import type { ProfileRecord } from '@/types'

export function LeaderboardPage() {
  const [country, setCountry] = useState('All')
  const [city, setCity] = useState('All')
  const [countries, setCountries] = useState<string[]>(['All', 'Kazakhstan'])
  const [cities, setCities] = useState<string[]>(['All'])
  const [players, setPlayers] = useState<ProfileRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void listCountries()
      .then(setCountries)
      .catch((error) => {
        console.error('[leaderboard] countries error:', error)
      })
  }, [])

  useEffect(() => {
    void listCities(country)
      .then(setCities)
      .catch((error) => {
        console.error('[leaderboard] cities error:', error)
      })
  }, [country])

  useEffect(() => {
    setLoading(true)
    void listLeaderboard(country, city)
      .then((nextPlayers) => {
        setPlayers(nextPlayers)
      })
      .catch((error) => {
        console.error('[leaderboard] fetch error:', error)
        setPlayers([])
      })
      .finally(() => setLoading(false))
  }, [city, country])

  const kazakhstanLeaders = useMemo(
    () => players.filter((player) => player.country === 'Kazakhstan').slice(0, 5),
    [players]
  )

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <section className="rounded-xl border border-chess-border bg-chess-panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-chess-muted">
              Leaderboard
            </p>
            <h1 className="mt-1 font-display text-2xl text-chess-gold">Top players by rating</h1>
            <p className="mt-2 text-sm text-chess-muted">
              Filter by country, compare records, and spotlight the strongest players from Kazakhstan.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-chess-muted">
              Country
              <select
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value)
                  setCity('All')
                }}
                className="rounded-lg border border-chess-border bg-chess-surface px-4 py-3 font-mono text-sm text-chess-text focus:border-chess-gold/40 focus:outline-none"
              >
                {countries.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-chess-muted">
              City
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="rounded-lg border border-chess-border bg-chess-surface px-4 py-3 font-mono text-sm text-chess-text focus:border-chess-gold/40 focus:outline-none"
              >
                {cities.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-chess-border bg-chess-panel p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-chess-muted">Loading ratings...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-chess-muted">
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2">Country</th>
                    <th className="px-3 py-2">Rating</th>
                    <th className="px-3 py-2">Record</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => (
                    <tr key={player.id} className="rounded-lg bg-chess-surface text-sm">
                      <td className="rounded-l-lg px-3 py-3 font-mono text-chess-gold">
                        #{index + 1}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-display text-base text-chess-text">
                          {player.username || player.email || 'Anonymous'}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-chess-muted">
                        {[player.country, player.city].filter(Boolean).join(', ') || 'Unknown'}
                      </td>
                      <td className="px-3 py-3 font-mono text-chess-text">{player.rating}</td>
                      <td className="rounded-r-lg px-3 py-3 text-chess-muted">
                        {player.games_won}-{player.games_lost}-{player.games_drawn}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-chess-border bg-chess-panel p-5">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-chess-muted">
            Kazakhstan
          </p>
          <h2 className="mt-1 font-display text-xl text-chess-gold">Top players from Kazakhstan</h2>
          <div className="mt-4 space-y-3">
            {kazakhstanLeaders.length > 0 ? (
              kazakhstanLeaders.map((player, index) => (
                <div key={player.id} className="rounded-lg border border-chess-border bg-chess-surface p-3">
                  <p className="text-xs font-mono text-chess-muted">#{index + 1}</p>
                  <p className="mt-1 font-display text-lg text-chess-text">
                    {player.username || player.email || 'Anonymous'}
                  </p>
                  <p className="mt-1 text-sm text-chess-muted">Rating {player.rating}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-chess-muted">
                Once players add Kazakhstan to their profile, they will appear here automatically.
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}
