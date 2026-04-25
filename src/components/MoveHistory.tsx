import { useEffect, useMemo, useRef } from 'react'
import type { ChessMove, MistakeType, MoveAnalysis } from '@/types'

interface Props {
  moves: ChessMove[]
  analysis: MoveAnalysis[]
  activeIndex?: number
  onSelect?: (index: number) => void
}

const TYPE_STYLES: Record<MistakeType, string> = {
  greedy: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
  minimax: 'text-sky-300 border-sky-400/30 bg-sky-400/10',
  tradeoff: 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-400/10',
  positional: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
}

function getMoveAnalysis(index: number, analysis: MoveAnalysis[]) {
  return analysis.find((item) => item.moveIndex === index) ?? null
}

export function MoveHistory({ moves, analysis, activeIndex, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [moves.length])

  const movePairs = useMemo(() => {
    const pairs: Array<[ChessMove | undefined, ChessMove | undefined]> = []
    for (let index = 0; index < moves.length; index += 2) {
      pairs.push([moves[index], moves[index + 1]])
    }
    return pairs
  }, [moves])

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-display text-sm uppercase tracking-widest text-chess-gold">
          Move History
        </h2>
        <span className="text-xs font-mono text-chess-muted">{moves.length} plies</span>
      </div>

      <div
        ref={scrollRef}
        className="custom-scroll flex-1 space-y-1 overflow-y-auto pr-1"
        style={{ maxHeight: '320px' }}
      >
        {movePairs.length === 0 ? (
          <p className="py-6 text-center text-xs font-mono text-chess-muted">
            No moves yet. Start playing.
          </p>
        ) : null}

        {movePairs.map(([whiteMove, blackMove], pairIndex) => {
          const whiteIndex = pairIndex * 2
          const blackIndex = pairIndex * 2 + 1
          const whiteAnalysis = getMoveAnalysis(whiteIndex, analysis)
          const blackAnalysis = getMoveAnalysis(blackIndex, analysis)

          return (
            <div
              key={pairIndex}
              className="grid grid-cols-[2.2rem_1fr_1fr] items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-chess-border/20"
            >
              <span className="text-right text-xs font-mono text-chess-muted">{pairIndex + 1}.</span>
              <MoveCell
                move={whiteMove}
                analysis={whiteAnalysis}
                isActive={activeIndex === whiteIndex}
                onClick={() => onSelect?.(whiteIndex)}
              />
              <MoveCell
                move={blackMove}
                analysis={blackAnalysis}
                isActive={activeIndex === blackIndex}
                onClick={() => onSelect?.(blackIndex)}
              />
            </div>
          )
        })}
      </div>

      {analysis.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-chess-border pt-3 text-center">
          <StatBadge label="Blunders" value={analysis.filter((item) => item.blunder).length} color="text-chess-blunder" />
          <StatBadge label="Mistakes" value={analysis.filter((item) => item.mistake).length} color="text-amber-300" />
          <StatBadge
            label="Worst"
            value={Math.max(...analysis.map((item) => item.severity), 0)}
            color="text-chess-gold"
          />
        </div>
      ) : null}
    </div>
  )
}

function MoveCell({
  move,
  analysis,
  isActive,
  onClick,
}: {
  move?: ChessMove
  analysis: MoveAnalysis | null
  isActive: boolean
  onClick: () => void
}) {
  if (!move) {
    return <span />
  }

  const typeClass = analysis ? TYPE_STYLES[analysis.type] : 'border-transparent'
  const indicator = analysis ? `${analysis.type} ${analysis.severity}` : 'unscored'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 items-center justify-between gap-2 rounded-md border px-2 py-1 text-left transition-colors ${
        isActive
          ? 'border-chess-gold/50 bg-chess-gold/10 text-chess-gold'
          : `bg-chess-surface text-chess-text ${typeClass}`
      }`}
      title={indicator}
    >
      <span className="truncate font-mono text-sm">{move.san}</span>
      {analysis ? (
        <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
          {analysis.type}
        </span>
      ) : null}
    </button>
  )
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div>
      <p className={`font-mono text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-chess-muted">{label}</p>
    </div>
  )
}
