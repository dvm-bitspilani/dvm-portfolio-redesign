// App icons: dark teal-glass tiles with a line glyph. About carries the DVM mark itself,
// Legacy a folded strip (the origami timeline), projects their cover.
import { FolderOpen, Images, LayoutGrid, Mail, Newspaper, Users } from "lucide-react";
import { LOGO_PATHS } from "../../../immersive/shared/logo";
import s from "./icons.module.css";

export const LOGO_VIEWBOX = "-470.31 -227.2 250.53 326.78";

export function MarkSvg({ className, fill = "currentColor", stroke, strokeWidth = 0, title }) {
  return (
    <svg className={className} viewBox={LOGO_VIEWBOX} aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title && <title>{title}</title>}
      {LOGO_PATHS.map((d) => (
        <path key={d} d={d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function FoldGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M3 7l4.5 3L12 7l4.5 3L21 7v8l-4.5 3-4.5-3-4.5 3L3 15z" />
      <path d="M7.5 10v8M12 7v8M16.5 10v8" opacity=".55" />
    </svg>
  );
}

const GLYPH = {
  projects: <FolderOpen strokeWidth={1.6} />,
  legacy: <FoldGlyph />,
  team: <Users strokeWidth={1.6} />,
  blogs: <Newspaper strokeWidth={1.6} />,
  artwork: <Images strokeWidth={1.6} />,
  archive: <LayoutGrid strokeWidth={1.6} />,
  contact: <Mail strokeWidth={1.6} />,
};

export function AppIcon({ app, size = 52, cover, className = "" }) {
  const style = { width: size, height: size, "--r": `${Math.round(size * 0.27)}px` };
  if (app === "project")
    return (
      <span className={`${s.tile} ${s.cover} ${className}`} style={style} data-app="project" aria-hidden="true">
        {cover ? <img src={cover} alt="" loading="lazy" decoding="async" /> : <FolderOpen strokeWidth={1.6} />}
      </span>
    );
  return (
    <span className={`${s.tile} ${className}`} style={style} data-app={app} aria-hidden="true">
      {app === "about" ? <MarkSvg className={s.mark} fill="url(#v4-mark-grad)" /> : GLYPH[app]}
    </span>
  );
}

/** One shared gradient for the mark glyphs (rendered once by the shell). */
export function IconDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <linearGradient id="v4-mark-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2fbff" />
          <stop offset=".45" stopColor="#9fe9f6" />
          <stop offset="1" stopColor="#2a8ea3" />
        </linearGradient>
      </defs>
    </svg>
  );
}
