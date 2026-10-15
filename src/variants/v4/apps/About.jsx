// About DVM: the "About this machine" panel. The live mark (with a material switch:
// chrome / glass / x-ray), the spec sheet, the five teams, a storage bar of everything
// DVM has made, and the three fests.
import { memo, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { MercuryLogo } from "../../../immersive/kit/mercury";
import { artworks, blogs, fests, projects, site, socials, stats, team, verticals } from "../../../immersive/data";
import { GLASS_ENV, rectOf, useOs } from "../os/shell";
import { MarkSvg } from "../os/icons";
import a from "./app.module.css";
import s from "./about.module.css";

const MATERIALS = [
  ["Chrome", 0],
  ["Glass", 1],
  ["X-ray", 2],
];
const TABS = ["Overview", "Teams", "Storage", "Fests"];

function Overview() {
  const shipped = projects.filter((p) => p.kind !== "video").length;
  const films = projects.length - shipped;
  const batch = stats.find((x) => x.label === "batches");
  return (
    <>
      <dl className={`${a.kv} ${s.spec}`}>
        <dt>Department</dt>
        <dd>Visual Media</dd>
        <dt>Institution</dt>
        <dd>BITS Pilani, Pilani campus</dd>
        <dt>Builds for</dt>
        <dd>BOSM, Oasis and APOGEE</dd>
        <dt>Teams</dt>
        <dd>{verticals.map((v) => v.label).join(", ")}</dd>
        <dt>Shipped</dt>
        <dd>
          {shipped} websites, apps and portals; {films} films
        </dd>
        <dt>People</dt>
        <dd>
          {team.length} members on record, batches {batch?.display}
        </dd>
        <dt>Peak load</dt>
        <dd>5000+ users on our apps and websites</dd>
      </dl>
      <div className={s.prose}>
        {site.about.map((p) => (
          <p key={p.slice(0, 20)}>{p}</p>
        ))}
      </div>
    </>
  );
}

function Teams({ launch }) {
  return (
    <ul className={s.teams}>
      {verticals.map((v) => {
        const n = team.filter((m) => m.vertical === v.id).length;
        return (
          <li key={v.id} className={s.teamRow}>
            <div className={s.teamHead}>
              <h3>{v.name}</h3>
              <span className={a.count}>{n} people</span>
            </div>
            <p>{v.description}</p>
            <button className={s.link} onClick={(e) => launch("team", undefined, { origin: rectOf(e.currentTarget), props: { group: "vertical", filter: v.id } })}>
              See the {v.label} team
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Storage({ launch }) {
  const parts = useMemo(() => {
    const by = (k) => projects.filter((p) => p.kind === k).length;
    return [
      { label: "Websites", n: by("website"), c: "#45e6ff" },
      { label: "Apps", n: by("app"), c: "#8beaf7" },
      { label: "Portals", n: by("portal"), c: "#cfe8ff" },
      { label: "Films", n: by("video"), c: "#2aa7c0" },
      { label: "Artworks", n: artworks.length, c: "#5f7f8c" },
      { label: "Essays", n: blogs.length, c: "#2c4a55" },
    ];
  }, []);
  const total = parts.reduce((x, p) => x + p.n, 0);
  return (
    <div className={s.storage}>
      <div className={s.diskHead}>
        <MarkSvg className={s.disk} fill="url(#v4-mark-grad)" />
        <div>
          <h3>DVM Archive</h3>
          <p>
            {total} items and {team.length} portraits, 2018 to {Math.max(...projects.map((p) => p.year ?? 0))}
          </p>
        </div>
      </div>
      <div className={s.bar} role="img" aria-label={parts.map((p) => `${p.n} ${p.label}`).join(", ")}>
        {parts.map((p) => (
          <span key={p.label} style={{ flexGrow: p.n, background: p.c }} title={`${p.label}: ${p.n}`} />
        ))}
      </div>
      <ul className={s.legend}>
        {parts.map((p) => (
          <li key={p.label}>
            <i style={{ background: p.c }} />
            {p.label}
            <span>{p.n}</span>
          </li>
        ))}
      </ul>
      <div className={s.actions}>
        <button className={a.btnPrimary} onClick={(e) => launch("archive", undefined, { origin: rectOf(e.currentTarget) })}>
          Open the Archive
        </button>
        <button className={a.btn} onClick={(e) => launch("projects", undefined, { origin: rectOf(e.currentTarget) })}>
          Browse projects
        </button>
      </div>
    </div>
  );
}

function Fests({ launch }) {
  return (
    <ul className={s.teams}>
      {fests.map((f) => {
        const n = projects.filter((p) => p.fest === f.id).length;
        return (
          <li key={f.id} className={s.teamRow}>
            <div className={s.teamHead}>
              <h3>{f.name}</h3>
              <span className={a.count}>{n} projects</span>
            </div>
            <p>{f.blurb}</p>
            <div className={s.row}>
              <button className={s.link} onClick={(e) => launch("projects", undefined, { origin: rectOf(e.currentTarget), props: { filter: `fest:${f.id}` } })}>
                {f.name} projects
              </button>
              {f.website && (
                <a className={s.link} href={f.website} target="_blank" rel="noreferrer">
                  {f.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function About({ live }) {
  const { launch } = useOs();
  const [mat, setMat] = useState(0);
  const [tab, setTab] = useState("Overview");
  return (
    <div className={a.app}>
      <div className={s.layout}>
        <div className={s.stage}>
          <div className={s.markBox} data-kit>
            {live ? (
              <MercuryLogo env={GLASS_ENV} progress={mat} smoothing={4} fit={{ mode: "height", padding: 0.14 }} introDelay={0.2} shadow={0.4} sheen={1} contours={1} pointerTarget="parent" label="DVM" />
            ) : (
              <MarkSvg className={s.still} fill="url(#v4-mark-grad)" />
            )}
          </div>
          <div className={a.seg} role="group" aria-label="Material">
            {MATERIALS.map(([label, v]) => (
              <button key={label} className={a.segBtn} aria-pressed={mat === v} onClick={() => setMat(v)}>
                {label}
              </button>
            ))}
          </div>
          <p className={s.stageNote}>{live ? "Pull a droplet out of the mark. Click to drop a bead." : "Paused while another 3D app is in front."}</p>
        </div>

        <div className={s.info}>
          <h1 className={`${a.display} ${s.title}`}>DVM</h1>
          <p className={s.sub}>{site.fullName}, BITS Pilani</p>
          <p className={s.version}>DVM OS 2026.10, Pilani build</p>
          <div className={s.tabs} role="tablist">
            {TABS.map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={s.tab} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className={s.tabBody} role="tabpanel" aria-label={tab}>
            {tab === "Overview" && <Overview />}
            {tab === "Teams" && <Teams launch={launch} />}
            {tab === "Storage" && <Storage launch={launch} />}
            {tab === "Fests" && <Fests launch={launch} />}
          </div>
          <div className={s.foot}>
            {socials.map((x) => (
              <a key={x.id} className={s.social} href={x.url} target="_blank" rel="noreferrer">
                {x.label}
                <ArrowUpRight size={13} />
              </a>
            ))}
            <button className={a.btnPrimary} onClick={(e) => launch("contact", undefined, { origin: rectOf(e.currentTarget) })}>
              Write to DVM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(About);
