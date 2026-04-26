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
    setStatus('Engine Analyst is reviewing the math...')
    try {
      const graph = createCouncilGraph()
      const initialState: Partial<CouncilState> = { moves, analysis }
      
      // Since Groq is absurdly fast, invoke is sufficient instead of chunk streaming
      const finalState = await graph.invoke(initialState)
      
      setReport(finalState.finalDebrief || 'Council failed to synthesize a report.')
      setStatus('Complete')
      setComplete(true)
    } catch (e: any) {
      console.error(e)
      setStatus(`Error executing LangGraph: ${e.message}`)
    } finally {
      setRunning(false)
    }
  }

  if (complete) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-lg">
        <h3 className="font-display text-xl text-emerald-400 mb-4 flex items-center gap-2">
          <span>👑</span> Master Council Debrief
        </h3>
        <div className="prose prose-sm prose-invert max-w-none text-chess-text space-y-4">
          {report.split('\n').map((paragraph, idx) => (
            <p key={idx} className="leading-relaxed">{paragraph}</p>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-chess-gold/30 bg-chess-gold/5 p-5 shadow-lg flex flex-col items-center justify-center text-center">
      <h3 className="font-display text-xl text-chess-gold mb-2">Engage the Master Council</h3>
      <p className="text-sm text-chess-muted mb-6 max-w-sm">
        Unleash a LangGraph swarm of 5 specialized AI agents to debate your playstyle, cite historical games using RAG, and generate a psychological debrief.
      </p>
      
      {running ? (
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-chess-gold border-t-transparent" />
          <p className="text-xs font-mono text-chess-gold animate-pulse">{status}</p>
        </div>
      ) : (
        <button
          onClick={handleRunCouncil}
          className="rounded-lg bg-chess-gold px-6 py-3 font-mono text-sm font-bold text-chess-bg transition-colors hover:bg-yellow-500 shadow-[0_0_15px_rgba(252,211,77,0.3)]"
        >
          Execute Multi-Agent Debrief
        </button>
      )}
    </div>
  )
}
