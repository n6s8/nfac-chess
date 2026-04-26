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

export function ProModal({ open, onClose, onUpgrade }: { open: boolean, onClose: () => void, onUpgrade: () => void }) {
  const [loading, setLoading] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-chess-bg/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-chess-gold/30 bg-chess-surface shadow-2xl relative">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-2xl text-chess-gold">AlgoChess Pro</h2>
            <button onClick={onClose} className="rounded-md p-1 text-chess-muted hover:bg-chess-panel hover:text-chess-text">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
               </svg>
            </button>
          </div>
          
          <p className="text-sm text-chess-text mb-6">
            Unlock the ultimate algorithmic chess experience and gain access to our multi-agent Master Council execution.
          </p>

          <ul className="mb-6 space-y-3">
            <li className="flex items-center gap-3 text-sm text-chess-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">✓</span>
              5-Node LangGraph Council Debriefs
            </li>
            <li className="flex items-center gap-3 text-sm text-chess-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">✓</span>
              Historical RAG Search Comparisons
            </li>
            <li className="flex items-center gap-3 text-sm text-chess-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">✓</span>
              Deep Psychological Coach Reports
            </li>
          </ul>

          <button
            onClick={() => {
              setLoading(true)
              setTimeout(() => {
                setLoading(false)
                onUpgrade()
                onClose()
              }, 1200) // mock stripe latency
            }}
            disabled={loading}
            className="w-full rounded-lg bg-chess-gold px-4 py-3 font-mono font-bold text-chess-bg transition-colors hover:bg-yellow-500 disabled:opacity-70"
          >
            {loading ? 'Processing via Stripe...' : 'Upgrade Now - $9.99/mo'}
          </button>
          <p className="mt-3 text-center text-[10px] text-chess-muted uppercase tracking-wider">
            Secure checkout powered by MockStripe
          </p>
        </div>
      </div>
    </div>
  )
}
