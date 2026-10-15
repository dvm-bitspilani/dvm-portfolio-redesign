import type { DesignMeta } from '../designs/registry'

/**
 * The six concepts as planned in research/design-brief.md. Used ONLY as a
 * stand-in for slots whose design folder (and meta.ts) does not exist yet;
 * as soon as a design registers itself, its own meta wins.
 */
export const PLANNED: DesignMeta[] = [
  {
    slug: 'holo',
    order: 1,
    name: 'Holo',
    tagline: 'Signal from the projector',
    medium: 'Three.js hologram shaders',
    accent: '#5ef2ff',
    description: 'The DVM mark projected as a flickering cyan hologram. The cursor is a scanner that resolves it into solid chrome.',
  },
  {
    slug: 'boot',
    order: 2,
    name: 'Boot',
    tagline: 'DVM://BOOT',
    medium: 'ASCII rasteriser + CRT',
    accent: '#7cff6b',
    description: 'A boot log, a logo rendered entirely in ASCII, and a command line that actually works.',
  },
  {
    slug: 'fold',
    order: 3,
    name: 'Fold',
    tagline: 'Folded from one strip',
    medium: 'Paper deformation + physics',
    accent: '#ff6a3d',
    description: 'Black paper with copper edges folds itself into the monogram, then unfolds into a timeline of the work.',
  },
  {
    slug: 'swarm',
    order: 4,
    name: 'Swarm',
    tagline: '200,000 voices',
    medium: 'GPGPU particles',
    accent: '#b18cff',
    description: 'A particle swarm holds the shape of the logo. The cursor tears it apart; scrolling morphs it into new forms.',
  },
  {
    slug: 'mercury',
    order: 5,
    name: 'Mercury',
    tagline: 'Liquid metal',
    medium: 'Raymarched SDF shader',
    accent: '#d9d9d9',
    description: 'The mark as a pool of liquid chrome. Drag a droplet out of it; scroll turns chrome into glass.',
  },
  {
    slug: 'press',
    order: 6,
    name: 'Press',
    tagline: 'The type machine',
    medium: 'Variable type + SVG filters',
    accent: '#ff2e2e',
    description: 'No WebGL. Gigantic type that swells toward the cursor, dithered images and view transitions.',
  },
]
