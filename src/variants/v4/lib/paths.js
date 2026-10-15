// Every in-variant link goes through P() so the OS never leaks to the original site.
export const BASE = "/v/v4";
export const P = (path = "/") => (path === "/" || path === "" ? BASE : `${BASE}${path.startsWith("/") ? path : `/${path}`}`);
