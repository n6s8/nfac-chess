import { useMemo, useState } from 'react'
import { COUNTRY_OPTIONS, getCitiesForCountry } from '@/lib/location'
import { signIn, signUp, upsertProfile } from '@/lib/supabase'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AuthModal({ open, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('Kazakhstan')
  const [city, setCity] = useState('Almaty')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const cityOptions = useMemo(() => getCitiesForCountry(country), [country])

  if (!open) return null

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        // Check username is provided
        const trimmedUsername = username.trim()
        if (!trimmedUsername) {
          setError('Username is required.')
          setLoading(false)
          return
        }

        // Check username uniqueness before attempting signup
        const { data: existing } = await import('@/lib/supabase').then(m =>
          m.supabase.from('profiles').select('id').eq('username', trimmedUsername).maybeSingle()
        )
        if (existing) {
          setError('That username is already taken. Choose a different one.')
          setLoading(false)
          return
        }

        const { user, session } = await signUp(identifier, password, country, city)

        if (user) {
          await upsertProfile({
            id: user.id,
            email: user.email ?? identifier,
            username: trimmedUsername,
            country,
            city,
          }).catch((profileError) => {
            console.error('[auth] profile bootstrap error:', profileError)
          })
        }

        if (session) {
          // Email confirmation is OFF — user is logged in immediately
          onSuccess()
          onClose()
        } else {
          // Email confirmation is ON — tell user to check email
          setMessage('Account created. Check your email to confirm and then sign in.')
        }
      } else {
        const { user } = await signIn(identifier, password)
        if (user) {
          onSuccess()
          onClose()
        }
      }
    } catch (submitError) {
      const msg = submitError instanceof Error ? submitError.message : 'Authentication failed'
      // Make Supabase errors more human-readable
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('An account with this email already exists. Sign in instead.')
      } else if (msg.includes('Invalid login credentials')) {
        setError('Incorrect email/username or password.')
      } else if (msg.includes('Password should be at least')) {
        setError('Password must be at least 6 characters.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-chess-border bg-chess-panel p-6 shadow-panel">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-chess-gold">
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="mt-1 text-sm text-chess-muted">
              {mode === 'signin'
                ? 'Sign in with your username or email and password.'
                : 'Create a profile for multiplayer, leaderboard, and history.'}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type={mode === 'signin' ? 'text' : 'email'}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder={mode === 'signin' ? 'Username or email' : 'Email'}
            required
            className="w-full rounded-lg border border-chess-border bg-chess-surface px-4 py-3 font-mono text-sm text-chess-text placeholder:text-chess-muted focus:border-chess-gold/40 focus:outline-none"
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full rounded-lg border border-chess-border bg-chess-surface px-4 py-3 font-mono text-sm text-chess-text placeholder:text-chess-muted focus:border-chess-gold/40 focus:outline-none"
          />

          {mode === 'signup' ? (
            <>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
                required
                className="w-full rounded-lg border border-chess-border bg-chess-surface px-4 py-3 font-mono text-sm text-chess-text placeholder:text-chess-muted focus:border-chess-gold/40 focus:outline-none"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={country}
                  onChange={(event) => {
                    const nextCountry = event.target.value
                    setCountry(nextCountry)
                    const nextCities = getCitiesForCountry(nextCountry)
                    setCity(nextCities[0] ?? '')
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
              </div>
            </>
          ) : null}

          {error ? <p className="text-sm font-mono text-chess-blunder">{error}</p> : null}
          {message ? <p className="text-sm font-mono text-chess-good">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-chess-gold px-4 py-3 text-sm font-display tracking-wider text-chess-bg transition-colors hover:bg-chess-gold-dim disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-chess-muted">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError('')
              setMessage('')
            }}
            className="text-chess-gold transition-colors hover:text-chess-gold-dim"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
