// A company's disc: its logo, or its monogram when we have no logo file. At rest every disc is
// the room's grey; the one in the light (`lit`, or the button around it hovered / focused) shows
// the company's own colours. Three kinds of logo (legacy/alumni.json, scripts/build-legacy-alumni.mjs):
//   glyph – a one-colour shape, drawn as a mask: grey at rest, the brand colour when lit
//   mark  – a full-colour image on a transparent ground, contained in the disc
//   tile  – a full-colour square icon that fills the disc
// rest="tinted": at rest the logo keeps its colours, dimmed, so it is recognisable at a glance; lit
// it goes full. rest="vivid" (the home constellation): the logo at full colour on a lighter plate
// at rest, so it reads without hovering; a brand colour too dark for that plate is lifted toward
// white (glyphs). Decorative: the button around it carries the company's name.
import styles from "./LegacyCircle.module.css";

/** Words that name the kind of company, not the company: skipped for the monogram's 2nd letter. */
const GENERIC = new Set(["ai", "labs", "lab", "inc", "network", "research", "systems", "technology", "technologies", "mobility", "and", "&"]);

/**
 * The monogram: the first letter of the first word, plus the first letter of the second when the
 * name has two words that both name it ("Goldman Sachs" → GS, "Google" → G, "Dodge AI" → D).
 */
function monogram(name) {
  const words = name
    .replace(/[.\-–·]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0]?.[0] ?? "?";
  const second = words.slice(1).find((w) => !GENERIC.has(w.toLowerCase()));
  return (first + (words.length > 1 && second ? second[0] : "")).toUpperCase();
}

/** A vivid glyph's colour reaches at least this relative luminance (the plate is ~0.02). */
const VIVID_MIN_L = 0.24;

/** sRGB hex → relative luminance. */
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}
/** The brand colour, mixed toward white just enough to read on the vivid plate. */
function vividColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex ?? "")) return hex;
  let t = 0;
  const mix = (f) => {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.round(v + (255 - v) * f);
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, "0")).join("")}`;
  };
  while (t < 0.6 && luminance(mix(t)) < VIVID_MIN_L) t += 0.04;
  return mix(t);
}

/**
 * @param {{ logo?: { src: string, kind: "glyph" | "mark" | "tile", color?: string }, name: string, size?: number, lit?: boolean, rest?: "grey" | "tinted" | "vivid", className?: string }} props
 */
export default function LegacyCircle({ logo, name, size, lit = false, rest = "grey", className = "" }) {
  const style = size ? { "--node": `${size}px` } : undefined;
  const vivid = rest === "vivid";
  let inner;
  if (!logo) {
    inner = <span className={styles.mono}>{monogram(name)}</span>;
  } else if (logo.kind === "glyph") {
    inner = (
      <span
        className={styles.glyph}
        style={{ WebkitMaskImage: `url("${logo.src}")`, maskImage: `url("${logo.src}")`, ...(logo.color ? { "--brand": vivid ? vividColor(logo.color) : logo.color } : null) }}
      />
    );
  } else {
    inner = <img src={logo.src} alt="" className={logo.kind === "tile" ? styles.tile : styles.img} loading="lazy" decoding="async" draggable="false" />;
  }
  return (
    <span className={`${styles.circle} ${lit ? styles.lit : ""} ${className}`} style={style} data-rest={rest === "tinted" || vivid ? rest : undefined} aria-hidden="true">
      {inner}
    </span>
  );
}
