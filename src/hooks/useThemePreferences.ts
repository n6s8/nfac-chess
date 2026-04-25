import { useEffect, useMemo, useState } from 'react'
import type { ThemePreferences } from '@/types'

const STORAGE_KEY = 'algochess.preferences'

const DEFAULT_PREFERENCES: ThemePreferences = {
  boardTheme: 'classic',
  colorMode: 'dark',
  algorithmicMode: true,
  sidebarCollapsed: false,
  focusMode: false,
  engineLevel: 'Intermediate',
}

function readStoredPreferences(): ThemePreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULT_PREFERENCES
    }

    return {
      ...DEFAULT_PREFERENCES,
      ...(JSON.parse(raw) as Partial<ThemePreferences>),
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function useThemePreferences() {
  const [preferences, setPreferences] = useState<ThemePreferences>(() => readStoredPreferences())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    document.documentElement.dataset.colorMode = preferences.colorMode
    document.documentElement.dataset.boardTheme = preferences.boardTheme
  }, [preferences])

  const api = useMemo(
    () => ({
      preferences,
      updatePreferences: (patch: Partial<ThemePreferences>) => {
        setPreferences((current) => ({ ...current, ...patch }))
      },
      resetPreferences: () => {
        setPreferences(DEFAULT_PREFERENCES)
      },
    }),
    [preferences]
  )

  return api
}
