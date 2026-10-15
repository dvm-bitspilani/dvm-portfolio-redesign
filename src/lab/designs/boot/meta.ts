import type { DesignMeta } from '../registry'

export default {
  slug: 'boot',
  order: 2,
  name: 'DVM://BOOT',
  tagline: 'A phosphor terminal that prints the logo in shape-aware ASCII.',
  medium: 'Software-rasterised 3D → shape-matched ASCII grid + WebGL CRT (persistence, bloom, barrel)',
  accent: '#7CFF6B',
  description:
    'The site is a working terminal. A BIOS POST boots from real DVM data, then the extruded DVM mark is rasterised in software and printed glyph by glyph, each cell searching 95 characters for the closest shape. Drag to spin it, type commands (help, ls projects, open, team, xo, lumos…), and every page is a TUI app: a file browser, a live top, a man-page pager and a mail composer, all under a curved, glowing CRT.',
} satisfies DesignMeta
