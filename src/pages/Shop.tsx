import { useState } from 'react'
import type { AuthUser, BoardTheme } from '@/types'

interface ShopItem {
  id: BoardTheme | 'neon_hacker' | 'dracula' | 'matrix'
  name: string
  description: string
  price: number
  preview: { light: string; dark: string }
  gradient: string
  badge?: string
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'The original wood-tone board. Always free.',
    price: 0,
    preview: { light: '#F0D9B5', dark: '#B58863' },
    gradient: 'from-amber-800/20 to-amber-600/20',
    badge: 'Free',
  },
  {
    id: 'neon_hacker',
    name: 'Neon Hacker',
    description: 'Terminal green on deep black. Built for developers.',
    price: 50,
    preview: { light: '#1a2e1a', dark: '#0d1a0d' },
    gradient: 'from-green-500/20 to-emerald-900/20',
    badge: '50 coins',
  },
  {
    id: 'dracula',
    name: 'Dracula Dark',
    description: 'Purple and midnight tones. High contrast for long sessions.',
    price: 75,
    preview: { light: '#44475a', dark: '#282a36' },
    gradient: 'from-purple-600/20 to-slate-900/20',
    badge: '75 coins',
  },
  {
    id: 'matrix',
    name: 'Matrix Rain',
    description: 'Cyan binary-rain aesthetic. Stand out on every board.',
    price: 100,
    preview: { light: '#003333', dark: '#001a1a' },
    gradient: 'from-cyan-500/20 to-teal-900/20',
    badge: '100 coins',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Greyscale. No distractions. Pure chess.',
    price: 30,
    preview: { light: '#c8c8c8', dark: '#484848' },
    gradient: 'from-slate-400/20 to-slate-700/20',
    badge: '30 coins',
  },
]

// Persist owned themes in localStorage (mock — would be DB in production)
function getOwnedThemes(): Set<string> {
  try {
    const raw = localStorage.getItem('algochess_owned_themes')
    return new Set(raw ? JSON.parse(raw) : ['classic'])
  } catch {
    return new Set(['classic'])
  }
}

function saveOwnedThemes(themes: Set<string>) {
  localStorage.setItem('algochess_owned_themes', JSON.stringify([...themes]))
}

function getCoins(): number {
  return parseInt(localStorage.getItem('algochess_coins') ?? '0', 10)
}

function setCoins(n: number) {
  localStorage.setItem('algochess_coins', String(n))
}

interface Props {
  user: AuthUser | null
  onAuthRequested: () => void
}

export function ShopPage({ user, onAuthRequested }: Props) {
  const [owned, setOwned] = useState<Set<string>>(getOwnedThemes)
  const [coins, setCoinState] = useState(getCoins)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [justBought, setJustBought] = useState<string | null>(null)

  function handlePurchase(item: ShopItem) {
    if (item.price === 0) return
    if (owned.has(item.id)) return
    if (coins < item.price) return
    if (!user) {
      onAuthRequested()
      return
    }

    setPurchasing(item.id)
    setTimeout(() => {
      const newCoins = coins - item.price
      const newOwned = new Set([...owned, item.id])
      setCoins(newCoins)
      saveOwnedThemes(newOwned)
      setCoinState(newCoins)
      setOwned(newOwned)
      setJustBought(item.id)
      setPurchasing(null)
      setTimeout(() => setJustBought(null), 2000)
    }, 800)
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-center">
        <div className="rounded-xl border border-chess-border bg-chess-panel p-8">
          <h1 className="font-display text-2xl text-chess-gold">AlgoChess Store</h1>
          <p className="mt-3 text-sm text-chess-muted">
            Sign in to access the store and spend your AlgoCoins on board themes.
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
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-chess-muted">AlgoChess</p>
          <h1 className="mt-1 font-display text-2xl text-chess-gold">Store</h1>
          <p className="mt-1 text-sm text-chess-muted">
            Earn coins by winning games. Spend them on board themes.
          </p>
        </div>
        <div className="rounded-xl border border-chess-gold/30 bg-chess-gold/10 px-5 py-3 text-center">
          <p className="font-mono text-2xl font-bold text-chess-gold">{coins}</p>
          <p className="text-[10px] font-mono uppercase tracking-widest text-chess-muted">AlgoCoins</p>
        </div>
      </div>

      {/* How to earn */}
      <div className="mb-6 rounded-xl border border-chess-border bg-chess-panel p-4">
        <p className="font-mono text-xs uppercase tracking-widest text-chess-muted mb-2">How to earn coins</p>
        <div className="flex flex-wrap gap-4 text-sm text-chess-text">
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-chess-good" />
            Win a multiplayer game — <strong className="text-chess-gold ml-1">+10 coins</strong>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-chess-muted" />
            Draw a multiplayer game — <strong className="text-chess-gold ml-1">+5 coins</strong>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-chess-hint" />
            Win vs AI on Master level — <strong className="text-chess-gold ml-1">+5 coins</strong>
          </span>
        </div>
      </div>

      {/* Items grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHOP_ITEMS.map((item) => {
          const isOwned = owned.has(item.id)
          const canAfford = coins >= item.price
          const isBuying = purchasing === item.id
          const wasBought = justBought === item.id

          return (
            <div
              key={item.id}
              className={`relative overflow-hidden rounded-xl border bg-chess-panel transition-all ${
                isOwned
                  ? 'border-chess-good/30'
                  : 'border-chess-border hover:border-chess-gold/30'
              }`}
            >
              {/* Preview */}
              <div className={`h-28 bg-gradient-to-br ${item.gradient} p-4 flex items-center justify-center gap-1`}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div
                        key={j}
                        className="h-5 w-5 rounded-sm"
                        style={{
                          backgroundColor: (i + j) % 2 === 0 ? item.preview.light : item.preview.dark,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Badge */}
              {item.badge && (
                <span className="absolute right-3 top-3 rounded-full border border-chess-gold/40 bg-chess-bg/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-chess-gold backdrop-blur-sm">
                  {item.badge}
                </span>
              )}

              {/* Info */}
              <div className="p-4">
                <h3 className="font-display text-base text-chess-gold">{item.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-chess-muted">{item.description}</p>

                <div className="mt-4">
                  {item.price === 0 || isOwned ? (
                    <div className="flex items-center gap-2 rounded-lg border border-chess-good/30 bg-chess-good/10 px-3 py-2 text-xs font-mono uppercase tracking-wide text-chess-good">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {wasBought ? 'Purchased!' : 'Owned'}
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={!canAfford || isBuying}
                      className={`w-full rounded-lg border px-4 py-2.5 text-xs font-mono uppercase tracking-wide transition-colors disabled:cursor-not-allowed ${
                        canAfford
                          ? 'border-chess-gold/30 bg-chess-gold/10 text-chess-gold hover:bg-chess-gold/20'
                          : 'border-chess-border text-chess-muted opacity-50'
                      }`}
                    >
                      {isBuying
                        ? 'Purchasing...'
                        : canAfford
                        ? `Buy for ${item.price} coins`
                        : `Need ${item.price - coins} more coins`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Demo coins button for judges */}
      <div className="mt-8 rounded-xl border border-chess-border bg-chess-panel p-4 text-center">
        <p className="text-xs text-chess-muted font-mono mb-3">
          Demo: Add coins to test the shop
        </p>
        <button
          onClick={() => {
            const newCoins = coins + 100
            setCoins(newCoins)
            setCoinState(newCoins)
          }}
          className="rounded-lg border border-chess-border px-4 py-2 text-xs font-mono uppercase tracking-wide text-chess-muted transition-colors hover:border-chess-gold/30 hover:text-chess-gold"
        >
          + 100 Demo Coins
        </button>
      </div>
    </main>
  )
}
