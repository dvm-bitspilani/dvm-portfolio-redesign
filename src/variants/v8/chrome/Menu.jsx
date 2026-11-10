// V8 full-screen menu (direction §6.2). The bar stays where it was (same lockup, the Menu
// button now reads Close); a big list on the left, a small row under it, and on the right the
// well the live hologram materialises in (in place, no flight), turning for the hovered item. No clip-path reveal: the
// overlay is visible by default and only its opacity / the rows are tweened, so a stalled or
// killed tween can never leave it invisible.
import { useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { site, socials } from "../../../immersive/data";
import { isModifiedClick } from "../lib/events";
import { useReducedMotion } from "../lib/hooks";
import { P } from "../lib/paths";
import { socialLabel } from "../lib/socials";
import { useMark } from "./markControl";
import { Lockup, MenuToggle } from "./Navbar";
import nav from "./chrome.module.css";
import s from "./menu.module.css";

const MAIN = [
  { key: "about", label: "About", to: "/about", pose: { yaw: -0.42, pitch: -0.08 } },
  { key: "projects", label: "Projects", to: "/projects", pose: { yaw: 0.62, pitch: -0.18 } },
  { key: "team", label: "Team", to: "/team", pose: { yaw: -0.7, pitch: -0.16 } },
  { key: "alumni", label: "Alumni", to: "/alumni", pose: { yaw: -0.2, pitch: 0.06 } },
  { key: "archive", label: "Archive", to: "/archive", pose: { yaw: -0.95, pitch: -0.2 } },
  { key: "contact", label: "Contact", to: "/contactus", pose: { yaw: 0.18, pitch: 0.12 } },
];
const MINOR = [
  { key: "blog", label: "Blog", to: "/blog", pose: { yaw: 0.36, pitch: -0.02 } },
  { key: "artwork", label: "Artwork", to: "/artwork", pose: { yaw: 0.95, pitch: -0.1 } },
];
const ALL = [...MAIN, ...MINOR];
const REST_POSE = { yaw: 0.08, pitch: -0.12 };

const norm = (pathname) => pathname.replace(/\/$/, "");

/** The section the page belongs to (a project detail belongs to Projects). */
function currentKey(pathname) {
  const p = norm(pathname);
  return ALL.find((it) => p === P(it.to) || p.startsWith(`${P(it.to)}/`))?.key ?? null;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Menu({ closing, onClose, onClosed, returnFocus }) {
  const { pathname } = useLocation();
  const mark = useMark();
  const rootRef = useRef(null);
  const wellRef = useRef(null);
  const listRef = useRef(null);
  const barRef = useRef(null);
  const current = currentKey(pathname);
  const reduced = useReducedMotion();
  const poseKey = useRef(null);
  const enterTl = useRef(null);

  const pose = (it) => {
    if (poseKey.current === it.key) return;
    poseKey.current = it.key;
    mark?.setMenu(it.pose);
  };

  // ---- entrance: the mark materialises in the well; the overlay fades, the rows rise
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const start = ALL.find((it) => it.key === current);
    poseKey.current = start?.key ?? null;
    mark?.openMenu(wellRef.current, start?.pose ?? REST_POSE, barRef.current);
    const rows = root.querySelectorAll("[data-row]");
    const tl = gsap.timeline();
    enterTl.current = tl;
    if (reduced) {
      tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" });
    } else {
      tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.24, ease: "power2.out" }, 0).fromTo(
        rows,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.32, stagger: 0.03, ease: "power3.out" },
        0.06,
      );
    }
    return () => {
      tl.progress(1).kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- exit: rows go, the overlay fades, the mark dematerialises
  useEffect(() => {
    if (!closing) return;
    const root = rootRef.current;
    mark?.closeMenu();
    enterTl.current?.kill();
    if (!root) {
      onClosed();
      return;
    }
    const rows = root.querySelectorAll("[data-row]");
    const tl = gsap.timeline({ onComplete: onClosed });
    if (reduced) tl.to(root, { opacity: 0, duration: 0.12, ease: "none" });
    else tl.to(rows, { autoAlpha: 0, duration: 0.16, ease: "power2.in" }, 0).to(root, { opacity: 0, duration: 0.2, ease: "power2.in" }, 0.04);
    return () => {
      tl.kill();
    };
  }, [closing, mark, onClosed, reduced]);

  // ---- the live mark follows the well while the menu scrolls (phones) or reflows
  useEffect(() => {
    const root = rootRef.current;
    const well = wellRef.current;
    if (!root || !well || !mark) return;
    let raf = 0;
    const follow = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        mark.apply();
      });
    };
    root.addEventListener("scroll", follow, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(follow) : null;
    ro?.observe(well);
    ro?.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("scroll", follow);
      ro?.disconnect();
    };
  }, [mark]);

  // ---- focus, keys, scroll lock
  useEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    if (!root || !list) return;
    const openedAt = window.location.pathname;
    const links = () => [...root.querySelectorAll("[data-item]")];
    const first = links().find((a) => a.hasAttribute("aria-current")) ?? links()[0];
    first?.focus({ preventScroll: true });

    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const all = links();
        const i = all.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        all[(i + (e.key === "ArrowDown" ? 1 : all.length - 1)) % all.length].focus();
        return;
      }
      if (e.key !== "Tab") return;
      const f = [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (!f.length) return;
      const a = f[0];
      const z = f[f.length - 1];
      const inside = root.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === a || !inside)) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && (document.activeElement === z || !inside)) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      // closed without navigating: back to the opener. A navigation hands focus to the new page
      // instead (index.jsx, once it has committed under the panel).
      if (window.location.pathname === openedAt && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // clicking the page you are on just closes the menu (a project's Projects link still goes to
  // the index; a modified click is the browser's)
  const onItemClick = (it) => (e) => {
    if (isModifiedClick(e)) return;
    if (norm(pathname) === P(it.to)) {
      e.preventDefault();
      onClose();
    }
  };

  const item = (it, big) => {
    const isCurrent = it.key === current;
    const isPage = norm(pathname) === P(it.to);
    return (
      <li key={it.key} data-row="">
        <Link
          to={P(it.to)}
          data-item=""
          data-cursor="lock"
          className={`${big ? s.item : s.minorItem} ${isCurrent ? s.current : ""}`}
          aria-current={isPage ? "page" : isCurrent ? "location" : undefined}
          onPointerEnter={() => pose(it)}
          onFocus={() => pose(it)}
          onClick={onItemClick(it)}
        >
          {it.label}
        </Link>
      </li>
    );
  };

  return (
    <div
      ref={rootRef}
      id="v8-menu"
      className={s.menu}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      data-closing={closing ? "" : undefined}
    >
      <div ref={barRef} className={`${nav.nav} ${nav.inMenu}`}>
        <Lockup slot={false} onNavigate={onClose} />
        <MenuToggle open onClick={onClose} />
      </div>

      <div className={s.body}>
        <nav ref={listRef} className={s.list} aria-label="Site">
          <ul className={s.items}>{MAIN.map((it) => item(it, true))}</ul>
          <ul className={s.minor}>{MINOR.map((it) => item(it, false))}</ul>
        </nav>

        <div ref={wellRef} className={s.well} aria-hidden="true" />

        <div className={s.contact} data-row="">
          <a className={s.contactLink} href={`mailto:${site.contact.email}`}>
            {site.contact.email}
          </a>
          <ul className={s.socials}>
            {socials.map((x) => (
              <li key={x.id}>
                <a className={s.contactLink} href={x.url} target="_blank" rel="noreferrer">
                  {socialLabel(x)} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
