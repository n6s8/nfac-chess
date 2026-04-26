import { useState } from 'react'
import { createCouncilGraph, type CouncilState } from '@/lib/agents'
import type { ChessMove } from '@/types'

export function MasterCouncilPanel({ moves, analysis }: { moves: ChessMove[], analysis: any[] }) {
  const [running, setRunning] = useState(false)
  const [complete, setComplete] = useState(false)
  const [status, setStatus] = useState('Idle')
  const [report, setReport] = useState('')

  const handleRunCouncil = async () => {
    setRunning(true)
    setStatus('Engine Analyst reviewing...')
    try {
      const graph = createCouncilGraph()
      const initialState: Partial<CouncilState> = { moves, analysis }
      const finalState = await graph.invoke(initialState)
      setReport(finalState.finalDebrief || 'Council failed to synthesize a report.')
      setStatus('Complete')
      setComplete(true)
    } catch (e: any) {
      console.error(e)
      setStatus(`Error: ${e.message}`)
    } finally {
      setRunning(false)
    }
  }

  if (complete) {
    return (
      <div className="rounded-xl border border-chess-border bg-chess-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base uppercase tracking-widest text-chess-gold">
            Master Council Debrief
          </h3>
          <span className="rounded-full border border-chess-gold/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-chess-gold">
            Complete
          </span>
        </div>
        <div className="space-y-3">
          {report
            .split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map((paragraph, idx) => (
              <p key={idx} className="text-sm leading-relaxed text-chess-text">
                {paragraph}
              </p>
            ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-chess-border bg-chess-surface p-5 text-center">
      <h3 className="font-display text-base uppercase tracking-widest text-chess-gold">
        Master Council
      </h3>
      <p className="mt-2 text-sm text-chess-muted">
        Five specialized AI agents debate your playstyle, cite historical games, and generate a concise debrief.
      </p>

      <div className="mt-5">
        {running ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-chess-gold border-t-transparent" />
            <p className="text-xs font-mono text-chess-muted">{status}</p>
          </div>
        ) : (
          <button
            onClick={handleRunCouncil}
            className="rounded-lg border border-chess-gold/40 bg-chess-gold/10 px-6 py-2.5 font-mono text-sm text-chess-gold transition-colors hover:bg-chess-gold/20"
          >
            Generate Debrief
          </button>
        )}
      </div>
    </div>
  )
}
