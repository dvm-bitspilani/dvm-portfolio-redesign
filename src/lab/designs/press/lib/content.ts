import type { Member, Project, ProjectKind } from '../../../data'

export const KIND_LABEL: Record<ProjectKind, string> = { website: 'Website', app: 'App', portal: 'Portal', video: 'Film' }
export const plateOf = (p: Project) => p.cover ?? p.mockup ?? p.gallery?.[0] ?? null
export const memberLink = (m: Member) => m.socials.linkedin ?? m.socials.github ?? m.socials.behance ?? m.socials.dribbble ?? m.socials.instagram ?? m.socials.twitter
