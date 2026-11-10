// Monochrome brand glyphs for social links, drawn inline (no icon package): one 24-unit box per
// glyph, painted in currentColor, so a link's colour (muted at rest, teal on hover / focus) is
// the icon's colour. Decorative by design: the link around it carries the accessible name.
// Used by every version of /team (pages/team/) and the legacy pages; the footer / menu can adopt it later.
//
//   <SocialIcon name="github" size={16} />    names: github · linkedin · instagram · twitter (X) ·
//                                              x · dribbble · behance · facebook; anything else renders null.

/** Filled glyphs: one path each (evenodd where a counter is cut out). */
const PATHS = {
  github:
    "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  x: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  // "Bē": the B with its two counters, the e with its counter and open slot, the bar over the e
  behance:
    "M1.5 6h5.6c2.1 0 3.5 1.1 3.5 2.85 0 1.1-.6 1.9-1.55 2.3 1.35.4 2.1 1.4 2.1 2.75C11.15 15.95 9.6 17.2 7.2 17.2H1.5V6zm2.4 2v2.45h2.8c.85 0 1.4-.5 1.4-1.22S7.55 8 6.7 8H3.9zm0 4.3v2.9h3.05c.95 0 1.55-.55 1.55-1.45 0-.9-.6-1.45-1.55-1.45H3.9zM17.6 9.4c-2.55 0-4.3 1.8-4.3 4.3 0 2.6 1.75 4.35 4.4 4.35 1.95 0 3.35-1 3.95-2.75h-2.15c-.3.6-.9 1-1.75 1-1.2 0-2.05-.8-2.15-2h6.25c.1-2.95-1.65-4.9-4.25-4.9zm-1.95 3.4c.2-1 .9-1.6 1.95-1.6s1.75.6 1.85 1.6h-3.8zM15.2 6.6h4.9v1.3h-4.9z",
};
PATHS.twitter = PATHS.x;

/** Outline glyphs: drawn with strokes (the brands' own marks are outlines). */
function Outline({ name }) {
  if (name === "instagram")
    return (
      <>
        <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="5.4" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="4.4" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="17.65" cy="6.35" r="1.35" />
      </>
    );
  if (name === "dribbble")
    return (
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="12" cy="12" r="10.4" strokeWidth="2.2" />
        <path d="M7.1 2.9c4.3 5.2 7.5 11.6 9.3 18.5M2 10.7c5.4.5 11.5-.4 16.9-5.6M4.4 19.3c3.2-4.6 9.2-7.1 18-5.5" strokeWidth="1.8" />
      </g>
    );
  return null;
}

const OUTLINE = new Set(["instagram", "dribbble"]);

/** True when `name` has a glyph here (not exported: this file exports one component, for fast refresh). */
const hasSocialIcon = (name) => Object.hasOwn(PATHS, name) || OUTLINE.has(name);

/**
 * @param {{ name: string, size?: number, className?: string }} props
 */
export default function SocialIcon({ name, size = 16, className }) {
  if (!hasSocialIcon(name)) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {OUTLINE.has(name) ? <Outline name={name} /> : <path d={PATHS[name]} fillRule={name === "behance" ? "evenodd" : undefined} />}
    </svg>
  );
}
