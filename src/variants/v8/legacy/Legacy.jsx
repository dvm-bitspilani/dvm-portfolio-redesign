// Legacy (shown as "Alumni"): where DVM alumni went next — the original constellation (V1/V2,
// round 10), with real data. Company logo circles placed in a box and joined by dotted lines
// (masked so no line crosses a circle); the smaller, softer one-alum companies sit as the back
// layer on fainter lines, for depth. Every logo shows in its own colours at rest, on a lighter
// plate, with the company's name beside it (under it where the lines allow: constellation.js
// places the names), so the figure reads without hovering. On scroll the circles pop in,
// staggered, then the lines draw themselves. Hover, focus or tap a company and it lifts (ring
// glow, a little larger), its lines light, everything else dims a step, and its people branch out
// of it, as in the original: a column of pills (photo, name, batch, role with ● full-time / ○
// intern; each a link to their LinkedIn) on whichever side has room, each joined to the circle by
// its own teal connector that draws out of the ring (fan.js places them from the measured pills).
//
// The companies are the tier-1 list (alumniData TIER1), each circle sized by its alumni count, with
// a count chip from two up. The lines are computed (constellation.js): companies that share an alum
// (someone interned at one and works at the other) are always joined — the brighter lines, along
// which a faint pulse travels now and then — then nearest neighbours, two to four lines a circle,
// no crossings, never through a third circle. ≥ 1100 px: all twenty; 760–1099: the twelve with two
// or more alumni; phones: the top eight under the mark, the pills under (or over) the tapped circle.
//
// Behind it, the particle swarm forms the DVM mark, right of the constellation (LEGACY_PLACE) so it
// is never under a circle. On the desktop home it is the swarm this section shares with Year by
// year (home/LegacyStory.jsx, through SwarmChainContext), which glides on into the folded paper;
// elsewhere the section brings its own (LegacySwarm). Hovering never moves, morphs or re-forms the
// mark: while a company is lit it only dims a small step (chain `active`), so the constellation
// reads forward. Legacy lets go of the selection just before the glide (`legacyOwns`).
import { Fragment, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { P } from "../lib/paths";
import { useKillTriggersOnUnmount, useMedia, useReducedMotion } from "../lib/hooks";
import { SwarmChainContext, legacyMarkBox, useChainValue } from "../home/swarmChain";
import { TIER1 } from "./alumniData";
import { checkConstellation, companiesFor, layoutConstellation, sharedPairs } from "./constellation";
import { checkFan, layoutFan } from "./fan";
import LegacyCircle from "./LegacyCircle";
import LegacySwarm from "./LegacySwarm";
import ui from "../ui.module.css";
import styles from "./Legacy.module.css";

gsap.registerPlugin(ScrollTrigger);

/** Leaving a circle (or its people) clears the selection after this long, unless the pointer comes back. */
const LEAVE_MS = 320;
/** The constellation keeps this far left of the mark's box (px). */
const FIELD_GAP = 48;
/** Lines stop this far short of a name (px; constellation.js already keeps them off it). */
const LABEL_MASK = 3;
/** Room over the field for the key line (px). */
const HINT_H = 32;
/** The people fade out this long after the selection clears (they stay put meanwhile). */
const FAN_OUT_MS = 160;
/** The people keep this far off the mark's box (px). */
const FAN_MARK_GAP = 16;
/** Phones: the people may run this far past the graph's foot; the page makes room under it (px). */
const FAN_SPILL = 420;

const BY_ID = new Map(TIER1.map((t) => [t.id, t]));
const SHARED = sharedPairs(TIER1);

/**
 * @param {{ link?: boolean, id?: string, head?: boolean, className?: string }} props
 *   link: show "All alumni →" in the head row (home). head: render the section head.
 */
const Legacy = ({ link = true, id = "legacy", head = true, className = "" }) => {
  const sectionRef = useRef(null);
  useKillTriggersOnUnmount(sectionRef);
  const graphRef = useRef(null);
  const fieldRef = useRef(null);
  const nodeRefs = useRef({});
  const fanRef = useRef(null);
  const leaveTimer = useRef(0);
  const pointerType = useRef("");
  /** Focus handed back to a circle by Escape: it must not light the company again. */
  const quietFocus = useRef(false);
  const lastNode = useRef(null);

  const narrow = useMedia("(max-width: 759px)");
  const wide = useMedia("(min-width: 1100px)");
  const touch = useMedia("(hover: none)");
  const reduced = useReducedMotion();
  const mode = narrow ? "phone" : wide ? "wide" : "tight";
  const companies = useMemo(() => companiesFor(mode, TIER1), [mode]);

  const [selected, setSelected] = useState(null);

  const chain = useContext(SwarmChainContext);
  const owns = useChainValue(chain, "legacyOwns");
  // past the release (the glide is about to take the dots) a resting pointer must not light a
  // company again as the page scrolls circles under it
  const released = Boolean(chain) && owns === false;
  const releasedRef = useRef(released);
  useLayoutEffect(() => {
    releasedRef.current = released;
  }, [released]);

  const select = useCallback((cid) => {
    window.clearTimeout(leaveTimer.current);
    lastNode.current = cid;
    setSelected(cid);
  }, []);
  const clear = useCallback(() => {
    window.clearTimeout(leaveTimer.current);
    setSelected(null);
  }, []);
  const stay = useCallback(() => window.clearTimeout(leaveTimer.current), []);
  const leave = useCallback(() => {
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setSelected(null), LEAVE_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  // the mark dims a small step while a company is lit (never moves); Legacy lets go before the glide
  useEffect(() => {
    chain?.set("active", Boolean(selected) && !released);
  }, [chain, selected, released]);
  useEffect(() => () => chain?.set("active", false), [chain]);
  useEffect(() => {
    if (released) clear();
  }, [released, clear]);
  // a mode change (resize across a breakpoint) may drop the lit company
  useEffect(() => {
    if (selected && !companies.some((c) => c.id === selected)) clear();
  }, [companies, selected, clear]);

  /* ---- intent */

  /** Clear, and give focus back to the circle that was lit (keyboard). */
  const clearToNode = useCallback(() => {
    const back = nodeRefs.current[lastNode.current];
    clear();
    if (back && document.activeElement !== back) {
      quietFocus.current = true;
      back.focus({ preventScroll: true });
      quietFocus.current = false;
    }
  }, [clear]);

  const onNodeEnter = (cid, e) => {
    if (e.pointerType !== "mouse" || releasedRef.current) return;
    select(cid);
  };
  const onNodeLeave = (e) => {
    if (e.pointerType === "mouse") leave();
  };
  const onNodeFocus = (cid) => {
    if (quietFocus.current) return;
    // a tap focuses the button before its click: let the click decide
    if (pointerType.current && pointerType.current !== "mouse") return;
    select(cid);
  };
  const onNodeClick = (cid, e) => {
    // Enter / Space (a click with no pointer) on the company already lit: into its people
    if (e.detail === 0) {
      if (cid === selected) fanRef.current?.querySelector("a")?.focus();
      else select(cid);
      return;
    }
    // a mouse already lit it on the way in: a click keeps it; a tap toggles
    if (pointerType.current === "mouse" && !narrow) select(cid);
    else if (cid === selected) clear();
    else select(cid);
  };

  const onPointerDown = (e) => {
    pointerType.current = e.pointerType;
  };
  const onKeyDown = (e) => {
    pointerType.current = "";
    if (e.key === "Escape" && selected) {
      e.stopPropagation();
      clearToNode();
    }
  };
  const onBlur = (e) => {
    const to = e.relatedTarget;
    // focus left the section (not a click into nothing, which has no relatedTarget)
    if (to && !sectionRef.current?.contains(to)) clear();
  };

  // touch: a tap outside the section, or on the constellation's empty ground, clears
  useEffect(() => {
    if (!selected || !touch) return undefined;
    const down = (e) => {
      const t = e.target;
      const ground = graphRef.current?.contains(t) && !(t instanceof Element && t.closest("[data-node], [data-fan]"));
      if (!sectionRef.current?.contains(t) || ground) clear();
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [selected, touch, clear]);

  /* ---- geometry: the graph box, and the field left of the mark, in the box's px */

  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    const sec = sectionRef.current;
    const g = graphRef.current;
    if (!sec || !g) return undefined;
    const measure = () => {
      const s = sec.getBoundingClientRect();
      const b = g.getBoundingClientRect();
      if (!s.width || !b.width) return;
      let fw = b.width;
      let markL = b.width;
      if (!narrow) {
        const mark = legacyMarkBox(s.width, s.height, chain ? window.innerHeight : undefined);
        markL = mark.left - (b.left - s.left);
        fw = Math.min(b.width, markL - FIELD_GAP);
      }
      const next = { w: Math.round(b.width), h: Math.round(b.height), fw: Math.round(fw), fh: Math.round(b.height - HINT_H), markL: Math.round(markL) };
      // (the field sits HINT_H under the graph box's top: fw / fh / markL are in its px)
      setBox((p) => (p && Object.keys(next).every((k) => p[k] === next[k]) ? p : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sec);
    ro.observe(g);
    return () => ro.disconnect();
  }, [narrow, chain]);

  const layout = useMemo(() => {
    if (!box || box.fw < 200 || box.fh < 200) return null;
    return layoutConstellation({ mode, companies, fw: box.fw, fh: box.fh, shared: SHARED });
  }, [box, mode, companies]);
  const nodeOf = useMemo(() => new Map((layout?.nodes ?? []).map((n) => [n.id, n])), [layout]);

  /* ---- the people: out of the lit circle (they stay through a short fade after it clears) */

  const [fanFor, setFanFor] = useState(null);
  const [fanOut, setFanOut] = useState(false);
  useLayoutEffect(() => {
    if (selected) {
      setFanFor(selected);
      setFanOut(false);
      return undefined;
    }
    setFanOut(true);
    const t = window.setTimeout(() => setFanFor(null), reduced ? 0 : FAN_OUT_MS);
    return () => window.clearTimeout(t);
  }, [selected, reduced]);
  const fanCompany = fanFor ? (BY_ID.get(fanFor) ?? null) : null;

  /** Where the pills may go, in the field's px: the graph box, short of the mark. */
  const fanBounds = useMemo(
    () => (box ? { l: 0, t: -HINT_H + 2, r: narrow ? box.w : Math.min(box.w, box.markL - FAN_MARK_GAP), b: box.fh + (narrow ? FAN_SPILL : 0) } : null),
    [box, narrow],
  );

  // measure the pills as rendered, then place them (before paint: they never show unplaced)
  const [fan, setFan] = useState(null);
  useLayoutEffect(() => {
    const list = fanRef.current;
    const n = fanFor ? nodeOf.get(fanFor) : null;
    if (!list || !n || !layout || !fanBounds) {
      setFan(null);
      return undefined;
    }
    const run = () => {
      const sizes = [...list.children].map((el) => ({ w: el.offsetWidth, h: el.offsetHeight }));
      if (!sizes.length || !sizes[0].w) return;
      const f = layoutFan({
        node: n,
        sizes,
        bounds: fanBounds,
        circles: layout.nodes.filter((m) => m.id !== n.id),
        rects: layout.nodes.map((m) => ({ ...m.label.box, own: m.id === n.id })),
        prefer: mode === "phone" ? ["below", "above", "right", "left"] : ["right", "left", "below", "above"],
        floor: box.fh,
      });
      setFan(f && { ...f, id: n.id });
    };
    run();
    // (a late font or photo can change a pill's size)
    const ro = new ResizeObserver(run);
    [...list.children].forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [fanFor, nodeOf, layout, fanBounds, mode, box]);
  const placed = fan && fan.id === fanFor ? fan : null;
  // phones: room under the graph for people listed past its foot
  const spill = placed && box && narrow && !fanOut ? Math.max(0, Math.ceil(Math.max(...placed.pills.map((q) => q.y + q.h)) - box.fh + 12)) : 0;
  // phones: bring the last of them into view (the circle stays on screen: six pills are ~280 px)
  const placedId = placed?.id;
  useEffect(() => {
    if (!narrow || !placedId) return undefined;
    const t = window.setTimeout(() => {
      const last = fanRef.current?.lastElementChild;
      const r = last?.getBoundingClientRect();
      if (r && r.bottom > window.innerHeight - 12) last.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [narrow, placedId, reduced]);

  // dev: the geometry rules against what is on screen (window.__v8LegacyCheck())
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__v8LegacyCheck = () => {
      const g = graphRef.current;
      const f = fieldRef.current;
      if (!layout || !g || !f) return null;
      const b = f.getBoundingClientRect();
      const rel = (el, name) => {
        const q = el.getBoundingClientRect();
        return { name, l: q.left - b.left, t: q.top - b.top, r: q.right - b.left, b: q.bottom - b.top };
      };
      const avoid = [];
      sectionRef.current?.querySelectorAll("h2, p, a").forEach((el) => {
        if (!g.contains(el)) avoid.push(rel(el, el.textContent.trim().slice(0, 24)));
      });
      const hint = g.querySelector("[data-hint]");
      if (hint) avoid.push(rel(hint, "hint"));
      if (box && mode !== "phone") avoid.push({ name: "mark", l: box.markL, t: -1e4, r: box.markL + 1e4, b: 1e4 });
      // the names as drawn (the text's own box, not the box planned for it)
      const labels = new Map();
      f.querySelectorAll("[data-label]").forEach((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const q = rel(range, "");
        labels.set(el.getAttribute("data-label"), { l: q.l, t: q.t, r: q.r, b: q.b });
      });
      const sides = {};
      layout.nodes.forEach((n) => (sides[n.label.side] = (sides[n.label.side] ?? 0) + 1));
      return {
        mode,
        field: [layout.fw, layout.fh],
        k: Math.round(layout.k * 100) / 100,
        nodes: layout.nodes.length,
        edges: layout.edges.length,
        strong: layout.edges.filter((e) => e.strong).length,
        sides,
        diameters: [...new Set(layout.nodes.map((n) => n.d))].sort((a, b) => a - b),
        problems: checkConstellation(layout, { avoid, labels }),
        // the lit company's people, as drawn (field px)
        fan: placed && {
          id: placed.id,
          side: placed.side,
          pills: placed.pills.length,
          problems: checkFan(placed, fanBounds, [...(fanRef.current?.children ?? [])].map((el) => rel(el, ""))),
        },
      };
    };
    return () => delete window.__v8LegacyCheck;
  }, [layout, box, mode, placed, fanBounds]);

  /* ---- draw-in: the circles pop in staggered, then the dotted lines draw themselves (once) */

  const [drawn, setDrawn] = useState(false);
  const drawnRef = useRef(false);
  useEffect(() => {
    if (!layout || drawnRef.current) return undefined;
    const g = graphRef.current;
    if (!g) return undefined;
    if (reduced) {
      drawnRef.current = true;
      setDrawn(true);
      return undefined;
    }
    const circles = [...g.querySelectorAll("[data-node]")];
    const lines = [...g.querySelectorAll("[data-edge]")];
    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        drawnRef.current = true;
        setDrawn(true);
      },
    });
    gsap.set(circles, { autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%" });
    gsap.set(lines, { autoAlpha: 0 });
    tl.to(circles, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.07, ease: "power3.out" });
    lines.forEach((el, i) => {
      // each line grows out of its first circle, its dots intact
      const x1 = el.getAttribute("x1");
      const y1 = el.getAttribute("y1");
      const x2 = el.getAttribute("x2");
      const y2 = el.getAttribute("y2");
      tl.fromTo(
        el,
        { autoAlpha: 1, attr: { x2: x1, y2: y1 } },
        { attr: { x2, y2 }, duration: 0.6, ease: "power2.out", immediateRender: false },
        i === 0 ? "-=0.2" : "<0.045",
      );
    });
    tl.set(circles, { clearProps: "opacity,visibility,scale,transform" });
    const st = ScrollTrigger.create({ trigger: g, start: "top 85%", once: true, onEnter: () => tl.play() });
    // already scrolled past (a reload further down the page): draw now
    if (st.progress > 0) tl.play();
    return () => {
      st.kill();
      if (!drawnRef.current) {
        tl.progress(1).kill();
        gsap.set(circles, { clearProps: "opacity,visibility,scale,transform" });
        gsap.set(lines, { clearProps: "opacity,visibility" });
      } else tl.kill();
    };
  }, [layout, reduced]);

  const standalone = !chain && !narrow;
  const active = Boolean(selected);
  const shown = companies.length;

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`${ui.sec} ${styles.container} ${className}`}
      data-light="82.5% 63% 25vw"
      data-chapter={head ? "Alumni" : undefined}
      aria-labelledby={head ? `${id}-title` : undefined}
      aria-label={head ? undefined : "Where our alumni work"}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      {standalone && <LegacySwarm active={active} />}

      <div className={`${ui.wrap} ${styles.inner}`}>
        {head && (
          <div className={ui.headRow}>
            <div className={ui.secHead}>
              <h2 id={`${id}-title`} className={ui.h2}>
                Alumni
              </h2>
              <p className={ui.lede}>Where DVM alumni went next.</p>
            </div>
            {link && (
              <Link to={P("/alumni")} className={`${ui.link} ${ui.headAction}`}>
                All alumni →
              </Link>
            )}
          </div>
        )}

        {/* phones: the mark in a band under the head (no shared swarm behind) */}
        {narrow && !chain && (
          <div className={styles.markBox} aria-hidden="true">
            <LegacySwarm band active={active} />
          </div>
        )}

        <div ref={graphRef} className={styles.graph} data-mode={mode} data-active={active || undefined} data-drawn={drawn || undefined}>
          <p className={`${ui.meta} ${styles.hint}`} data-hint="">
            <span className={styles.key}>
              <span className={styles.sample} aria-hidden="true" /> an alum at both
            </span>
            {shown < TIER1.length && (
              <span>
                Top {shown} of {TIER1.length}
              </span>
            )}
          </p>

          <div ref={fieldRef} className={styles.field} style={{ top: HINT_H }}>
          {layout && (
            <>
              <svg className={styles.lines} aria-hidden="true">
                <defs>
                  <mask id={`${id}-circle-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={box.w} height={box.fh}>
                    <rect x="0" y="0" width={box.w} height={box.fh} fill="white" />
                    {layout.nodes.map((n) => (
                      <circle key={n.id} cx={n.x} cy={n.y} r={n.r + 5} fill="black" />
                    ))}
                    {layout.nodes.map((n) => {
                      const q = n.label.box;
                      return <rect key={`l-${n.id}`} x={q.l - LABEL_MASK} y={q.t - LABEL_MASK} width={q.r - q.l + 2 * LABEL_MASK} height={q.b - q.t + 2 * LABEL_MASK} fill="black" />;
                    })}
                  </mask>
                </defs>
                <g mask={`url(#${id}-circle-mask)`}>
                  {layout.edges.map((e) => {
                    const a = nodeOf.get(e.a);
                    const b = nodeOf.get(e.b);
                    // grow out of the bigger circle
                    const [p, q] = a.r >= b.r ? [a, b] : [b, a];
                    const lit = selected === e.a || selected === e.b;
                    return (
                      <line
                        key={`${e.a}|${e.b}`}
                        data-edge=""
                        x1={p.x}
                        y1={p.y}
                        x2={q.x}
                        y2={q.y}
                        className={`${styles.line} ${e.strong ? styles.lineStrong : ""} ${e.far ? styles.lineFar : ""} ${lit ? styles.lineLit : ""} ${active && !lit ? styles.dimmed : ""}`}
                      />
                    );
                  })}
                  {/* idle life: now and then a faint pulse runs along a line two companies share */}
                  {!reduced &&
                    layout.edges
                      .filter((e) => e.strong)
                      .map((e, i) => {
                        const a = nodeOf.get(e.a);
                        const b = nodeOf.get(e.b);
                        const [p, q] = i % 2 ? [a, b] : [b, a];
                        return (
                          <line
                            key={`pulse-${e.a}|${e.b}`}
                            x1={p.x}
                            y1={p.y}
                            x2={q.x}
                            y2={q.y}
                            pathLength="1"
                            className={styles.pulse}
                            style={{ animationDelay: `${(i * 1.7) % 9}s` }}
                          />
                        );
                      })}
                </g>
              </svg>

              {/* the lit company's connectors, out of its ring to each pill (under the circles); the
                  clear band they cross keeps the people open on the way from the circle to them */}
              {placed && fanCompany && (
                <svg key={`fan-${placed.id}`} className={styles.fanLines} data-fan="" data-out={fanOut || undefined} aria-hidden="true">
                  <polygon
                    className={styles.bridge}
                    points={placed.bridge.map((q) => q.join(",")).join(" ")}
                    onPointerEnter={stay}
                    onPointerLeave={(e) => e.pointerType === "mouse" && selected && leave()}
                  />
                  {placed.paths.map((q, i) => (
                    <path key={i} d={q.d} pathLength="1" className={styles.fanLine} style={{ "--i": i }} />
                  ))}
                </svg>
              )}

              {companies.map((c) => {
                const n = nodeOf.get(c.id);
                if (!n) return null;
                const on = selected === c.id;
                const dim = active && !on;
                return (
                  <Fragment key={c.id}>
                  <button
                    type="button"
                    data-node={c.id}
                    data-cursor="lock"
                    ref={(el) => (nodeRefs.current[c.id] = el)}
                    className={`${styles.node} ${n.depth ? styles.echo : ""} ${on ? styles.nodeOn : ""} ${dim ? styles.nodeDimmed : ""}`}
                    style={{ left: n.x, top: n.y, "--d": `${n.d}px` }}
                    data-side={n.label.side}
                    aria-label={`${c.name}, ${c.count} ${c.count === 1 ? "alum" : "alumni"}`}
                    aria-expanded={on}
                    aria-controls={on ? `${id}-people` : undefined}
                    onPointerEnter={(e) => onNodeEnter(c.id, e)}
                    onPointerLeave={onNodeLeave}
                    onFocus={() => onNodeFocus(c.id)}
                    onClick={(e) => onNodeClick(c.id, e)}
                  >
                    <LegacyCircle logo={c.logo} name={c.name} size={n.d} lit={on} rest="vivid" className={styles.disc} />
                    {c.count > 1 && (
                      <span className={styles.chip} aria-hidden="true">
                        {c.count}
                      </span>
                    )}
                    {/* the name, where constellation.js put it (in the button's px: hovering it lights the company too) */}
                    <span
                      className={styles.label}
                      data-label={c.id}
                      aria-hidden="true"
                      style={{
                        left: n.label.box.l - (n.x - n.r),
                        top: n.label.box.t - (n.y - n.r),
                        width: n.label.box.r - n.label.box.l,
                        height: n.label.box.b - n.label.box.t,
                        fontSize: layout.font,
                        lineHeight: `${layout.lh}px`,
                      }}
                    >
                      {n.label.lines.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </span>
                  </button>
                  {/* its people, right after it (Tab goes from the company into them) */}
                  {fanCompany?.id === c.id && (
                    <ul
                      ref={fanRef}
                      id={`${id}-people`}
                      className={styles.fan}
                      data-fan=""
                      data-side={placed?.side}
                      data-out={fanOut || undefined}
                      aria-label={`Alumni at ${c.name}`}
                      inert={fanOut || undefined}
                      onPointerEnter={stay}
                      onPointerLeave={(e) => e.pointerType === "mouse" && selected && leave()}
                    >
                      {c.people.map((row, i) => (
                        <Pill key={row.person.slug} row={row} i={i} at={placed?.pills[i]} side={placed?.side} />
                      ))}
                    </ul>
                  )}
                  </Fragment>
                );
              })}
            </>
          )}
          </div>
        </div>
        {narrow && <div className={styles.spill} style={{ height: spill }} aria-hidden="true" />}
      </div>
    </section>
  );
};

/**
 * "SDE-2", "Research Intern", "Software Engineer · Intern": the role there, the kind in words when
 * the role does not say it.
 * @param {import("./alumniData").CompanyPerson} row
 */
function roleLine(row) {
  const role = row.role ?? "";
  const kind = row.kind === "intern" ? (/intern/i.test(role) ? "" : "Intern") : role ? "" : "Full-time";
  return [role, kind].filter(Boolean).join(" · ");
}

/**
 * One person, branching out of the lit company: photo, name and batch, the role there (● full-time,
 * ○ intern). A link to their LinkedIn when we have it. Unplaced (first frame): measured, not shown.
 * @param {{ row: import("./alumniData").CompanyPerson, i: number, at?: { x: number, y: number }, side?: string }} props
 */
function Pill({ row, i, at, side }) {
  const p = row.person;
  const role = roleLine(row);
  const title = `${p.name} · ${p.batch} batch, ${p.team} · ${[role, row.unit, row.year].filter(Boolean).join(" · ")}${row.now ? " · now" : ""}`;
  const body = (
    <>
      <Avatar p={p} />
      <span className={styles.pillText}>
        <span className={styles.pillTop}>
          <span className={styles.pillName}>{p.name}</span>
          <span className={styles.pillBatch}>
            <span className={ui.srOnly}>, batch of </span>
            {p.batch}
          </span>
        </span>
        <span className={styles.pillRole}>
          <span className={styles.kindGlyph} data-kind={row.kind} aria-hidden="true" />
          <span className={ui.srOnly}>{row.kind === "intern" ? ", intern: " : ", full-time: "}</span>
          <span className={styles.pillRoleText}>{role}</span>
        </span>
      </span>
    </>
  );
  return (
    <li className={styles.pill} data-side={side} style={at ? { left: at.x, top: at.y, "--i": i } : { visibility: "hidden" }}>
      {p.linkedin ? (
        <a className={styles.pillIn} href={p.linkedin} target="_blank" rel="noreferrer" title={`${title} — LinkedIn`} data-cursor="lock">
          {body}
          <span className={ui.srOnly}> (LinkedIn, opens in a new tab)</span>
        </a>
      ) : (
        <span className={styles.pillIn} title={title}>
          {body}
        </span>
      )}
    </li>
  );
}

function Avatar({ p }) {
  const [failed, setFailed] = useState(!p.photo);
  return (
    <span className={styles.avatar} aria-hidden="true">
      {failed ? p.name[0] : <img src={p.photo} alt="" width="28" height="28" decoding="async" onError={() => setFailed(true)} />}
    </span>
  );
}

export default Legacy;
