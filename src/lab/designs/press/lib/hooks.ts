import { useEffect, useState } from 'react'

export function useReducedMotion() {
  const [r, setR] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setR(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return r
}

export const isReduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
export const isCoarse = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches

export const pad = (n: number, l = 2) => String(n).padStart(l, '0')
export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)

const ROMAN: [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]
export function roman(n: number) {
  let s = ''
  for (const [v, r] of ROMAN)
    while (n >= v) {
      s += r
      n -= v
    }
  return s
}
