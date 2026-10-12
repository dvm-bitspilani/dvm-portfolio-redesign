import type { FoldTimelineTone } from '../types'

export interface ToneSpec {
  id: FoldTimelineTone
  /** clear colour / fog */
  bg: string
  wall: string
  /** wall glow behind the paper (linear rgb, 0..1) */
  halo: [number, number, number]
  /** faint vertical rules on the wall (the redesign's grid), 0 = none */
  grid: number
  /* print sheet */
  paper: string
  paperBack: string
  foil: string
  ink: string
  perf: string
  /** emissive tint for glint + sweep on foil */
  foilGlow: string
  edge: string
  edgeEmissive: string
  /* lights */
  key: string
  rake: string
  rimA: string
  rimB: string
  glint: string
  hemi: string
  sparkle: string
  formers: { warm: string; soft: string; sideA: string; sideB: string }
  /* type on the print */
  yearFont: string
  yearWeight: string
  /** year size as a fraction of the strip height */
  yearSize: number
  smallFont: string
  smallWeight: string
  fontsToLoad: string[]
}

export const SERIF = '"Instrument Serif", "Iowan Old Style", Georgia, serif'

export const TONES: Record<FoldTimelineTone, ToneSpec> = {
  copper: {
    id: 'copper',
    bg: '#050404',
    wall: '#060505',
    halo: [0.95, 0.42, 0.18],
    grid: 0,
    paper: '#1d1b1a',
    paperBack: '#252220',
    foil: '#f4a46c',
    ink: '#9a8a7d',
    perf: '#0c0a09',
    foilGlow: '#ffb27a',
    edge: '#f3a874',
    edgeEmissive: '#c25a22',
    key: '#fff4ea',
    rake: '#fff1e4',
    rimA: '#ff8a4c',
    rimB: '#ff6a3d',
    glint: '#ffc49a',
    hemi: '#f4ece6',
    sparkle: '#ffc4a3',
    formers: { warm: '#fff0e2', soft: '#ffe2c8', sideA: '#ff8a55', sideB: '#ffd2ae' },
    yearFont: SERIF,
    yearWeight: '400',
    yearSize: 0.62,
    smallFont: '"Inter Tight Variable", "Helvetica Neue", Arial, sans-serif',
    smallWeight: '500',
    fontsToLoad: ['400 80px "Instrument Serif"', '500 20px "Inter Tight Variable"'],
  },
  teal: {
    id: 'teal',
    bg: '#050506',
    wall: '#040607',
    halo: [0.16, 0.78, 0.95],
    grid: 1,
    paper: '#12181b',
    paperBack: '#1a2125',
    foil: '#bff6ff',
    ink: '#6f8e98',
    perf: '#06090a',
    foilGlow: '#6feaff',
    edge: '#c9f7ff',
    edgeEmissive: '#1592ad',
    key: '#eef9ff',
    rake: '#e8f7ff',
    rimA: '#45e6ff',
    rimB: '#2a9fd6',
    glint: '#9ff1ff',
    hemi: '#e6f6ff',
    sparkle: '#a8f0ff',
    formers: { warm: '#eefaff', soft: '#d6f3ff', sideA: '#45e6ff', sideB: '#b8ecff' },
    yearFont: '"Stretch Pro", Orbitron, "Arial Black", sans-serif',
    yearWeight: '400',
    yearSize: 0.46,
    smallFont: 'Rajdhani, "Helvetica Neue", Arial, sans-serif',
    smallWeight: '600',
    fontsToLoad: ['400 80px "Stretch Pro"', '600 20px Rajdhani'],
  },
}
