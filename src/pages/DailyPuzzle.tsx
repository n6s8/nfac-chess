import { useState, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import type { AuthUser } from '@/types'
import { supabase } from '@/lib/supabase'

type Puzzle = {
  fen: string
  question: string
  options: { label: string; csMistake: string; isCorrect: boolean }[]
  explanation: string
}

// 7 hardcoded puzzles (one for each day of the week)
const DAILY_PUZZLES: Puzzle[] = [
  {
    // Sunday
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5', // Italian Game
    question: 'White played Nxe5. What algorithmic failure does this represent?',
    options: [
      { label: 'Greedy Algorithm', csMistake: 'Greedy Algorithm', isCorrect: false },
      { label: 'Minimax Blindness', csMistake: 'Minimax Failure', isCorrect: true }, // Nxe5 gets hit by Nxe5, White lost a piece.
      { label: 'Pruning Error', csMistake: 'Pruning Error', isCorrect: false },
    ],
    explanation: 'White grabbed the central pawn (greedy), but failed to calculate the opponent\'s best response (Nxe5), losing a full piece. This is a classic Minimax failure.',
  },
  {
    // Monday
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', // Scandinavian
    question: 'Black played Qxd5. What is the long-term algorithmic cost?',
    options: [
      { label: 'Positional Neglect', csMistake: 'Positional Neglect', isCorrect: false },
      { label: 'Tempo Trade-off', csMistake: 'Trade-off Error', isCorrect: true },
      { label: 'Search Pruning', csMistake: 'Pruning Error', isCorrect: false },
    ],
    explanation: 'Black trades time (tempo) for immediate material recapture. White will play Nc3, developing a piece while forcing the Queen to move again.',
  },
  {
    // Tuesday
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', // Ruy Lopez early
    question: 'White evaluates Bb5. Why is this structurally optimal?',
    options: [
      { label: 'Forces immediate mate', csMistake: 'Greedy', isCorrect: false },
      { label: 'Restricts opponent\'s state space', csMistake: 'Positional', isCorrect: true },
      { label: 'Prunes the search tree', csMistake: 'Pruning', isCorrect: false },
    ],
    explanation: 'Bb5 creates long-term structural tension (Positional), restricting Black\'s state space and preparing to compromise their pawn structure.',
  },
  {
    // Wednesday
    fen: 'rnbqkbnr/pp2pppp/8/2pp4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 3', // Queen's Gambit
    question: 'White plays dxc5. Is this a greedy error?',
    options: [
      { label: 'Yes, it breaks the center', csMistake: 'Greedy', isCorrect: true },
      { label: 'No, it\'s optimal', csMistake: 'Optimal', isCorrect: false },
      { label: 'Yes, it\'s a minimax error', csMistake: 'Minimax', isCorrect: false },
    ],
    explanation: 'Taking the pawn immediately (Greedy) surrenders the center. White prioritizes a short-term +1 material evaluation over long-term central control.',
  },
  {
    // Thursday
    fen: 'rnbqk2r/pppp1ppp/4pn2/8/1b1P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 2 4', // Nimzo-Indian
    question: 'Black played Bb4. What is the algorithmic intent?',
    options: [
      { label: 'Material gain', csMistake: 'Greedy', isCorrect: false },
      { label: 'Limiting opponent mobility', csMistake: 'Positional', isCorrect: true },
      { label: 'Forcing a draw', csMistake: 'Minimax', isCorrect: false },
    ],
    explanation: 'Pinning the Knight limits White\'s mobility (Positional constraint). It trades a bishop for long-term structural damage (doubled pawns).',
  },
  {
    // Friday
    fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 8 6', // Symmetrical, castled
    question: 'White stops calculating after checking 2 moves deep. What error is this?',
    options: [
      { label: 'Pruning Error', csMistake: 'Pruning Error', isCorrect: true },
      { label: 'Minimax Failure', csMistake: 'Minimax', isCorrect: false },
      { label: 'Greedy Algorithm', csMistake: 'Greedy', isCorrect: false },
    ],
    explanation: 'Stopping the search tree too early (Horizon Effect / Premature Pruning) means White might miss a deeper tactical sequence.',
  },
  {
    // Saturday
    fen: 'r1bqk2r/pppp1ppp/2n5/2b1P3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 1 6', // Trappy line
    question: 'White played Nxe4. Why is this a mistake?',
    options: [
      { label: 'Fails to consider opponent\'s reply', csMistake: 'Minimax Failure', isCorrect: true },
      { label: 'It is too slow', csMistake: 'Tempo', isCorrect: false },
      { label: 'It ruins the pawn structure', csMistake: 'Positional', isCorrect: false },
    ],
    explanation: 'White calculated the material gain but failed to evaluate Black\'s forcing response (d5), losing the piece back with a worse position. (Minimax Blindness).',
  }
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
  const [puzzle, setPuzzle] = useState<Puzzle>(DAILY_PUZZLES[0])
  const [solved, setSolving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    // Select puzzle based on day of week
    const day = new Date().getDay()
    setPuzzle(DAILY_PUZZLES[day])

    // Check if user already solved today
    if (user) {
      const today = new Date().toISOString().split('T')[0]
      if (user.last_puzzle_date === today) {
        setSolving(true)
      }
    }
  }, [user])

  const handleOptionClick = async (option: typeof DAILY_PUZZLES[0]['options'][0]) => {
    if (!user) {
      onAuthRequested()
      return
    }

    if (solved) return

    if (!option.isCorrect) {
      setError('Incorrect algorithmic analysis. Try again.')
      setTimeout(() => setError(null), 2000)
      return
    }

    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase
        .from('profiles')
        .update({
          daily_puzzle_streak: (user.daily_puzzle_streak || 0) + 1,
          last_puzzle_date: today
        })
        .eq('id', user.id)

      if (error) throw error

      setSolving(true)
      onPuzzleSolved()
    } catch (err) {
      console.error('Failed to update streak:', err)
      setError('Failed to record solution.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8 border-b border-chess-border pb-4">
        <h1 className="font-display text-3xl text-chess-gold">Daily CS Puzzle</h1>
        <p className="mt-2 text-sm text-chess-muted">
          Identify the algorithmic failure behind the move.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex justify-center">
          <div className="w-full max-w-[400px]">
            <Chessboard
              position={puzzle.fen}
              boardOrientation="white"
              customDarkSquareStyle={{ backgroundColor: 'var(--color-board-dark)' }}
              customLightSquareStyle={{ backgroundColor: 'var(--color-board-light)' }}
              arePiecesDraggable={false}
            />
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-6">
          <div className="rounded-lg border border-chess-border bg-chess-panel p-6">
            <h2 className="mb-4 text-lg font-medium text-chess-text">{puzzle.question}</h2>

            {solved ? (
              <div className="animate-in fade-in space-y-4">
                <div className="rounded border border-green-500/30 bg-green-500/10 p-4 text-green-400">
                  <p className="font-bold">Correct!</p>
                  <p className="mt-2 text-sm text-chess-muted">{puzzle.explanation}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-chess-muted">Your current streak</p>
                  <p className="font-display text-4xl text-chess-gold">
                    🔥 {(user?.daily_puzzle_streak || 0) + 1}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {error && <p className="text-sm text-red-400">{error}</p>}
                {puzzle.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleOptionClick(opt)}
                    disabled={loading}
                    className="w-full rounded border border-chess-border bg-chess-surface p-4 text-left transition-colors hover:border-chess-gold hover:bg-chess-gold/5 disabled:opacity-50"
                  >
                    <span className="font-mono text-xs uppercase tracking-wider text-chess-gold mr-3">
                      [{opt.csMistake}]
                    </span>
                    <span className="text-sm text-chess-text">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
