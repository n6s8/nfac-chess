/**
 * useChessSound — procedural sound effects via Web Audio API.
 * No external audio files needed. Generates tones inline.
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.18,
  delay = 0
) {
  try {
    const ac = getCtx()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = type
    osc.frequency.setValueAtTime(frequency, ac.currentTime + delay)
    gain.gain.setValueAtTime(0, ac.currentTime + delay)
    gain.gain.linearRampToValueAtTime(gainPeak, ac.currentTime + delay + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration)
    osc.start(ac.currentTime + delay)
    osc.stop(ac.currentTime + delay + duration)
  } catch {
    // Audio not available — silently ignore
  }
}

export function soundMove() {
  playTone(520, 0.08, 'triangle', 0.15)
}

export function soundCapture() {
  playTone(280, 0.12, 'sawtooth', 0.22)
  playTone(200, 0.10, 'sine', 0.12, 0.06)
}

export function soundCheck() {
  playTone(880, 0.10, 'sine', 0.20)
  playTone(1100, 0.10, 'sine', 0.18, 0.12)
}

export function soundGameOver(win: boolean) {
  if (win) {
    // Fanfare — ascending notes
    playTone(523, 0.15, 'sine', 0.20, 0.00)
    playTone(659, 0.15, 'sine', 0.20, 0.18)
    playTone(784, 0.25, 'sine', 0.22, 0.36)
  } else {
    // Loss — descending notes
    playTone(440, 0.18, 'sine', 0.18, 0.00)
    playTone(349, 0.18, 'sine', 0.16, 0.20)
    playTone(261, 0.30, 'sine', 0.18, 0.40)
  }
}

export function soundDraw() {
  playTone(440, 0.12, 'triangle', 0.15, 0.00)
  playTone(440, 0.12, 'triangle', 0.15, 0.15)
}
