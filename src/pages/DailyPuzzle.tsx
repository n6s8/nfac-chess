import { useState, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import type { AuthUser } from '@/types'
import { supabase } from '@/lib/supabase'

type Puzzle = {
  fen: string
  question: string
  options: { label: string; csMistake: string; isCorrect: boolean }[]
  explanation: string
}

// 7 hardcoded puzzles (one per day of week)
const DAILY_PUZZLES: Puzzle[] = [
  {
    // Sunday
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5',
    question: 'White played Nxe5. What algorithmic failure does this represent?',
    options: [
      { label: 'Greedy Algorithm', csMistake: 'Greedy Algorithm', isCorrect: false },
      { label: 'Minimax Blindness', csMistake: 'Minimax Failure', isCorrect: true },
      { label: 'Pruning Error', csMistake: 'Pruning Error', isCorrect: false },
    ],
    explanation: "White grabbed the central pawn but failed to calculate the opponent's best response (Nxe5), losing a full piece. Classic Minimax Failure — not evaluating the opponent's reply.",
  },
  {
    // Monday
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    question: 'Black played Qxd5. What is the long-term algorithmic cost?',
    options: [
      { label: 'Positional Neglect', csMistake: 'Positional Neglect', isCorrect: false },
      { label: 'Tempo Trade-off', csMistake: 'Trade-off Error', isCorrect: true },
      { label: 'Search Pruning', csMistake: 'Pruning Error', isCorrect: false },
    ],
    explanation: 'Black trades time (tempo) for immediate material recapture. White plays Nc3, developing a piece while forcing the Queen to move again. A classic trade-off miscalculation.',
  },
  {
    // Tuesday
    fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 8 6',
    question: 'White stops calculating after checking 2 moves deep. What error is this?',
    options: [
      { label: 'Pruning Error', csMistake: 'Pruning Error', isCorrect: true },
      { label: 'Minimax Failure', csMistake: 'Minimax', isCorrect: false },
      { label: 'Greedy Algorithm', csMistake: 'Greedy', isCorrect: false },
    ],
    explanation: 'Stopping the search tree too early (Horizon Effect / Premature Pruning) means White might miss a deeper tactical sequence that becomes visible at depth 4+.',
  },
  {
    // Wednesday
    fen: 'rnbqk2r/pppp1ppp/4pn2/8/1b1P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 2 4',
    question: 'Black played Bb4. What is the algorithmic intent?',
    options: [
      { label: 'Material gain', csMistake: 'Greedy', isCorrect: false },
      { label: 'Limiting opponent mobility', csMistake: 'Positional', isCorrect: true },
      { label: 'Forcing a draw', csMistake: 'Minimax', isCorrect: false },
    ],
    explanation: "Pinning the Knight limits White's mobility (Positional constraint). It trades a bishop for long-term structural damage, like adding a constraint to reduce the opponent's state space.",
  },
  {
    // Thursday
    fen: 'rnbqkbnr/pp2pppp/8/2pp4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 3',
    question: 'White plays dxc5. Is this a greedy error?',
    options: [
      { label: 'Yes — prioritizes short-term gain over the center', csMistake: 'Greedy', isCorrect: true },
      { label: 'No — it is the optimal continuation', csMistake: 'Optimal', isCorrect: false },
      { label: 'No — it is a Minimax error', csMistake: 'Minimax', isCorrect: false },
    ],
    explanation: 'Taking the pawn immediately (Greedy) surrenders the center. White prioritizes a short-term +1 material evaluation over long-term central control.',
  },
  {
    // Friday
    fen: 'r1bqk2r/pppp1ppp/2n5/2b1P3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 1 6',
    question: 'White played Nxe4. Why is this a mistake?',
    options: [
      { label: "Fails to consider opponent's reply", csMistake: 'Minimax Failure', isCorrect: true },
      { label: 'It is too slow', csMistake: 'Tempo', isCorrect: false },
      { label: 'It ruins the pawn structure', csMistake: 'Positional', isCorrect: false },
    ],
    explanation: "White calculated the material gain but failed to evaluate Black's forcing response (d5), losing the piece back with a worse position. Minimax Blindness.",
  },
  {
    // Saturday
    fen: 'r1bq1rk1/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQ - 2 6',
    question: "White evaluates Bb5. Why is this structurally optimal?",
    options: [
      { label: 'Forces immediate mate', csMistake: 'Greedy', isCorrect: false },
      { label: "Restricts opponent's state space", csMistake: 'Positional', isCorrect: true },
      { label: 'Prunes the search tree', csMistake: 'Pruning', isCorrect: false },
    ],
    explanation: 'Bb5 creates long-term structural tension, restricting the opponent\'s state space and preparing to compromise their pawn structure. A positional constraint, not a tactic.',
  },
]

export function DailyPuzzlePage({
  user,
  onAuthRequested,
  onPuzzleSolved,
}: {
  user: AuthUser | null
  onAuthRequested: () => void
  onPuzzleSolved: () => void
}) {
  const day = new Date().getDay()
  const puzzle = DAILY_PUZZLES[day]

  const today = new Date().toISOString().split('T')[0]
  const alreadySolvedToday = user?.last_puzzle_date === today

  const [solved, setSolved] = useState(alreadySolvedToday)
  const [streak, setStreak] = useState(user?.daily_puzzle_streak ?? 0)
  const [wrongAnswer, setWrongAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Sync solved/streak when user object updates (e.g. after onPuzzleSolved refresh)
  useEffect(() => {
    if (user?.last_puzzle_date === today) {
      setSolved(true)
      setStreak(user.daily_puzzle_streak ?? 0)
    }
  }, [user, today])

  async function handleOptionClick(option: Puzzle['options'][0]) {
    if (!user) {
      onAuthRequested()
      return
    }
    if (solved || loading) return

    if (!option.isCorrect) {
      setWrongAnswer(option.label)
      setTimeout(() => setWrongAnswer(null), 1500)
      return
    }

    setLoading(true)
    try {
      const newStreak = (user.daily_puzzle_streak ?? 0) + 1

      const { error } = await supabase
        .from('profiles')
        .update({
          daily_puzzle_streak: newStreak,
          last_puzzle_date: today,
        })
        .eq('id', user.id)

      if (error) throw error

      setStreak(newStreak)
      setSolved(true)
      onPuzzleSolved() // triggers refresh() in App.tsx
    } catch (err) {
      console.error('[puzzle] Failed to update streak:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 border-b border-chess-border pb-4">
        <h1 className="font-display text-3xl text-chess-gold">Daily CS Puzzle</h1>
        <p className="mt-1 text-sm text-chess-muted">
          Identify the algorithmic failure behind the move.
        </p>
        {user && (
          <p className="mt-2 font-mono text-xs text-chess-muted">
            🔥 Current streak:{' '}
            <span className="text-chess-gold font-bold">{streak} day{streak !== 1 ? 's' : ''}</span>
          </p>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Board — fixed neutral colors work in both dark & light mode */}
        <div className="flex justify-center">
          <div className="w-full max-w-[380px]">
            <Chessboard
              position={puzzle.fen}
              boardOrientation="white"
              arePiecesDraggable={false}
              customDarkSquareStyle={{ backgroundColor: '#b58863' }}
              customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
            />
          </div>
        </div>

        {/* Question panel */}
        <div className="flex flex-col justify-center">
          <div className="rounded-xl border border-chess-border bg-chess-panel p-6 shadow-panel">
            <h2 className="mb-5 text-base font-medium leading-snug text-chess-text">
              {puzzle.question}
            </h2>

            {solved ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4">
                  <p className="font-bold text-green-400">Correct! ✓</p>
                  <p className="mt-2 text-sm leading-relaxed text-chess-muted">
                    {puzzle.explanation}
                  </p>
                </div>
                <div className="rounded-lg border border-chess-border bg-chess-surface p-4 text-center">
                  <p className="text-xs font-mono uppercase tracking-widest text-chess-muted mb-1">
                    Your current streak
                  </p>
                  <p className="font-display text-4xl text-chess-gold">
                    🔥 {streak}
                  </p>
                  <p className="mt-1 text-xs text-chess-muted">Come back tomorrow for the next puzzle!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {puzzle.options.map((opt, i) => {
                  const isWrong = wrongAnswer === opt.label
                  return (
                    <button
                      key={i}
                      onClick={() => handleOptionClick(opt)}
                      disabled={loading}
                      className={`w-full rounded-lg border p-4 text-left transition-all duration-150 disabled:opacity-50 ${
                        isWrong
                          ? 'border-red-500/60 bg-red-500/10'
                          : 'border-chess-border bg-chess-surface hover:border-chess-gold hover:bg-chess-gold/5'
                      }`}
                    >
                      <span
                        className={`mr-3 font-mono text-[10px] uppercase tracking-widest ${
                          isWrong ? 'text-red-400' : 'text-chess-gold'
                        }`}
                      >
                        [{opt.csMistake}]
                      </span>
                      <span className="text-sm text-chess-text">{opt.label}</span>
                    </button>
                  )
                })}
                {!user && (
                  <p className="text-center text-xs text-chess-muted pt-1">
                    <button onClick={onAuthRequested} className="text-chess-gold hover:underline">
                      Sign in
                    </button>{' '}
                    to save your streak.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
