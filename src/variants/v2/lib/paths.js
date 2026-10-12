// Every in-variant link goes through P() so the variant never leaks to the original site.
export const BASE = "/v/v2";
export const P = (path = "/") => (path === "/" || path === "" ? BASE : `${BASE}${path.startsWith("/") ? path : `/${path}`}`);
