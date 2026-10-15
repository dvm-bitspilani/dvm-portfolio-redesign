import { useEffect, useState } from 'react'

function useMedia(query: string, initial = false) {
  const [match, setMatch] = useState(() => (typeof window === 'undefined' ? initial : window.matchMedia(query).matches))
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

export const usePrefersReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')
export const useCoarsePointer = () => useMedia('(hover: none), (pointer: coarse)')
