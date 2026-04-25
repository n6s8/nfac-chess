import { useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { AuthModal } from '@/components/AuthModal'
import { CreateRoomModal } from '@/components/CreateRoomModal'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useThemePreferences } from '@/hooks/useThemePreferences'
import { createGameRoom, signOut } from '@/lib/supabase'
import type { TimeControlKey } from '@/types'
import { GamePage } from '@/pages/Game'
import { LeaderboardPage } from '@/pages/Leaderboard'
import { MultiplayerRoomPage } from '@/pages/MultiplayerRoom'
import { ProfilePage } from '@/pages/Profile'
import { ReplayPage } from '@/pages/Replay'

export default function App() {
  return (
    <BrowserRouter>
      <AlgoChessApp />
    </BrowserRouter>
  )
}

function AlgoChessApp() {
  const navigate = useNavigate()
  const { user, refresh } = useAuthSession()
  const { preferences, updatePreferences } = useThemePreferences()
  const [authOpen, setAuthOpen] = useState(false)
  const [createRoomOpen, setCreateRoomOpen] = useState(false)
  const [creatingRoom, setCreatingRoom] = useState(false)

  async function handleCreateRoom(timeControl: TimeControlKey = 'blitz') {
    if (!user) {
      setAuthOpen(true)
      return
    }

    setCreatingRoom(true)

    try {
      const room = await createGameRoom(user, timeControl)
      navigate(`/game/${room.id}`)
      setCreateRoomOpen(false)
    } catch (error) {
      console.error('[app] create room error:', error)
    } finally {
      setCreatingRoom(false)
    }
  }

  return (
    <div className="min-h-screen bg-chess-bg text-chess-text">
      <header className="sticky top-0 z-30 border-b border-chess-border bg-chess-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-display text-xl text-chess-gold">AlgoChess</p>
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-chess-muted">
                Algorithmic thinking
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              <AppLink to="/">Play</AppLink>
              <AppLink to="/leaderboard">Leaderboard</AppLink>
              <AppLink to="/profile">Profile</AppLink>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  setAuthOpen(true)
                  return
                }

                setCreateRoomOpen(true)
              }}
              disabled={creatingRoom}
              className="rounded-lg border border-chess-gold/30 bg-chess-gold/10 px-4 py-2 text-xs font-mono uppercase tracking-wide text-chess-gold transition-colors hover:bg-chess-gold/20 disabled:opacity-60"
            >
              {creatingRoom ? 'Creating room...' : 'Create room'}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-chess-gold/30 bg-chess-gold/10 px-3 py-1.5 text-xs font-mono text-chess-text">
                  {user.country || 'No country'} | {user.rating}
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-sm text-chess-text">{user.username || user.email}</p>
                  <p className="text-xs text-chess-muted">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void signOut().then(() => refresh())
                  }}
                  className="rounded-lg border border-chess-border bg-chess-surface px-3 py-2 text-xs font-mono uppercase tracking-wide text-chess-muted transition-colors hover:border-chess-gold/30 hover:text-chess-gold"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="rounded-lg border border-chess-border bg-chess-surface px-4 py-2 text-xs font-mono uppercase tracking-wide text-chess-text transition-colors hover:border-chess-gold/30"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <GamePage
              user={user}
              preferences={preferences}
              onPreferencesChange={updatePreferences}
              onAuthRequested={() => setAuthOpen(true)}
              onCreateRoom={() => setCreateRoomOpen(true)}
              creatingRoom={creatingRoom}
            />
          }
        />
        <Route
          path="/game/:id"
          element={
            <RoomRoute
              user={user}
              preferences={preferences}
              onPreferencesChange={updatePreferences}
              onAuthRequested={() => setAuthOpen(true)}
            />
          }
        />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route
          path="/profile"
          element={
            <ProfilePage
              user={user}
              onAuthRequested={() => setAuthOpen(true)}
              onProfileUpdated={refresh}
            />
          }
        />
        <Route
          path="/replay/:id"
          element={<ReplayRoute preferences={preferences} />}
        />
      </Routes>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          void refresh()
        }}
      />
      <CreateRoomModal
        open={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
        onCreate={handleCreateRoom}
        loading={creatingRoom}
      />
    </div>
  )
}

function RoomRoute(props: {
  user: Awaited<ReturnType<typeof useAuthSession>>['user']
  preferences: ReturnType<typeof useThemePreferences>['preferences']
  onPreferencesChange: ReturnType<typeof useThemePreferences>['updatePreferences']
  onAuthRequested: () => void
}) {
  const { id } = useParams()
  return <MultiplayerRoomPage roomId={id} {...props} />
}

function ReplayRoute(props: {
  preferences: ReturnType<typeof useThemePreferences>['preferences']
}) {
  const { id } = useParams()
  return <ReplayPage gameId={id} {...props} />
}

function AppLink({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-1.5 text-xs font-mono uppercase tracking-wide transition-colors ${
          isActive
            ? 'bg-chess-gold/10 text-chess-gold'
            : 'text-chess-muted hover:text-chess-text'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
