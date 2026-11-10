// V8's visitor-facing knobs, shared by the variant (lib/fonts.js, pages/TeamPage.jsx) and the
// preview app's switcher (src/hub/Switcher.tsx). Deliberately import-free: the hub imports only
// this file, so nothing of V8's own chunk is pulled into the hub bundle.
//
//   team       'wall' (A · every face on one wall, by batch; default) · 'credits' (B · type-led,
//              film credits, the portrait follows the cursor) · 'lineage' (C · a board of the five
//              teams × eight batches) · 'current' (the hairline ledger, kept to compare): which
//              version of /team is shown. ?team=wall|credits|lineage|current wins and is
//              remembered in localStorage["v8:team"]; else the stored one; else 'wall'.
//
// The type system (Hubot), the preloader, the projector and the social links (always brand
// glyphs now) are final and no longer knobs; old `?font=` / `?preloader=` / `?projector=` /
// `?socials=` params and their localStorage keys are simply ignored.

export const V8_TEAMS = ['wall', 'credits', 'lineage', 'current'] as const
export type V8Team = (typeof V8_TEAMS)[number]
export const V8_TEAM_NAMES: Record<V8Team, string> = {
  wall: 'A · Wall',
  credits: 'B · Credits',
  lineage: 'C · Lineage',
  current: 'Current',
}
export const V8_TEAM_TITLES: Record<V8Team, string> = {
  wall: 'Every face on one wall, batch by batch',
  credits: 'Type-led film credits; the portrait follows the cursor',
  lineage: 'The five teams × eight batches on one board',
  current: 'The current ledger (to compare)',
}
export const V8_DEFAULT_TEAM: V8Team = 'wall'

export interface V8Controls {
  team: V8Team
}

const TEAM_KEY = 'v8:team'

const parseTeam = (v: unknown): V8Team | null => {
  const s = String(v ?? '').trim().toLowerCase()
  return (V8_TEAMS as readonly string[]).includes(s) ? (s as V8Team) : null
}

function load(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function save(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // storage blocked: the choice holds for this page load only
  }
}

/** URL first (and remembered), then storage, then the default. */
function read(): V8Controls {
  let q: URLSearchParams | null = null
  try {
    q = new URLSearchParams(window.location.search)
  } catch {
    q = null
  }
  const teamQ = parseTeam(q?.get('team'))
  if (teamQ) save(TEAM_KEY, teamQ)
  return {
    team: teamQ ?? parseTeam(load(TEAM_KEY)) ?? V8_DEFAULT_TEAM,
  }
}

let state: V8Controls | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

/** The current choice (a stable object until something changes; safe for useSyncExternalStore). */
export function getV8Controls(): V8Controls {
  return (state ??= read())
}

export function subscribeV8Controls(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/**
 * Re-read the URL + storage. V8 calls this once as it mounts, so `?team=` on a client-side
 * navigation into /v/v8 applies too. Listeners hear about it a microtask later (never while
 * React is rendering).
 */
export function initV8Controls(): V8Controls {
  const prev = state
  const next = read()
  if (prev && prev.team === next.team) return prev
  state = next
  if (prev) queueMicrotask(emit)
  return next
}

/** Which version of /team is shown (applies at once, remembered). */
export function setV8Team(id: string) {
  const team = parseTeam(id)
  const cur = getV8Controls()
  if (!team || team === cur.team) return
  save(TEAM_KEY, team)
  state = { ...cur, team }
  emit()
}
