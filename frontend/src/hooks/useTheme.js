import { useState, useEffect, useCallback } from 'react'

export function useThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('dr-theme')
      return saved ? saved === 'dark' : true
    } catch {
      return true
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    try {
      localStorage.setItem('dr-theme', isDark ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
  }, [isDark])

  const toggle = useCallback(() => setIsDark((v) => !v), [])

  return { isDark, toggle }
}
