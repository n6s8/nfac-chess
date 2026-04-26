import { useState } from 'react'

export function useProStatus() {
  const [isPro, setIsPro] = useState(() => {
    return localStorage.getItem('algochess_pro') === 'true'
  })

  const upgradeToPro = () => {
    localStorage.setItem('algochess_pro', 'true')
    setIsPro(true)
  }

  return { isPro, upgradeToPro }
}

export function ProModal({
  open,
  onClose,
  onUpgrade,
}: {
  open: boolean
  onClose: () => void
  onUpgrade: () => void
}) {
  const [step, setStep] = useState<'plan' | 'checkout' | 'success'>('plan')
  const [loading, setLoading] = useState(false)
  const [card, setCard] = useState('4242 4242 4242 4242')
  const [expiry, setExpiry] = useState('12/26')
  const [cvc, setCvc] = useState('424')

  function handleClose() {
    setStep('plan')
    setLoading(false)
    onClose()
  }

  function handleCheckout() {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setStep('success')
      onUpgrade()
    }, 1800)
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
            onClick={handleClose}
            className="rounded-md p-1 text-chess-muted transition-colors hover:bg-chess-panel hover:text-chess-text"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Plan step */}
        {step === 'plan' && (
          <div className="p-6">
            <div className="mb-5 rounded-xl border border-chess-gold/20 bg-chess-gold/5 p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-display text-xl text-chess-gold">$4.99</p>
                <p className="font-mono text-xs text-chess-muted">/ month</p>
              </div>
              <p className="mt-1 text-xs text-chess-muted">Cancel anytime. Instant access.</p>
            </div>

            <ul className="mb-6 space-y-3">
              {[
                ['Master Council Debrief', '5-agent LangGraph pipeline post-game analysis'],
                ['RAG Historian', 'Your moves mapped to historical grandmaster games'],
                ['Psychological Coach', 'Cognitive pattern diagnosis after every session'],
                ['Priority Groq Access', 'Faster LLM inference, no queue'],
              ].map(([title, desc]) => (
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

            <button
              onClick={() => setStep('checkout')}
              className="w-full rounded-lg bg-chess-gold py-3 font-mono text-sm font-bold text-chess-bg transition-colors hover:bg-yellow-400"
            >
              Continue to Payment
            </button>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-chess-muted">
              Powered by Stripe
            </p>
          </div>
        )}

        {/* Checkout step */}
        {step === 'checkout' && (
          <div className="p-6">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-chess-muted">
              Payment details
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block font-mono text-xs text-chess-muted">Card number</label>
                <input
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                  className="w-full rounded-lg border border-chess-border bg-chess-panel px-4 py-3 font-mono text-sm text-chess-text focus:border-chess-gold/40 focus:outline-none"
                  placeholder="1234 5678 9012 3456"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block font-mono text-xs text-chess-muted">Expiry</label>
                  <input
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full rounded-lg border border-chess-border bg-chess-panel px-4 py-3 font-mono text-sm text-chess-text focus:border-chess-gold/40 focus:outline-none"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-xs text-chess-muted">CVC</label>
                  <input
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    className="w-full rounded-lg border border-chess-border bg-chess-panel px-4 py-3 font-mono text-sm text-chess-text focus:border-chess-gold/40 focus:outline-none"
                    placeholder="123"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-chess-border bg-chess-panel p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-chess-muted">AlgoChess Pro · Monthly</span>
                <span className="font-mono font-bold text-chess-gold">$4.99</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="mt-4 w-full rounded-lg bg-chess-gold py-3 font-mono text-sm font-bold text-chess-bg transition-colors hover:bg-yellow-400 disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-chess-bg border-t-transparent" />
                  Processing...
                </span>
              ) : (
                'Pay $4.99 / month'
              )}
            </button>

            <div className="mt-3 flex items-center justify-center gap-2 text-chess-muted">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <p className="font-mono text-[10px] uppercase tracking-widest">
                256-bit SSL · Stripe Secure Checkout
              </p>
            </div>
          </div>
        )}

        {/* Success step */}
        {step === 'success' && (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-chess-good/40 bg-chess-good/10">
              <svg className="h-8 w-8 text-chess-good" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="font-display text-xl text-chess-gold">You are now Pro</h2>
            <p className="mt-2 text-sm text-chess-muted">
              Master Council Debrief and all Pro features are now unlocked.
            </p>
            <button
              onClick={handleClose}
              className="mt-6 w-full rounded-lg border border-chess-gold/30 bg-chess-gold/10 py-3 font-mono text-sm text-chess-gold transition-colors hover:bg-chess-gold/20"
            >
              Start playing
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
