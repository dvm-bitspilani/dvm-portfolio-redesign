// Start menu: search everything (apps, projects, people, essays, artwork) with keyboard
// navigation; when the query is empty, the apps, featured work and the session controls.
import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, RotateCcw, Search } from "lucide-react";
import { blogs, featuredProjects, projects } from "../../../immersive/data";

const SHOWCASE = [...featuredProjects, ...projects.filter((p) => !p.featured && p.kind !== "video")].filter((p) => p.cover).slice(0, 4);
import { APPS } from "./apps";
import { AppIcon, MarkSvg } from "./icons";
import { search } from "./search";
import { rectOf } from "./shell";
import s from "./start.module.css";
import { MOD, ALT } from "../lib/hooks";

export function SearchResults({ results, active, setActive, onPick, listId }) {
  let last = null;
  return (
    <ul className={s.results} id={listId} role="listbox" aria-label="Results">
      {results.map((r, i) => {
        const head = r.group !== last ? r.group : null;
        last = r.group;
        return (
          <li key={r.id} role="presentation">
            {head && <div className={s.group}>{head}</div>}
            <button
              role="option"
              id={`${listId}-${i}`}
              aria-selected={i === active}
              className={s.result}
              onPointerMove={() => setActive(i)}
              onClick={(e) => onPick(r, e.currentTarget)}
            >
              {r.photo ? <img className={s.thumb} src={r.photo} alt="" loading="lazy" /> : <AppIcon app={r.app} cover={r.cover} size={30} />}
              <span className={s.rText}>
                <span className={s.rTitle}>{r.title}</span>
                {r.sub && <span className={s.rSub}>{r.sub}</span>}
              </span>
              <span className={s.rKind}>{r.group === "Apps" ? "Open" : r.group.replace(/s$/, "")}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Search box + results; `onOpen({app,param,props}, el)` launches. */
export function useSearch(onOpen, listId = "v4-res") {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => search(q), [q]);
  useEffect(() => setActive(0), [q]);
  const onKey = (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") setActive((a) => (a + 1) % results.length);
    else if (e.key === "ArrowUp") setActive((a) => (a - 1 + results.length) % results.length);
    else if (e.key === "Enter") onOpen(results[active].open, document.getElementById(`${listId}-${active}`));
    else return;
    e.preventDefault();
  };
  return { q, setQ, results, active, setActive, onKey };
}

export default function StartMenu({ open, onClose, launch, onLock, onRestart }) {
  const panel = useRef(null);
  const input = useRef(null);
  const pick = (o, el) => {
    onClose();
    launch(o.app, o.param, { origin: rectOf(el), props: o.props });
  };
  const sr = useSearch(pick);
  const latest = useMemo(() => [...blogs].sort((a, b) => b.isoDate.localeCompare(a.isoDate)).slice(0, 2), []);

  useEffect(() => {
    if (!open) return;
    sr.setQ("");
    const id = requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
    const onDown = (e) => !panel.current?.contains(e.target) && !e.target.closest("[data-menu-trigger]") && onClose();
    addEventListener("pointerdown", onDown, true);
    return () => {
      cancelAnimationFrame(id);
      removeEventListener("pointerdown", onDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  return (
    <div
      ref={panel}
      className={s.start}
      role="dialog"
      aria-label="Start"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <label className={s.searchBox}>
        <Search size={17} strokeWidth={1.8} />
        <input
          ref={input}
          value={sr.q}
          onChange={(e) => sr.setQ(e.target.value)}
          onKeyDown={sr.onKey}
          placeholder="Search apps, projects, people and essays"
          aria-label="Search"
          aria-controls="v4-res"
          aria-activedescendant={sr.results.length ? `v4-res-${sr.active}` : undefined}
          spellCheck={false}
          autoComplete="off"
        />
        <kbd>{MOD} K</kbd>
      </label>

      <div className={s.scroll}>
        {sr.q.trim() ? (
          sr.results.length ? (
            <SearchResults results={sr.results} active={sr.active} setActive={sr.setActive} onPick={pick} listId="v4-res" />
          ) : (
            <p className={s.none}>Nothing matches “{sr.q}”. Try a fest, a year or a name.</p>
          )
        ) : (
          <>
            <h3 className={s.h}>Apps</h3>
            <div className={s.apps}>
              {APPS.map((a, i) => (
                <button key={a.id} className={s.app} onClick={(e) => pick({ app: a.id }, e.currentTarget.firstChild)} title={`${ALT} ${i + 1}`}>
                  <AppIcon app={a.id} size={48} />
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
            <h3 className={s.h}>Featured work</h3>
            <div className={s.featured}>
              {SHOWCASE.map((p) => (
                <button key={p.slug} className={s.feat} onClick={(e) => pick({ app: "project", param: p.slug }, e.currentTarget)}>
                  <img src={p.cover} alt="" loading="lazy" />
                  <span>{p.title}</span>
                </button>
              ))}
            </div>
            <h3 className={s.h}>Latest essays</h3>
            <div className={s.essays}>
              {latest.map((b) => (
                <button key={b.slug} className={s.essay} onClick={(e) => pick({ app: "blogs", props: { select: b.slug } }, e.currentTarget)}>
                  <span className={s.eTitle}>{b.shortTitle ?? b.title}</span>
                  <span className={s.eSub}>
                    {b.authors.join(", ")}, {b.date}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={s.foot}>
        <span className={s.user}>
          <MarkSvg className={s.avatar} fill="url(#v4-mark-grad)" />
          <span>
            <span className={s.uName}>Guest</span>
            <span className={s.uSub}>Department of Visual Media, BITS Pilani</span>
          </span>
        </span>
        <button className={s.footBtn} onClick={onLock} title="Lock screen">
          <Lock size={15} /> Lock
        </button>
        <button className={s.footBtn} onClick={onRestart} title="Restart">
          <RotateCcw size={15} /> Restart
        </button>
      </div>
    </div>
  );
}
