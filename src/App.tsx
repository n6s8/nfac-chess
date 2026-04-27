import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AuthModal } from '@/components/AuthModal'
import { CreateRoomModal } from '@/components/CreateRoomModal'
import { ProModal } from '@/components/ProModal'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useThemePreferences } from '@/hooks/useThemePreferences'
import { createGameRoom, signOut } from '@/lib/supabase'
import type { TimeControlKey } from '@/types'
import { GamePage } from '@/pages/Game'
import { LeaderboardPage } from '@/pages/Leaderboard'
import { MultiplayerRoomPage } from '@/pages/MultiplayerRoom'
import { ProfilePage } from '@/pages/Profile'
import { ReplayPage } from '@/pages/Replay'
import { FriendsPage } from '@/pages/Friends'
import { ShopPage } from '@/pages/Shop'
import { DailyPuzzlePage } from '@/pages/DailyPuzzle'
import { NotFoundPage } from '@/pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <AlgoChessApp />
    </BrowserRouter>
  )
}

function AlgoChessApp() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, refresh } = useAuthSession()
  const { preferences, updatePreferences } = useThemePreferences()
  const [authOpen, setAuthOpen] = useState(false)
  const [createRoomOpen, setCreateRoomOpen] = useState(false)
  const [proOpen, setProOpen] = useState(false)
  const [creatingRoom, setCreatingRoom] = useState(false)

  // Handle return from Stripe Checkout
  useEffect(() => {
    const proParam = searchParams.get('pro')
    if (proParam === 'success') {
      // Small delay to allow the webhook to hit Supabase
      const timer = setTimeout(async () => {
        await refresh()
        // Optional: second refresh after another 2 seconds just in case
        setTimeout(() => void refresh(), 2000)
      }, 1500)

      setSearchParams({}, { replace: true })
      return () => clearTimeout(timer)
    }
  }, [searchParams, refresh, setSearchParams])

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

  const isPro = user?.is_pro ?? false

  return (
    <div className="min-h-screen bg-chess-bg text-chess-text">
      <header className="sticky top-0 z-30 border-b border-chess-border bg-chess-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-display text-xl text-chess-gold">AlgoChess</p>
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-chess-muted">
                Chess coaching through the lens of computer science
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-1">
              <AppLink to="/">Play</AppLink>
              <AppLink to="/leaderboard">Leaderboard</AppLink>
              <AppLink to="/friends">Friends</AppLink>
              <AppLink to="/shop">Store</AppLink>
              <AppLink to="/puzzle">Daily Puzzle 🔥</AppLink>
              <AppLink to="/profile">Profile</AppLink>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Upgrade to Pro CTA — hidden if already pro */}
            {user && !isPro && (
              <button
                id="upgrade-pro-btn"
                type="button"
                onClick={() => setProOpen(true)}
                className="rounded-lg border border-chess-gold bg-chess-gold/15 px-4 py-2 text-xs font-mono uppercase tracking-wide text-chess-gold transition-all hover:bg-chess-gold hover:text-chess-bg"
              >
                ⚡ Upgrade to Pro
              </button>
            )}

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
              {creatingRoom ? 'Creating...' : 'Create room'}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                {/* Coins indicator — live from DB */}
                <div className="hidden rounded-lg border border-chess-border bg-chess-panel px-3 py-1.5 sm:flex items-center gap-1.5">
                  <span className="font-mono text-xs text-chess-gold font-bold">
                    {user.coins ?? 0}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wide text-chess-muted">coins</span>
                </div>

                {/* Pro badge */}
                {isPro && (
                  <span className="rounded-full border border-chess-gold/40 bg-chess-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-chess-gold">
                    Pro
                  </span>
                )}

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
              onUpgradeRequested={() => setProOpen(true)}
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
              onUpgradeRequested={() => setProOpen(true)}
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
          path="/friends"
          element={<FriendsPage user={user} onAuthRequested={() => setAuthOpen(true)} />}
        />
        <Route
          path="/shop"
          element={
            <ShopPage
              user={user}
              onAuthRequested={() => setAuthOpen(true)}
              onUpgradeRequested={() => setProOpen(true)}
            />
          }
        />
        <Route
          path="/puzzle"
          element={
            <DailyPuzzlePage
              user={user}
              onAuthRequested={() => setAuthOpen(true)}
              onPuzzleSolved={refresh}
            />
          }
        />
        <Route path="/replay/:id" element={<ReplayRoute preferences={preferences} />} />
        <Route path="*" element={<NotFoundPage />} />
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
      <ProModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        user={user}
      />
    </div>
  )
}

function RoomRoute(props: {
  user: Awaited<ReturnType<typeof useAuthSession>>['user']
  preferences: ReturnType<typeof useThemePreferences>['preferences']
  onPreferencesChange: ReturnType<typeof useThemePreferences>['updatePreferences']
  onAuthRequested: () => void
  onUpgradeRequested: () => void
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
