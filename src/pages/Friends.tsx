import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  acceptFriendRequest,
  createGameRoom,
  declineFriendRequest,
  getFriends,
  getPendingRequests,
  searchUsersByUsername,
  sendChallenge,
  sendFriendRequest,
  type FriendshipRecord,
} from '@/lib/supabase'
import type { ProfileRecord } from '@/types'
import type { AuthUser } from '@/types'

interface Props {
  user: AuthUser | null
  onAuthRequested: () => void
}

export function FriendsPage({ user, onAuthRequested }: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends')
  const [friends, setFriends] = useState<FriendshipRecord[]>([])
  const [requests, setRequests] = useState<FriendshipRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileRecord[]>([])
  const [searching, setSearching] = useState(false)
  const [challenging, setChallenging] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    void loadFriends()
    void loadRequests()
  }, [user])

  async function loadFriends() {
    if (!user) return
    try {
      const data = await getFriends(user.id)
      setFriends(data)
    } catch (e) {
      console.error(e)
    }
  }

  async function loadRequests() {
    if (!user) return
    try {
      const data = await getPendingRequests(user.id)
      setRequests(data)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const results = await searchUsersByUsername(searchQuery.trim())
      setSearchResults(results.filter((r) => r.id !== user?.id))
    } catch (e) {
      console.error(e)
    } finally {
      setSearching(false)
    }
  }

  async function handleSendRequest(toUserId: string) {
    if (!user) return
    setActionLoading(toUserId)
    try {
      await sendFriendRequest(user.id, toUserId)
      setSentRequests((prev) => new Set([...prev, toUserId]))
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleAccept(friendship: FriendshipRecord) {
    setActionLoading(friendship.id)
    try {
      await acceptFriendRequest(friendship.id)
      await loadFriends()
      await loadRequests()
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDecline(friendship: FriendshipRecord) {
    setActionLoading(friendship.id)
    try {
      await declineFriendRequest(friendship.id)
      await loadRequests()
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleChallenge(friendId: string) {
    if (!user) return
    setChallenging(friendId)
    try {
      const room = await createGameRoom(user, 'blitz')
      await sendChallenge(user.id, friendId, room.id)
      navigate(`/game/${room.id}`)
    } catch (e) {
      console.error(e)
    } finally {
      setChallenging(null)
    }
  }

  function getFriendProfile(friendship: FriendshipRecord) {
    // Return the other person's id
    return friendship.requester_id === user?.id
      ? { id: friendship.addressee_id }
      : { id: friendship.requester_id }
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="rounded-xl border border-chess-border bg-chess-panel p-8">
          <h1 className="font-display text-2xl text-chess-gold">Sign in to use Friends</h1>
          <p className="mt-3 text-sm text-chess-muted">
            Search for players, send friend requests, and challenge them to a game.
          </p>
          <button
            onClick={onAuthRequested}
            className="mt-6 rounded-lg bg-chess-gold px-6 py-3 text-sm font-display tracking-wider text-chess-bg transition-colors hover:bg-chess-gold-dim"
          >
            Sign in
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-chess-muted">Social</p>
        <h1 className="mt-1 font-display text-2xl text-chess-gold">Friends</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-chess-border bg-chess-surface p-1">
        {(['friends', 'requests', 'search'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-2 text-xs font-mono uppercase tracking-wide transition-colors ${
              tab === t
                ? 'bg-chess-gold/10 text-chess-gold'
                : 'text-chess-muted hover:text-chess-text'
            }`}
          >
            {t === 'requests' && requests.length > 0
              ? `Requests (${requests.length})`
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Friends Tab */}
      {tab === 'friends' && (
        <div className="space-y-3">
          {friends.length === 0 ? (
            <div className="rounded-xl border border-chess-border bg-chess-panel p-8 text-center">
              <p className="text-sm text-chess-muted">
                No friends yet. Use the Search tab to find players.
              </p>
            </div>
          ) : (
            friends.map((f) => {
              const other = getFriendProfile(f)
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-xl border border-chess-border bg-chess-panel p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-chess-gold/30 bg-chess-gold/10 font-display text-base text-chess-gold">
                      {other.id.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-mono text-sm text-chess-text">{other.id.slice(0, 8)}...</p>
                      <p className="text-xs text-chess-muted">Friend</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleChallenge(other.id)}
                    disabled={challenging === other.id}
                    className="rounded-lg border border-chess-gold/30 bg-chess-gold/10 px-4 py-2 text-xs font-mono uppercase tracking-wide text-chess-gold transition-colors hover:bg-chess-gold/20 disabled:opacity-60"
                  >
                    {challenging === other.id ? 'Creating room...' : 'Challenge'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="rounded-xl border border-chess-border bg-chess-panel p-8 text-center">
              <p className="text-sm text-chess-muted">No pending friend requests.</p>
            </div>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-chess-border bg-chess-panel p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-chess-hint/30 bg-chess-hint/10 font-display text-base text-chess-hint">
                    {r.requester_id.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-mono text-sm text-chess-text">{r.requester_id.slice(0, 8)}...</p>
                    <p className="text-xs text-chess-muted">Sent you a friend request</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(r)}
                    disabled={actionLoading === r.id}
                    className="rounded-lg border border-chess-good/30 bg-chess-good/10 px-3 py-2 text-xs font-mono uppercase tracking-wide text-chess-good transition-colors hover:bg-chess-good/20 disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(r)}
                    disabled={actionLoading === r.id}
                    className="rounded-lg border border-chess-border px-3 py-2 text-xs font-mono uppercase tracking-wide text-chess-muted transition-colors hover:border-chess-blunder/30 hover:text-chess-blunder disabled:opacity-60"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Search Tab */}
      {tab === 'search' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by username..."
              className="flex-1 rounded-lg border border-chess-border bg-chess-surface px-4 py-3 font-mono text-sm text-chess-text placeholder:text-chess-muted focus:border-chess-gold/40 focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="rounded-lg border border-chess-gold/30 bg-chess-gold/10 px-4 py-3 text-xs font-mono uppercase tracking-wide text-chess-gold transition-colors hover:bg-chess-gold/20 disabled:opacity-50"
            >
              {searching ? '...' : 'Search'}
            </button>
          </div>

          <div className="space-y-3">
            {searchResults.map((profile) => {
              const alreadySent = sentRequests.has(profile.id)
              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between rounded-xl border border-chess-border bg-chess-panel p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-chess-border bg-chess-surface font-display text-base text-chess-gold">
                      {(profile.username || profile.email || '??').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-mono text-sm text-chess-text">
                        {profile.username || profile.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-chess-muted">Rating {profile.rating}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSendRequest(profile.id)}
                    disabled={alreadySent || actionLoading === profile.id}
                    className={`rounded-lg border px-4 py-2 text-xs font-mono uppercase tracking-wide transition-colors disabled:opacity-60 ${
                      alreadySent
                        ? 'border-chess-good/30 bg-chess-good/10 text-chess-good cursor-default'
                        : 'border-chess-gold/30 bg-chess-gold/10 text-chess-gold hover:bg-chess-gold/20'
                    }`}
                  >
                    {alreadySent ? 'Request sent' : actionLoading === profile.id ? '...' : 'Add friend'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
