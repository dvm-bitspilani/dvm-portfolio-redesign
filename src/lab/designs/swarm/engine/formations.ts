import { createContext, useContext } from 'react'
import type { Director, Spec } from './director'
import {
  DISPLAY_FONT,
  WORDMARK_FONT,
  envelopeShape,
  galaxyShape,
  imageShape,
  logoShape,
  ringShape,
  textShape,
  towerShape,
  type ShapeData,
} from './targets'

export const DirectorContext = createContext<Director | null>(null)

export function useDirector() {
  const d = useContext(DirectorContext)
  if (!d) throw new Error('useDirector outside the swarm root')
  return d
}

type Maker = (n: number) => ShapeData | Promise<ShapeData>

/** Named shape makers. Keys double as cache keys. */
export const shapes = {
  logo: ['logo', logoShape] as const,
  tower: ['tower', towerShape] as const,
  galaxy: ['galaxy', galaxyShape] as const,
  ring: ['ring', ringShape] as const,
  envelope: ['envelope', envelopeShape] as const,
  weAreDvm: [
    'we-are-dvm',
    (n: number) =>
      textShape(
        [
          { text: 'WE ARE', family: DISPLAY_FONT, weight: 700, size: 190, tracking: 14 },
          { text: 'DVM', family: WORDMARK_FONT, weight: 400, size: 470, tracking: 40 },
        ],
        n,
      ),
  ] as const,
  word: (text: string, weight = 800) =>
    [`word:${text}:${weight}`, (n: number) => textShape([{ text, family: DISPLAY_FONT, weight, size: 380, tracking: 6 }], n)] as const,
  lines: (lines: string[]) =>
    [
      `lines:${lines.join('|')}`,
      (n: number) => textShape(lines.map((text) => ({ text, family: DISPLAY_FONT, weight: 700, size: 200, tracking: 2 })), n),
    ] as const,
  image: (url: string) => [`img:${url}`, (n: number) => imageShape(url, n)] as const,
  portrait: (url: string) => [`portrait:${url}`, (n: number) => imageShape(url, n, { portrait: true })] as const,
}

/** Break a title into short lines for a particle wordmark. */
export function titleLines(title: string, max = 11): string[] {
  const words = title.replace(/[’']/g, '’').split(/\s+/)
  const out: string[] = []
  let cur = ''
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > max) {
      out.push(cur)
      cur = w
    } else cur = cur ? cur + ' ' + w : w
  }
  if (cur) out.push(cur)
  return out.slice(0, 3).map((l) => l.toUpperCase())
}

/** Build (or fetch) a target and wrap it into a spec. */
export async function formation(
  d: Director,
  shape: readonly [string, Maker],
  spec: Omit<Spec, 'target'>,
  pin = false,
): Promise<Spec> {
  const target = await d.lib.get(shape[0], shape[1], pin)
  return { ...spec, target }
}

/** Fire-and-forget: show a formation unless cancelled. Returns a cancel fn. */
export function showFormation(
  d: Director,
  shape: readonly [string, Maker],
  spec: Omit<Spec, 'target'>,
  opts: { kick?: number; burst?: number; pin?: boolean } = {},
) {
  let alive = true
  formation(d, shape, spec, opts.pin)
    .then((s) => {
      if (alive) d.show(s, opts)
    })
    .catch((e) => console.warn('[swarm] formation failed', shape[0], e))
  return () => {
    alive = false
  }
}
