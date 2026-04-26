/**
 * Shop page — server-side economy.
 * Coins and owned themes are stored in the Supabase `profiles` table.
 * Purchases use the `purchase_theme` RPC for atomic transactions.
 */
import { useEffect, useState } from 'react'
import { getShopProfile, purchaseTheme } from '@/lib/supabase'
import type { AuthUser, BoardTheme } from '@/types'

interface ShopItem {
  id: BoardTheme | 'neon_hacker' | 'dracula' | 'matrix' | 'carbon_fiber'
  name: string
  description: string
  price: number
  preview: { light: string; dark: string }
  gradient: string
  badge?: string
  proOnly?: boolean
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
    id: 'minimal',
    name: 'Minimal',
    description: 'Greyscale. No distractions. Pure chess.',
    price: 30,
    preview: { light: '#c8c8c8', dark: '#484848' },
    gradient: 'from-slate-400/20 to-slate-700/20',
    badge: '30 coins',
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
    id: 'carbon_fiber',
    name: 'Carbon Fiber',
    description: 'Exclusive Pro-only theme. Deep graphite weave pattern.',
    price: 0,
    preview: { light: '#2c2c2c', dark: '#1a1a1a' },
    gradient: 'from-zinc-600/20 to-zinc-900/20',
    badge: 'Pro Only',
    proOnly: true,
  },
]

interface Props {
  user: AuthUser | null
  onAuthRequested: () => void
  onUpgradeRequested: () => void
}

export function ShopPage({ user, onAuthRequested, onUpgradeRequested }: Props) {
  const [coins, setCoins] = useState(user?.coins ?? 0)
  const [owned, setOwned] = useState<Set<string>>(
    new Set(user?.owned_themes ?? ['classic'])
  )
  const [isPro, setIsPro] = useState(user?.is_pro ?? false)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [justBought, setJustBought] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Sync fresh data from Supabase on mount
  useEffect(() => {
    if (!user) return
    getShopProfile(user.id)
      .then(({ coins: c, owned_themes: t, is_pro: pro }) => {
        setCoins(c)
        setOwned(new Set(t))
        setIsPro(pro)
      })
      .catch((err) => {
        console.error('[shop] load error:', err)
        setLoadError('Failed to load shop data. Using cached values.')
      })
  }, [user])

  async function handlePurchase(item: ShopItem) {
    if (item.price === 0) return
    if (owned.has(item.id)) return
    if (item.proOnly && !isPro) {
      onUpgradeRequested()
      return
    }
    if (coins < item.price) return
    if (!user) {
      onAuthRequested()
      return
    }

    setPurchasing(item.id)
    try {
      const result = await purchaseTheme(user.id, item.id, item.price)
      setCoins(result.coins)
      setOwned(new Set(result.owned_themes))
      setJustBought(item.id)
      setTimeout(() => setJustBought(null), 2000)
    } catch (err) {
      console.error('[shop] purchase error:', err)
    } finally {
      setPurchasing(null)
    }
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
            className="mt-6 rounded-lg bg-chess-gold px-6 py-3 text-sm font-display tracking-wider text-chess-bg transition-colors hover:bg-yellow-400"
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

      {/* Pro upgrade banner */}
      {!isPro && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-chess-gold/30 bg-chess-gold/5 p-4">
          <div>
            <p className="font-display text-sm text-chess-gold">AlgoChess Pro</p>
            <p className="text-xs text-chess-muted mt-0.5">
              Unlock Carbon Fiber theme + unlimited AI debriefs.
            </p>
          </div>
          <button
            id="shop-upgrade-btn"
            onClick={onUpgradeRequested}
            className="rounded-lg bg-chess-gold px-4 py-2 text-xs font-mono font-bold uppercase tracking-wide text-chess-bg transition-colors hover:bg-yellow-400"
          >
            ⚡ Upgrade
          </button>
        </div>
      )}

      {loadError && (
        <p className="mb-4 rounded-lg border border-chess-border bg-chess-panel px-4 py-2 text-xs font-mono text-chess-muted">
          {loadError}
        </p>
      )}

      {/* How to earn */}
      <div className="mb-6 rounded-xl border border-chess-border bg-chess-panel p-4">
        <p className="font-mono text-xs uppercase tracking-widest text-chess-muted mb-2">How to earn coins</p>
        <div className="flex flex-wrap gap-4 text-sm text-chess-text">
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-chess-good" />
            Win multiplayer — <strong className="text-chess-gold ml-1">+10 coins</strong>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-chess-muted" />
            Draw multiplayer — <strong className="text-chess-gold ml-1">+5 coins</strong>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-chess-hint" />
            Win vs AI Master — <strong className="text-chess-gold ml-1">+5 coins</strong>
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
          const isProLocked = item.proOnly && !isPro

          return (
            <div
              key={item.id}
              className={`relative overflow-hidden rounded-xl border bg-chess-panel transition-all ${
                isOwned
                  ? 'border-chess-good/30'
                  : isProLocked
                  ? 'border-chess-gold/20'
                  : 'border-chess-border hover:border-chess-gold/30'
              }`}
            >
              {/* Preview board swatch */}
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
                <span className={`absolute right-3 top-3 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide backdrop-blur-sm ${
                  item.proOnly
                    ? 'border-chess-gold/60 bg-chess-gold/20 text-chess-gold'
                    : 'border-chess-gold/40 bg-chess-bg/80 text-chess-gold'
                }`}>
                  {item.badge}
                </span>
              )}

              {/* Info */}
              <div className="p-4">
                <h3 className="font-display text-base text-chess-gold">{item.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-chess-muted">{item.description}</p>

                <div className="mt-4">
                  {item.price === 0 && !isProLocked ? (
                    isOwned ? (
                      <div className="flex items-center gap-2 rounded-lg border border-chess-good/30 bg-chess-good/10 px-3 py-2 text-xs font-mono uppercase tracking-wide text-chess-good">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Owned
                      </div>
                    ) : (
                      <div className="rounded-lg border border-chess-border px-3 py-2 text-center text-xs font-mono uppercase tracking-wide text-chess-muted">
                        Free — always available
                      </div>
                    )
                  ) : isOwned ? (
                    <div className="flex items-center gap-2 rounded-lg border border-chess-good/30 bg-chess-good/10 px-3 py-2 text-xs font-mono uppercase tracking-wide text-chess-good">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {wasBought ? 'Purchased!' : 'Owned'}
                    </div>
                  ) : isProLocked ? (
                    <button
                      onClick={onUpgradeRequested}
                      className="w-full rounded-lg border border-chess-gold/40 bg-chess-gold/10 px-4 py-2.5 text-xs font-mono uppercase tracking-wide text-chess-gold transition-colors hover:bg-chess-gold/20"
                    >
                      ⚡ Upgrade to Pro
                    </button>
                  ) : (
                    <button
                      onClick={() => void handlePurchase(item)}
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
    </main>
  )
}
