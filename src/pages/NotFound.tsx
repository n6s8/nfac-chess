import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="select-none font-display text-[8rem] leading-none text-chess-gold/20">
        ♛
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-chess-muted">Error 404</p>
        <h1 className="mt-2 font-display text-3xl text-chess-gold">Illegal move.</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-chess-muted">
          The page you're looking for doesn't exist. Like a king moving into check — it's just not
          allowed.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/"
          className="rounded-lg border border-chess-gold/40 bg-chess-gold/10 px-6 py-2.5 font-mono text-sm text-chess-gold transition-colors hover:bg-chess-gold/20"
        >
          ← Back to Play
        </Link>
        <Link
          to="/leaderboard"
          className="rounded-lg border border-chess-border bg-chess-surface px-6 py-2.5 font-mono text-sm text-chess-muted transition-colors hover:border-chess-gold/30 hover:text-chess-text"
        >
          Leaderboard
        </Link>
      </div>

      {/* Decorative mini board */}
      <div className="mt-4 grid grid-cols-8 overflow-hidden rounded-lg border border-chess-border opacity-30" style={{ width: 160, height: 160 }}>
        {Array.from({ length: 64 }).map((_, i) => {
          const row = Math.floor(i / 8)
          const col = i % 8
          const isLight = (row + col) % 2 === 0
          return (
            <div
              key={i}
              style={{
                backgroundColor: isLight ? '#f0d9b5' : '#b58863',
                width: 20,
                height: 20,
              }}
            />
          )
        })}
      </div>
    </main>
  )
}
