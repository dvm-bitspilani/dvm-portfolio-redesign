// The five teams in the one order V8 presents them (the home film strip, /about, /team), and one
// real, distinct still per team (the five frames used to resolve to the same featured project).
// Every path exists under public/assets.
import { artworks, projects, verticals, type Vertical, type VerticalId } from '../../../immersive/data'

export interface TeamStill {
  src: string
  alt: string
}

const projectTitle = (slug: string) => projects.find((p) => p.slug === slug)?.title ?? ''
const art = artworks.find((a) => a.slug === 'college-techfest-web-design')

export const TEAM_STILLS: Record<VerticalId, TeamStill> = {
  frontend: { src: '/assets/projects/apogee-25-website/cover.webp', alt: projectTitle('apogee-25-website') },
  design: {
    src: '/assets/artworks/college-techfest-web-design.jpg',
    alt: art ? `${art.title}, by ${art.artist}` : '',
  },
  backend: { src: '/assets/projects/vaccination-portal-2021/cover.webp', alt: projectTitle('vaccination-portal-2021') },
  app: { src: '/assets/projects/apogee-22-app/cover.webp', alt: projectTitle('apogee-22-app') },
  video: { src: '/assets/projects/apogee-24-curtain-raiser/cover.jpg', alt: projectTitle('apogee-24-curtain-raiser') },
}

/** The order the teams are presented in on the strip and on /about. */
export const TEAM_ORDER: VerticalId[] = ['frontend', 'design', 'backend', 'app', 'video']

/** The five teams' records, in TEAM_ORDER. */
export const TEAMS: Vertical[] = TEAM_ORDER.map((id) => verticals.find((v) => v.id === id)).filter((v): v is Vertical => !!v)
