// Team: a contacts app. Group by vertical or batch, search, an alphabetical list with
// letter headers, and a contact card (portrait, role, socials, batch-mates).
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, Search, Users } from "lucide-react";
import { team, verticals, batches } from "../../../immersive/data";
import a from "./app.module.css";
import s from "./team.module.css";

const vName = (id) => verticals.find((v) => v.id === id)?.label ?? id;
const SOCIAL = { linkedin: "LinkedIn", github: "GitHub", instagram: "Instagram", twitter: "X / Twitter", dribbble: "Dribbble", behance: "Behance", facebook: "Facebook" };
const initials = (n) =>
  n
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

function Avatar({ m, size = 36 }) {
  const [err, setErr] = useState(false);
  return (
    <span className={s.avatar} style={{ width: size, height: size }}>
      {!err ? <img src={m.photo} alt="" loading="lazy" decoding="async" onError={() => setErr(true)} /> : <span>{initials(m.name)}</span>}
    </span>
  );
}

function Card({ m, onPick, onBack }) {
  const mates = useMemo(() => team.filter((x) => x.batch === m.batch && x.vertical === m.vertical && x.slug !== m.slug), [m]);
  const socials = Object.entries(m.socials).filter(([, v]) => v);
  return (
    <div className={s.card}>
      <button className={s.back} onClick={onBack}>
        <ChevronLeft size={16} /> All contacts
      </button>
      <div className={s.portraitWrap}>
        <Avatar m={m} size={176} />
      </div>
      <h2 className={s.cardName}>{m.name}</h2>
      {m.designation && <p className={s.role}>{m.designation}</p>}
      <div className={s.cardChips}>
        <span className={a.chip}>{verticals.find((v) => v.id === m.vertical)?.name}</span>
        <span className={a.chip}>Batch of {m.batch}</span>
      </div>
      {socials.length > 0 ? (
        <div className={s.socials}>
          {socials.map(([k, url]) => (
            <a key={k} className={a.btn} href={url} target="_blank" rel="noreferrer">
              {SOCIAL[k] ?? k} <ArrowUpRight />
            </a>
          ))}
        </div>
      ) : (
        <p className={s.none}>No public profiles on record.</p>
      )}
      {mates.length > 0 && (
        <>
          <h3 className={s.h3}>
            {vName(m.vertical)}, batch of {m.batch}
          </h3>
          <div className={s.mates}>
            {mates.map((x) => (
              <button key={x.slug} className={s.mate} onClick={() => onPick(x.slug)} title={x.name}>
                <Avatar m={x} size={44} />
                <span>{x.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Summary() {
  return (
    <div className={s.summary}>
      <Users size={40} strokeWidth={1.2} />
      <h2>{team.length} people on record</h2>
      <p>Everyone who has built for DVM since {batches[batches.length - 1]}. Pick a contact to see their card.</p>
      <ul>
        {verticals.map((v) => (
          <li key={v.id}>
            <span>{v.name}</span>
            <b>{team.filter((m) => m.vertical === v.id).length}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Team({ props }) {
  const [group, setGroup] = useState(props?.group ?? "vertical");
  const [filter, setFilter] = useState(props?.filter ?? "all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(props?.select ?? null);
  const [detail, setDetail] = useState(!!props?.select);
  const listRef = useRef(null);

  useEffect(() => {
    if (!props?.nonce && !props?.select && !props?.filter) return;
    if (props.group) setGroup(props.group);
    if (props.filter) setFilter(props.filter);
    if (props.select) {
      const m = team.find((x) => x.slug === props.select);
      if (m) {
        setFilter("all");
        setQ("");
        setSel(m.slug);
        setDetail(true);
        requestAnimationFrame(() => listRef.current?.querySelector(`[data-slug="${m.slug}"]`)?.scrollIntoView({ block: "center" }));
      }
    }
  }, [props?.nonce, props?.select, props?.filter, props?.group]);

  const groups = group === "vertical" ? verticals.map((v) => ({ id: v.id, label: v.name })) : batches.map((b) => ({ id: b, label: `Batch of ${b}` }));
  const people = useMemo(() => {
    const query = q.trim().toLowerCase();
    return team
      .filter((m) => filter === "all" || (group === "vertical" ? m.vertical === filter : m.batch === filter))
      .filter((m) => !query || `${m.name} ${m.designation ?? ""} ${vName(m.vertical)} ${m.batch}`.toLowerCase().includes(query))
      .sort((x, y) => x.name.localeCompare(y.name));
  }, [filter, group, q]);
  const current = team.find((m) => m.slug === sel);

  let lastLetter = "";
  const setGroupBy = (g) => {
    setGroup(g);
    setFilter("all");
  };
  const pick = (slug) => {
    setSel(slug);
    setDetail(true);
  };
  const onKey = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = people.findIndex((m) => m.slug === sel);
    const n = people[Math.max(0, Math.min(people.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (!n) return;
    setSel(n.slug);
    listRef.current?.querySelector(`[data-slug="${n.slug}"]`)?.focus();
  };

  return (
    <div className={a.app}>
      <div className={a.split}>
        <nav className={a.side} aria-label="Groups">
          <div className={`${a.seg} ${s.groupSeg}`} role="group" aria-label="Group by">
            <button className={a.segBtn} aria-pressed={group === "vertical"} onClick={() => setGroupBy("vertical")}>
              Vertical
            </button>
            <button className={a.segBtn} aria-pressed={group === "batch"} onClick={() => setGroupBy("batch")}>
              Batch
            </button>
          </div>
          <button className={a.sideItem} aria-current={filter === "all"} onClick={() => setFilter("all")}>
            Everyone <span className={a.count}>{team.length}</span>
          </button>
          {groups.map((g) => (
            <button key={g.id} className={a.sideItem} aria-current={filter === g.id} onClick={() => setFilter(g.id)}>
              {g.label}
              <span className={a.count}>{team.filter((m) => (group === "vertical" ? m.vertical === g.id : m.batch === g.id)).length}</span>
            </button>
          ))}
        </nav>

        <div className={s.body} data-detail={detail || undefined}>
          <div className={s.listCol}>
            <div className={a.chips}>
              <button className={a.chipBtn} aria-current={group === "vertical"} onClick={() => setGroupBy("vertical")}>
                By vertical
              </button>
              <button className={a.chipBtn} aria-current={group === "batch"} onClick={() => setGroupBy("batch")}>
                By batch
              </button>
              <span className={s.chipSep} />
              <button className={a.chipBtn} aria-current={filter === "all"} onClick={() => setFilter("all")}>
                Everyone
              </button>
              {groups.map((g) => (
                <button key={g.id} className={a.chipBtn} aria-current={filter === g.id} onClick={() => setFilter(g.id)}>
                  {group === "vertical" ? vName(g.id) : g.id}
                </button>
              ))}
            </div>
            <div className={a.toolbar}>
              <label className={a.search} style={{ flex: 1, width: "auto" }}>
                <Search />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" aria-label="Search people" />
              </label>
            </div>
            <div className={a.scroll} ref={listRef} onKeyDown={onKey}>
              {people.length === 0 && <p className={a.empty}>Nobody matches “{q}”.</p>}
              <ul className={s.list}>
                {people.map((m) => {
                  const L = m.name[0].toUpperCase();
                  const head = L !== lastLetter ? L : null;
                  lastLetter = L;
                  return (
                    <li key={m.slug}>
                      {head && <div className={s.letter}>{head}</div>}
                      <button className={s.row} data-slug={m.slug} aria-current={sel === m.slug} onClick={() => pick(m.slug)}>
                        <Avatar m={m} />
                        <span className={s.rowText}>
                          <span className={s.rowName}>{m.name}</span>
                          <span className={s.rowSub}>{m.designation ?? `${vName(m.vertical)}, ${m.batch}`}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className={a.status}>
              <span>
                {people.length} {people.length === 1 ? "contact" : "contacts"}
              </span>
            </div>
          </div>
          <div className={s.detailCol}>{current ? <Card key={current.slug} m={current} onPick={pick} onBack={() => setDetail(false)} /> : <Summary />}</div>
        </div>
      </div>
    </div>
  );
}

export default memo(Team);
