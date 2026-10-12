// Every link inside the variant stays under /v/v1.
export const BASE = "/v/v1";

/** "/projects" → "/v/v1/projects", "/" → "/v/v1" */
export const vp = (p = "/") => (p === "/" ? BASE : `${BASE}${p.startsWith("/") ? p : `/${p}`}`);

export const isHomePath = (pathname) => pathname === BASE || pathname === `${BASE}/`;
