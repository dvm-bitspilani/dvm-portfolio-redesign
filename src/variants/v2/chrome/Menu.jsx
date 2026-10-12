// V2 menu: a full-screen "well". The live mercury mark (the same one that sits in the
// navbar) flies into the preview well and changes material/pose for the hovered item;
// the teal texture light follows the hovered row. Esc / Close, focus trap, mobile layout.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { site, socials } from "../../../immersive/data";
import bg3 from "../../../assests/bg_3.png";
import { P } from "../lib/paths";
import { useMark } from "./mark";
import s from "./menu.module.css";

const ITEMS = [
  { key: "home", label: "Home", to: "/", caption: "The mercury mark, the department, and everything below it.", pose: { yaw: 0.08, pitch: -0.12, prog: 0 } },
  { key: "about", label: "About", to: "/about", caption: "Who we are and the five teams that build the fests.", pose: { yaw: -0.42, pitch: -0.08, prog: 0.4 } },
  { key: "projects", label: "Projects", to: "/projects", caption: "Websites, apps and films for BOSM, Oasis and APOGEE.", pose: { yaw: 0.62, pitch: -0.18, prog: 0 } },
  { key: "legacy", label: "Our Legacy", to: "/legacy", caption: "Where our alumni went, and every year we have shipped.", pose: { yaw: -0.2, pitch: 0.06, prog: 2 } },
  { key: "team", label: "Team", to: "/team", caption: "The people in the department, batch by batch.", pose: { yaw: -0.7, pitch: -0.16, prog: 0.25 } },
  { key: "blog", label: "Blogs", to: "/blog", caption: "Write-ups from the team on design, code and hardware.", pose: { yaw: 0.36, pitch: -0.02, prog: 1.55 } },
  { key: "artwork", label: "Artwork", to: "/artwork", caption: "Posters, illustrations and 3D work by our designers.", pose: { yaw: 0.95, pitch: -0.1, prog: 0.55 } },
  { key: "archive", label: "Archive", to: "/archive", caption: "Every project, artwork and member on one infinite wall.", pose: { yaw: -0.95, pitch: -0.2, prog: 1.85 } },
  { key: "contact", label: "Contact", to: "/contactus", caption: "Write to the department. A person answers.", pose: { yaw: 0.18, pitch: 0.12, prog: 0.05 } },
];

function currentKey(pathname) {
  const p = pathname.replace(/\/$/, "");
  const hit = ITEMS.find((it) => it.to !== "/" && (p === P(it.to) || p.startsWith(`${P(it.to)}/`)));
  if (hit) return hit.key;
  return p === P("/") ? "home" : null;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Menu({ closing, onClose, onClosed, returnFocus }) {
  const { pathname } = useLocation();
  const mark = useMark();
  const rootRef = useRef(null);
  const wellRef = useRef(null);
  const lightRef = useRef(null);
  const listRef = useRef(null);
  const capRef = useRef(null);
  const current = currentKey(pathname);
  const startIndex = Math.max(0, ITEMS.findIndex((it) => it.key === current));
  const [active, setActive] = useState(startIndex);
  const reduced = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches).current;

  // light that follows the active row
  const moveLight = useCallback(
    (i, instant) => {
      const row = listRef.current?.children[i];
      const root = rootRef.current;
      const light = lightRef.current;
      if (!row || !root || !light) return;
      const rr = row.getBoundingClientRect();
      const y = rr.top + rr.height / 2;
      gsap.to(light, { "--ly": `${y}px`, duration: instant || reduced ? 0 : 0.9, ease: "power3.out", overwrite: true });
    },
    [reduced],
  );

  const activeRef = useRef(startIndex);
  const activate = useCallback(
    (i) => {
      if (activeRef.current !== i) {
        activeRef.current = i;
        setActive(i);
        mark?.setMenu(ITEMS[i].pose);
        if (!reduced) mark?.drop();
      }
      moveLight(i);
    },
    [mark, moveLight, reduced],
  );

  // ---- entrance
  useLayoutEffect(() => {
    const root = rootRef.current;
    const rows = listRef.current.querySelectorAll("[data-row]");
    const fade = root.querySelectorAll("[data-fade]");
    const btn = document.querySelector("[data-v2-ham]");
    const br = btn?.getBoundingClientRect();
    const ox = br ? br.left + br.width / 2 : window.innerWidth - 40;
    const oy = br ? br.top + br.height / 2 : 40;
    root.style.setProperty("--ox", `${ox}px`);
    root.style.setProperty("--oy", `${oy}px`);
    moveLight(startIndex, true);
    mark?.openMenu(wellRef.current, ITEMS[startIndex].pose);
    if (reduced) return;
    const tl = gsap.timeline();
    tl.fromTo(root, { "--r": "0px" }, { "--r": `${Math.hypot(window.innerWidth, window.innerHeight) * 1.05}px`, duration: 0.75, ease: "expo.inOut" }, 0)
      .from(rows, { yPercent: 115, duration: 0.8, stagger: 0.045, ease: "expo.out" }, 0.28)
      .from(fade, { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.06, ease: "power3.out" }, 0.5)
      .from(root.querySelector("[data-horizon]"), { scaleX: 0, duration: 1, ease: "expo.inOut" }, 0.3);
    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- exit
  useEffect(() => {
    if (!closing) return;
    const root = rootRef.current;
    mark?.closeMenu();
    if (reduced) {
      onClosed();
      return;
    }
    const rows = listRef.current.querySelectorAll("[data-row]");
    const tl = gsap.timeline({ onComplete: onClosed });
    tl.to(rows, { yPercent: -115, duration: 0.35, stagger: 0.02, ease: "power3.in" }, 0)
      .to(root.querySelectorAll("[data-fade]"), { autoAlpha: 0, duration: 0.25 }, 0)
      .to(root, { "--r": "0px", duration: 0.55, ease: "expo.inOut" }, 0.12);
    return () => tl.kill();
  }, [closing, mark, onClosed, reduced]);

  // ---- caption swap
  useEffect(() => {
    const el = capRef.current;
    if (!el || reduced) return;
    gsap.fromTo(el, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out", overwrite: true });
  }, [active, reduced]);

  // ---- keyboard: Esc closes, Tab stays inside, arrows move between items
  useEffect(() => {
    const root = rootRef.current;
    const first = listRef.current.querySelectorAll("a")[startIndex];
    first?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const links = [...listRef.current.querySelectorAll("a")];
        const i = links.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        links[(i + (e.key === "ArrowDown" ? 1 : links.length - 1)) % links.length].focus();
        return;
      }
      if (e.key !== "Tab") return;
      const f = [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || !root.contains(document.activeElement))) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && (document.activeElement === z || !root.contains(document.activeElement))) {
        e.preventDefault();
        a.focus();
      }
    };
    // keep the page underneath still
    const onWheel = (e) => {
      if (root.scrollHeight <= root.clientHeight + 1) e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchmove", onWheel, { passive: false });
    return () => {
      document.removeEventListener("keydown", onKey);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchmove", onWheel);
      returnFocus?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => moveLight(active, true);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, moveLight]);

  const onItemClick = (it) => (e) => {
    if (it.key === current) {
      e.preventDefault();
      if (it.key === "home") window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      onClose();
    }
  };

  const item = ITEMS[active];

  return (
    <div
      ref={rootRef}
      id="v2-menu"
      className={`${s.menu} ${reduced ? s.still : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      data-closing={closing ? "" : undefined}
    >
      <div className={s.bg} aria-hidden="true">
        <div className={s.grid} />
        <div ref={lightRef} className={s.light} style={{ backgroundImage: `url(${bg3})` }} />
      </div>

      <div className={s.top}>
        <span className={s.topLabel} data-fade>
          Department of Visual Media, {site.institution}
        </span>
        <button type="button" className={s.close} onClick={onClose} aria-label="Close menu">
          <span className={s.closeText}>Close</span>
          <span className={s.closeX} aria-hidden="true" />
        </button>
      </div>

      <div className={s.body}>
        <nav className={s.nav} aria-label="Site">
          <ol ref={listRef} className={s.list}>
            {ITEMS.map((it, i) => {
              const isCurrent = it.key === current;
              return (
                <li key={it.key} className={s.li}>
                  <span className={s.rowMask}>
                    <span data-row className={s.rowIn}>
                    <Link
                      to={P(it.to)}
                      className={`${s.item} ${i === active ? s.on : ""} ${isCurrent ? s.current : ""}`}
                      aria-current={isCurrent ? "page" : undefined}
                      onPointerEnter={() => activate(i)}
                      onPointerDown={() => activate(i)}
                      onFocus={() => activate(i)}
                      onClick={onItemClick(it)}
                    >
                      <span className={s.idx} aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className={s.label}>
                        <span className={s.outline}>{it.label}</span>
                        <span className={s.fill} aria-hidden="true">
                          {it.label}
                        </span>
                      </span>
                      {isCurrent && <span className={s.here}>You are here</span>}
                    </Link>
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <aside className={s.preview} aria-hidden="true">
          <div ref={wellRef} className={s.well}>
            <span className={s.glow} />
          </div>
          <span className={s.horizon} data-horizon />
          <div className={s.capWrap} data-fade>
            <span className={s.capIdx}>{String(active + 1).padStart(2, "0")} / {String(ITEMS.length).padStart(2, "0")}</span>
            <p ref={capRef} className={s.caption}>
              {item.caption}
            </p>
          </div>
        </aside>
      </div>

      <div className={s.foot} data-fade>
        <a className={s.mail} href={`mailto:${site.contact.email}`}>
          {site.contact.email}
        </a>
        <ul className={s.socials}>
          {socials.map((x) => (
            <li key={x.id}>
              <a href={x.url} target="_blank" rel="noreferrer">
                {x.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
