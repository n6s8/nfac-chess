import { useState } from 'react'
import { AnalysisPanel } from '@/components/AnalysisPanel'
import { ChessBoardPanel } from '@/components/ChessBoard'
import { MoveHistory } from '@/components/MoveHistory'
import { PreferenceToolbar } from '@/components/PreferenceToolbar'
import { ThinkingStylePanel } from '@/components/ThinkingStylePanel'
import { TrainingPlan } from '@/components/TrainingPlan'
import { useGameRoom } from '@/hooks/useGameRoom'
import { formatClock } from '@/lib/time-controls'
import type { AuthUser, ThemePreferences } from '@/types'

interface Props {
  roomId?: string
  user: AuthUser | null
  preferences: ThemePreferences
  onPreferencesChange: (patch: Partial<ThemePreferences>) => void
  onAuthRequested: () => void
  onUpgradeRequested: () => void
}

export function MultiplayerRoomPage({
  roomId,
  user,
  preferences,
  onPreferencesChange,
  onAuthRequested,
  onUpgradeRequested,
}: Props) {
  const {
    room,
    state,
    role,
    loading,
    error,
    clockTimes,
    onPlayerMove,
    runAnalysis,
    resignGame,
    offerDraw,
    acceptDraw,
    declineDraw,
    pendingDrawOffer,
    sendChatMessage,
    shareUrl,
  } = useGameRoom(roomId, user)
  const [copied, setCopied] = useState(false)
  const [chatMessage, setChatMessage] = useState('')

  if (!roomId) {
    return (
      <PageMessage
        title="Missing room id"
        body="The multiplayer route is missing a room identifier."
      />
    )
  }

  if (loading) {
    return <PageMessage title="Loading room" body="Connecting to Supabase Realtime..." />
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-chess-border bg-chess-panel p-6 text-center">
          <h1 className="font-display text-2xl text-chess-gold">Sign in to join this room</h1>
          <p className="mt-3 text-chess-muted">
            Multiplayer rooms use Supabase auth so we can assign white and black correctly and
            save the finished game to history.
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

  if (error || !room) {
    return <PageMessage title="Room unavailable" body={error ?? 'This room could not be loaded.'} />
  }

  const statusText =
    room.status === 'waiting'
      ? 'Waiting for opponent...'
      : room.turn === role
        ? 'Your move'
        : `${room.turn} to move`

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <PreferenceToolbar preferences={preferences} onChange={onPreferencesChange} />

      <div
        className={`grid gap-6 items-start ${preferences.focusMode ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1fr)_400px]'
          }`}
      >
        <section className="sticky top-4 flex min-w-0 flex-col gap-4">
          <div className="rounded-xl border border-chess-border bg-chess-panel p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-chess-muted">
                  Multiplayer room
                </p>
                <h1 className="mt-1 font-display text-xl text-chess-gold">
                  {role ? `You are playing ${role}` : 'Spectating'}
                </h1>
                <p className="mt-2 text-sm text-chess-muted">
                  Share the room link, sync moves in real time, and run full analysis when the game ends.
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 md:max-w-[340px]">
                <div className="rounded-lg border border-chess-border bg-chess-surface px-3 py-2 text-xs font-mono text-chess-text">
                  {shareUrl}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(shareUrl)
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1200)
                  }}
                  className="rounded-lg border border-chess-gold/30 bg-chess-gold/10 px-4 py-2 text-xs font-mono uppercase tracking-wide text-chess-gold transition-colors hover:bg-chess-gold/20"
                >
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ClockCard label={room.white_player_email ?? 'White'} value={clockTimes.white} active={room.turn === 'white' && room.status !== 'finished'} />
            <ClockCard label={room.black_player_email ?? 'Black'} value={clockTimes.black} active={room.turn === 'black' && room.status !== 'finished'} />
          </div>

          {pendingDrawOffer && room.status === 'playing' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-400/40 bg-sky-400/10 p-3">
              <p className="text-sm text-sky-400">
                {pendingDrawOffer === user.id ? 'Waiting for opponent to accept draw...' : 'Opponent offered a draw.'}
              </p>
              {pendingDrawOffer !== user.id && (
                <div className="flex gap-2">
                  <button onClick={() => void acceptDraw()} className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs text-sky-300 transition-colors hover:bg-sky-500/30">Accept</button>
                  <button onClick={() => void declineDraw()} className="rounded-lg border border-sky-500/20 px-3 py-1.5 text-xs text-sky-300 transition-colors hover:bg-sky-500/10">Decline</button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-chess-border bg-chess-panel/60 p-3 sm:p-4">
            <div
              className={`mx-auto flex w-full justify-center overflow-hidden ${preferences.focusMode ? 'w-full max-w-[80vh]' : 'w-full max-w-[65vh]'
                }`}
            >
              <div className="w-full">
                <ChessBoardPanel
                  state={state}
                  onMove={onPlayerMove}
                  inCheck={false}
                  boardTheme={preferences.boardTheme}
                  orientation={role ?? 'white'}
                  statusText={statusText}
                  onResign={role && room.status === 'playing' ? () => void resignGame() : undefined}
                  onOfferDraw={role && room.status === 'playing' && !pendingDrawOffer ? () => void offerDraw() : undefined}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-chess-border bg-chess-panel p-3">
            <span className="rounded-lg border border-chess-border bg-chess-surface px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-chess-muted">
              ⏱ {room.time_control}
            </span>
            <span className={`rounded-lg border px-3 py-1.5 text-xs font-mono uppercase tracking-wide ${room.status === 'playing' ? 'border-chess-good/30 text-chess-good' :
              room.status === 'finished' ? 'border-chess-muted/30 text-chess-muted' :
                'border-chess-gold/30 text-chess-gold'
              }`}>
              {room.status}
            </span>
          </div>

          {state.thinkingStyle && (
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <ThinkingStylePanel profile={state.thinkingStyle} />
              <TrainingPlan profile={state.thinkingStyle} gameId={room.id} />
            </div>
          )}

          {state.analysis.length > 0 && (
            <div className="mt-4 rounded-xl border border-chess-border bg-chess-panel p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-xs uppercase tracking-widest text-chess-gold">
                  Chat
                </h2>
                <span className="text-xs font-mono text-chess-muted">
                  {(room.chat_messages ?? []).length} messages
                </span>
              </div>

              <div className="custom-scroll max-h-32 space-y-2 overflow-y-auto">
                {(room.chat_messages ?? [])
                  .filter((message) => !String(message.message).startsWith('DRAW_'))
                  .map((message) => (
                    <div key={message.id} className="rounded-lg border border-chess-border bg-chess-surface p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-mono text-chess-gold">{message.sender_label}</p>
                        <span className="text-[10px] font-mono text-chess-muted">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-chess-text">{message.message}</p>
                    </div>
                  ))}
              </div>

              <form
                className="mt-3 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  void sendChatMessage(chatMessage).then(() => setChatMessage(''))
                }}
              >
                <input
                  value={chatMessage}
                  onChange={(event) => setChatMessage(event.target.value)}
                  placeholder="Type a message"
                  className="min-w-0 flex-1 rounded-lg border border-chess-border bg-chess-surface px-4 py-3 font-mono text-sm text-chess-text placeholder:text-chess-muted focus:border-chess-gold/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-chess-gold/30 bg-chess-gold/10 px-4 py-3 text-xs font-mono uppercase tracking-wide text-chess-gold transition-colors hover:bg-chess-gold/20"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </section>

        <aside
          className={`flex min-w-0 flex-col gap-4 ${preferences.sidebarCollapsed || preferences.focusMode ? 'lg:hidden' : ''
            }`}
        >
          <div className="grid grid-cols-2 gap-3">
            <PlayerCard
              label={room.white_player_email ?? 'Open seat'}
              subtitle="White"
              isActive={room.turn === 'white' && room.status !== 'finished'}
            />
            <PlayerCard
              label={room.black_player_email ?? 'Invite a player'}
              subtitle="Black"
              isActive={room.turn === 'black' && room.status !== 'finished'}
            />
          </div>

          <div className="rounded-xl border border-chess-border bg-chess-panel p-3 max-h-[40vh] overflow-y-auto custom-scroll">
            <MoveHistory moves={state.moves} analysis={state.analysis} />
          </div>

          <div className="rounded-xl border border-chess-border bg-chess-panel p-4">
            <AnalysisPanel
              state={state}
              onRunAnalysis={runAnalysis}
              isPro={user?.is_pro ?? false}
              onUpgradeRequested={onUpgradeRequested}
              gameId={room.id}
            />
          </div>

          {state.analysis.length === 0 && (
            <div className="rounded-xl border border-chess-border bg-chess-panel p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-xs uppercase tracking-widest text-chess-gold">
                  Chat
                </h2>
                <span className="text-xs font-mono text-chess-muted">
                  {(room.chat_messages ?? []).length} messages
                </span>
              </div>

              <div className="custom-scroll max-h-32 space-y-2 overflow-y-auto">
                {(room.chat_messages ?? [])
                  .filter((message) => !String(message.message).startsWith('DRAW_'))
                  .map((message) => (
                    <div key={message.id} className="rounded-lg border border-chess-border bg-chess-surface p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-mono text-chess-gold">{message.sender_label}</p>
                        <span className="text-[10px] font-mono text-chess-muted">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-chess-text">{message.message}</p>
                    </div>
                  ))}
              </div>

              <form
                className="mt-3 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  void sendChatMessage(chatMessage).then(() => setChatMessage(''))
                }}
              >
                <input
                  value={chatMessage}
                  onChange={(event) => setChatMessage(event.target.value)}
                  placeholder="Type a message"
                  className="min-w-0 flex-1 rounded-lg border border-chess-border bg-chess-surface px-4 py-3 font-mono text-sm text-chess-text placeholder:text-chess-muted focus:border-chess-gold/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-chess-gold/30 bg-chess-gold/10 px-4 py-3 text-xs font-mono uppercase tracking-wide text-chess-gold transition-colors hover:bg-chess-gold/20"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}

function ClockCard({
  label,
  value,
  active,
}: {
  label: string
  value: number
  active: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${active
        ? 'border-chess-gold/40 bg-chess-gold/10'
        : 'border-chess-border bg-chess-panel'
        }`}
    >
      <p className="truncate text-sm text-chess-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-chess-gold">{formatClock(value)}</p>
    </div>
  )
}

function PlayerCard({
  label,
  subtitle,
  isActive,
}: {
  label: string
  subtitle: string
  isActive: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${isActive
        ? 'border-chess-gold/40 bg-chess-gold/10'
        : 'border-chess-border bg-chess-panel'
        }`}
    >
      <p className="truncate font-display text-lg text-chess-text">{label}</p>
      <p className="mt-1 text-sm text-chess-muted">{subtitle}</p>
    </div>
  )
}

function PageMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="rounded-xl border border-chess-border bg-chess-panel p-6">
        <h1 className="font-display text-2xl text-chess-gold">{title}</h1>
        <p className="mt-3 text-chess-muted">{body}</p>
      </div>
    </main>
  )
}
