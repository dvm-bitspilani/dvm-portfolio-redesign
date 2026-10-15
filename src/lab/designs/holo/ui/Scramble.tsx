import { useEffect, useRef, useState } from 'react'

const GLYPHS = '▚▞▙▟░▒▓/\\<>_-=+*#01XO'

/**
 * Text that decodes from noise when it first scrolls into view.
 * Screen readers get the final text immediately (aria-label); the animated glyphs are aria-hidden.
 */
export function Scramble({
  text,
  as: Tag = 'span',
  className,
  delay = 0,
  speed = 1,
  trigger,
}: {
  text: string
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div'
  className?: string
  delay?: number
  speed?: number
  /** Change this value to replay the decode. */
  trigger?: unknown
}) {
  const ref = useRef<HTMLElement>(null)
  const [out, setOut] = useState(text)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!seen) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOut(text)
      return
    }
    let raf = 0
    const start = performance.now() + delay
    const dur = Math.min(1400, 280 + text.length * 22) / speed
    const tick = (now: number) => {
      const p = Math.max(0, (now - start) / dur)
      let s = ''
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        const reveal = i / text.length
        if (ch === ' ' || p > reveal + 0.15) s += ch
        else if (p > reveal - 0.25) s += GLYPHS[(Math.random() * GLYPHS.length) | 0]
        else s += ' '
      }
      setOut(s)
      if (p < 1.2) raf = requestAnimationFrame(tick)
      else setOut(text)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, text, delay, speed, trigger])

  const T = Tag as 'span'
  return (
    <T ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">{out}</span>
    </T>
  )
}
