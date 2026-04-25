import type { TimeControlKey } from '@/types'

export const TIME_CONTROL_OPTIONS: Array<{
  value: TimeControlKey
  label: string
  initialMs: number
  incrementMs: number
}> = [
  { value: 'bullet', label: 'Bullet 1+0', initialMs: 60_000, incrementMs: 0 },
  { value: 'blitz', label: 'Blitz 3+2', initialMs: 180_000, incrementMs: 2_000 },
  { value: 'rapid', label: 'Rapid 10+0', initialMs: 600_000, incrementMs: 0 },
  { value: 'classical', label: 'Classical 15+10', initialMs: 900_000, incrementMs: 10_000 },
]

export function getTimeControlConfig(timeControl: TimeControlKey = 'blitz') {
  return TIME_CONTROL_OPTIONS.find((option) => option.value === timeControl) ?? TIME_CONTROL_OPTIONS[1]
}

export function formatClock(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
