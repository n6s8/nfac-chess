import type { Evaluation } from '@/types'

const WORKER_URL = '/sf-worker.js'
const READY_TIMEOUT_MS = 20_000
const SEARCH_TIMEOUT_MS = 15_000

// Correct depth + skill + Elo mapping per level
export const LEVEL_CONFIG: Record<string, { depth: number; skill: number; elo: number }> = {
  Beginner:     { depth: 3,  skill: 0,  elo: 800  },
  Intermediate: { depth: 8,  skill: 10, elo: 1500 },
  Advanced:     { depth: 15, skill: 18, elo: 2000 },
  Master:       { depth: 20, skill: 20, elo: 3200 },
}

interface PendingRequest {
  resolve: (value: Evaluation) => void
  reject: (error: Error) => void
  timeoutId: number
}

class StockfishEngine {
  private worker: Worker | null = null
  private ready = false
  private readyPromise: Promise<void>
  private resolveReady!: () => void
  private rejectReady!: (error: Error) => void
  private readyTimeoutId: number | null = null
  private pending: PendingRequest | null = null
  private currentEval: Partial<Evaluation> = {}
  private configuredSkill = -1
  private configuredElo = -1
  private stopPromise: Promise<void> | null = null
  private resolveStop: (() => void) | null = null
  private isEvaluating = false

  constructor() {
    this.readyPromise = new Promise((resolve, reject) => {
      this.resolveReady = resolve
      this.rejectReady = reject
    })
    this.init()
  }

  private init() {
    try {
      this.worker = new Worker(WORKER_URL)
      this.worker.onmessage = this.handleMessage.bind(this)
      this.worker.onerror = (event) => {
        const error = new Error(`Stockfish worker error: ${event.message || 'unknown error'}`)
        console.error('[Stockfish] Worker error:', event)
        this.fail(error)
      }
      this.readyTimeoutId = window.setTimeout(() => {
        this.fail(new Error('Stockfish worker did not become ready'))
      }, READY_TIMEOUT_MS)
      this.worker.postMessage('uci')
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error('Failed to initialize Stockfish'))
    }
  }

  private handleMessage(event: MessageEvent<string>) {
    const line = String(event.data ?? '')

    if (line === 'uciok') {
      this.worker?.postMessage('setoption name Hash value 32')
      this.worker?.postMessage('setoption name Threads value 1')
      this.worker?.postMessage('isready')
      return
    }

    if (line === 'readyok') {
      this.ready = true
      if (this.readyTimeoutId !== null) {
        window.clearTimeout(this.readyTimeoutId)
        this.readyTimeoutId = null
      }
      this.resolveReady()
      return
    }

    if (line.startsWith('info') && line.includes('score')) {
      const cpMatch = line.match(/score cp (-?\d+)/)
      const mateMatch = line.match(/score mate (-?\d+)/)
      const pvMatch = line.match(/\bpv\s+(\S+)/)
      if (cpMatch) {
        this.currentEval.score = parseInt(cpMatch[1], 10)
        delete this.currentEval.mate
      } else if (mateMatch) {
        this.currentEval.mate = parseInt(mateMatch[1], 10)
        this.currentEval.score = mateMatch[1].startsWith('-') ? -30000 : 30000
      }
      if (pvMatch) {
        this.currentEval.bestMove = pvMatch[1]
      }
    }

    if (line.startsWith('bestmove')) {
      const bestMove = line.split(' ')[1]
      
      this.currentEval.bestMove = bestMove && bestMove !== '(none)' ? bestMove : ''
      
      if (this.pending && this.currentEval.bestMove !== undefined) {
        window.clearTimeout(this.pending.timeoutId)
        this.pending.resolve({
          score: this.currentEval.score ?? 0,
          mate: this.currentEval.mate,
          bestMove: this.currentEval.bestMove,
        })
        this.pending = null
      }
      
      this.isEvaluating = false
      if (this.resolveStop) {
        this.resolveStop()
        this.resolveStop = null
        this.stopPromise = null
      }
    }
  }

  private fail(error: Error) {
    if (!this.ready) {
      if (this.readyTimeoutId !== null) {
        window.clearTimeout(this.readyTimeoutId)
        this.readyTimeoutId = null
      }
      this.rejectReady(error)
      this.readyPromise = Promise.reject(error)
      this.readyPromise.catch(() => undefined)
    }
    if (this.pending) {
      window.clearTimeout(this.pending.timeoutId)
      this.pending.reject(error)
      this.pending = null
    }
  }

  async waitReady(): Promise<void> {
    await this.readyPromise
  }

  setStrength(skill: number, elo: number) {
    if (this.configuredSkill !== skill) {
      this.configuredSkill = skill
      this.worker?.postMessage(`setoption name Skill Level value ${skill}`)
    }
    if (this.configuredElo !== elo) {
      this.configuredElo = elo
      if (elo < 3200) {
        this.worker?.postMessage('setoption name UCI_LimitStrength value true')
        this.worker?.postMessage(`setoption name UCI_Elo value ${elo}`)
      } else {
        this.worker?.postMessage('setoption name UCI_LimitStrength value false')
      }
    }
  }

  async evaluate(fen: string, depth: number, skill?: number, elo?: number): Promise<Evaluation> {
    await this.waitReady()
    if (!this.worker) throw new Error('Stockfish worker is not available')

    if (this.pending) {
      window.clearTimeout(this.pending.timeoutId)
      this.pending.reject(new Error('Stockfish evaluation was interrupted'))
      this.pending = null
    }

    if (this.isEvaluating) {
      this.worker.postMessage('stop')
      if (!this.stopPromise) {
        this.stopPromise = new Promise((resolve) => {
          this.resolveStop = resolve
        })
      }
      await this.stopPromise
    }

    if (!this.worker) throw new Error('Stockfish worker is not available')

    if (skill !== undefined && elo !== undefined) {
      this.setStrength(skill, elo)
    } else if (skill !== undefined) {
      this.setStrength(skill, this.configuredElo >= 0 ? this.configuredElo : 3200)
    }

    this.currentEval = {}
    this.isEvaluating = true

    return new Promise<Evaluation>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        if (this.pending?.resolve === resolve) {
          this.worker?.postMessage('stop')
        }
      }, SEARCH_TIMEOUT_MS)

      this.pending = { resolve, reject, timeoutId }
      // DO NOT send ucinewgame per-evaluation - it resets hash tables and makes engine play weaker
      this.worker?.postMessage(`position fen ${fen}`)
      this.worker?.postMessage(`go depth ${depth}`)
    })
  }

  newGame() {
    this.worker?.postMessage('stop')
    this.worker?.postMessage('ucinewgame')
    this.configuredSkill = -1
    this.configuredElo = -1
  }

  destroy() {
    if (this.readyTimeoutId !== null) {
      window.clearTimeout(this.readyTimeoutId)
      this.readyTimeoutId = null
    }
    if (this.pending) {
      window.clearTimeout(this.pending.timeoutId)
      this.pending.reject(new Error('Stockfish engine destroyed'))
      this.pending = null
    }
    this.worker?.terminate()
    this.worker = null
    this.ready = false
  }
}

let engineInstance: StockfishEngine | null = null

export function getEngine(): StockfishEngine {
  if (!engineInstance) engineInstance = new StockfishEngine()
  return engineInstance
}

export function destroyEngine() {
  engineInstance?.destroy()
  engineInstance = null
}

export type { StockfishEngine }
