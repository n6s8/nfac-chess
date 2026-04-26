/**
 * ProModal — AlgoChess Pro upgrade flow.
 *
 * Shows the feature list, then redirects to a real Stripe Checkout session
 * created via our secure Edge Function. The success state is handled on
 * return via the `?pro=success` URL param (polled in useAuthSession refresh).
 */
import { useState } from 'react'
import { createStripeCheckoutSession } from '@/lib/stripe'
import type { AuthUser } from '@/types'

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useProStatus(user: AuthUser | null) {
  return {
    isPro: user?.is_pro ?? false,
  }
}

// ─── Modal ───────────────────────────────────────────────────────────────────

const PRO_FEATURES = [
  ['Master Council Debrief', '5-agent LangGraph pipeline — post-game AI analysis'],
  ['RAG Historian', 'Your moves mapped to historical grandmaster games'],
  ['Psychological Coach', 'Cognitive pattern diagnosis after every session'],
  ['Unlimited AI Debriefs', 'No daily caps — analyze every game you play'],
  ['Carbon Fiber Board Theme', 'Exclusive Pro-only board skin in the Store'],
] as const

export function ProModal({
  open,
  onClose,
  user,
}: {
  open: boolean
  onClose: () => void
  user: AuthUser | null
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    setError(null)
    setLoading(false)
    onClose()
  }

  async function handleCheckout() {
    if (!user) return
    setError(null)
    setLoading(true)
    try {
      const url = await createStripeCheckoutSession(user.id)
      // Redirect to Stripe — user returns to /?pro=success on completion
      window.location.href = url
    } catch (err) {
      console.error('[ProModal] checkout error:', err)
      setError('Payment initialization failed. Please try again.')
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-chess-bg/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-chess-border bg-chess-surface shadow-gold">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-chess-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-chess-gold/30 bg-chess-gold/10 px-2 py-1">
              <span className="font-mono text-xs uppercase tracking-widest text-chess-gold">Pro</span>
            </div>
            <span className="font-display text-base text-chess-text">AlgoChess Pro</span>
          </div>
          <button
            id="pro-modal-close"
            onClick={handleClose}
            className="rounded-md p-1 text-chess-muted transition-colors hover:bg-chess-panel hover:text-chess-text"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Pricing */}
          <div className="mb-5 rounded-xl border border-chess-gold/20 bg-chess-gold/5 p-4">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-2xl text-chess-gold">$4.99</p>
              <p className="font-mono text-xs text-chess-muted">/ month</p>
            </div>
            <p className="mt-1 text-xs text-chess-muted">Cancel anytime. Instant access. Powered by Stripe.</p>
          </div>

          {/* Feature list */}
          <ul className="mb-6 space-y-3">
            {PRO_FEATURES.map(([title, desc]) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-chess-good/40 bg-chess-good/10 text-[10px] text-chess-good">
                  ✓
                </span>
                <div>
                  <p className="text-sm text-chess-text">{title}</p>
                  <p className="text-xs text-chess-muted">{desc}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Error */}
          {error && (
            <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-mono text-red-400">
              {error}
            </p>
          )}

          {/* CTA */}
          {!user ? (
            <p className="text-center text-sm text-chess-muted">Sign in to upgrade.</p>
          ) : (
            <button
              id="pro-checkout-btn"
              onClick={() => void handleCheckout()}
              disabled={loading}
              className="w-full rounded-lg bg-chess-gold py-3 font-mono text-sm font-bold text-chess-bg transition-colors hover:bg-yellow-400 disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-chess-bg border-t-transparent" />
                  Redirecting to Stripe…
                </span>
              ) : (
                'Upgrade to Pro — $4.99 / mo'
              )}
            </button>
          )}

          <div className="mt-3 flex items-center justify-center gap-2 text-chess-muted">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <p className="font-mono text-[10px] uppercase tracking-widest">
              256-bit SSL · Stripe Secure Checkout
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
