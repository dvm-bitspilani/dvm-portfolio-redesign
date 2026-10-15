// /projects/:name — a project as a scene: the slate, the footage (the film itself, or
// the site scrolling through as each frame crosses the gate), the synopsis and the
// credits. The bottom scrubber turns into an edit timeline with a thumbnail per shot.
import { Link, useParams } from "react-router-dom";
import { Frame, Reel } from "../reel/Reel";
import { Film, Site, Still } from "../frames/pieces";
import { KIND_LABEL, VERTICAL_NAME, projectBySlug, projectsByDate, stillOf } from "../lib/data";
import { P } from "../lib/paths";
import f from "../frames/frames.module.css";
import i from "./inner.module.css";

function Slate({ p, scene, total }) {
  const fields = [
    ["Prod.", p.fest === "Campus" ? "BITS Pilani" : p.fest],
    ["Scene", `${scene} of ${total}`],
    ["Take", "1"],
    ["Roll", p.year ?? "n/a"],
    ["Date", p.date ?? "Undated"],
    ["Format", KIND_LABEL[p.kind]],
    ["Director", "DVM"],
    ["Crew", p.verticals.map((v) => VERTICAL_NAME[v]?.replace(/ Team$/, "")).join(", ")],
  ];
  return (
    <Frame id="slate" chapter="Slate" label={`Slate: ${p.title}`} w={92} edge={`SC ${scene} TK 1`} thumb={stillOf(p) || undefined}>
      <div className={`${f.inner} ${i.slateWrap}`}>
        <div className={i.slate} aria-hidden="false">
          <div className={i.sticks} aria-hidden="true">
            <span />
            <span />
          </div>
          <dl className={i.slateGrid}>
            {fields.map(([k, v]) => (
              <div key={k} className={i.slateCell}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={i.slateTitle}>
          <p className={i.kicker}>{p.theme ? `Theme: ${p.theme}` : KIND_LABEL[p.kind]}</p>
          <h1 className={i.sceneTitle}>{p.title}</h1>
          {p.subtitle && <p className={i.body}>{p.subtitle}</p>}
          {p.summary && <p className={i.body}>{p.summary}</p>}
        </div>
      </div>
    </Frame>
  );
}

function Footage({ p }) {
  if (p.kind === "video") {
    return (
      <Frame id="footage" chapter="Footage" label={`${p.title}, the film`} w={92} edge="FOOTAGE" thumb={p.cover}>
        <div className={f.projectInner}>
          <Film project={p} caption={false} className={i.bigFilm} />
        </div>
      </Frame>
    );
  }
  const desk = p.gallery || [];
  const mob = p.mobileGallery || [];
  const shots = [];
  const n = Math.max(desk.length, mob.length);
  for (let k = 0; k < n; k++) shots.push({ d: desk[k] ?? null, m: mob[k] ?? null });
  const frames = shots.map((sh, k) => (
    <Frame key={`shot${k}`} id={`shot-${k + 1}`} chapter={k === 0 ? "Footage" : undefined} label={`${p.title}, screen ${k + 1}`} w={sh.d ? 90 : 52} edge={`SHOT ${k + 1}`} thumb={sh.d || sh.m}>
      <div className={f.projectInner}>
        <Site project={p} desktop={sh.d ?? false} mobile={sh.m ?? false} caption={false} />
      </div>
    </Frame>
  ));
  const still = p.mockup || (!n ? stillOf(p) : null);
  if (still)
    frames.push(
      <Frame key="still" id="still" chapter={n ? undefined : "Footage"} label={`${p.title}, still`} w={76} edge="STILL" thumb={still}>
        <div className={f.projectInner}>
          <Still project={{ ...p, mockup: still }} caption={false} />
        </div>
      </Frame>,
    );
  if (!frames.length)
    frames.push(
      <Frame key="none" id="no-footage" chapter="Footage" label="No footage" w={56} edge="NO FOOTAGE">
        <div className={`${f.inner} ${i.center}`}>
          <p className={i.body}>No screens of {p.title} are archived yet.</p>
        </div>
      </Frame>,
    );
  return frames;
}

export default function Scene() {
  const { name } = useParams();
  const p = projectBySlug.get(name);
  if (!p) {
    return (
      <Reel label="Scene not found">
        <Frame id="missing" chapter="Missing" label="Scene not found" w={100}>
          <div className={`${f.inner} ${i.center}`}>
            <h1 className={i.sceneTitle}>This scene is not on the reel</h1>
            <p className={i.body}>There is no project called "{name}".</p>
            <Link to={P("/projects")} className={f.pill}>
              Back to the Work reel
            </Link>
          </div>
        </Frame>
      </Reel>
    );
  }
  const idx = projectsByDate.indexOf(p);
  const prev = projectsByDate[(idx - 1 + projectsByDate.length) % projectsByDate.length];
  const next = projectsByDate[(idx + 1) % projectsByDate.length];
  const links = [
    p.links.live && { href: p.links.live, label: "Visit the live site" },
    p.links.playStore && { href: p.links.playStore, label: "Get it on Google Play" },
    p.links.youtube && { href: p.links.youtube, label: "Watch on YouTube" },
  ].filter(Boolean);
  return (
    <Reel label={`Scene: ${p.title}`} key={p.slug}>
      <Slate p={p} scene={idx + 1} total={projectsByDate.length} />
      <Footage p={p} />
      <Frame id="synopsis" chapter="Synopsis" label="Synopsis" w={80} edge="SYNOPSIS">
        <div className={`${f.inner} ${i.synopsis}`}>
          <h2 className={i.sectionTitle}>Synopsis</h2>
          <div className={i.synCols}>
            <p className={i.lead}>{p.description || p.summary || `${p.title}, made by DVM for ${p.fest}.`}</p>
            {p.festContext && <p className={i.body}>{p.festContext}</p>}
          </div>
        </div>
      </Frame>
      <Frame id="scene-credits" chapter="Credits" label="Scene credits" w={64} edge="CREDITS">
        <div className={`${f.inner} ${i.sceneCredits}`}>
          <dl className={i.creditList}>
            <div>
              <dt>Made by</dt>
              <dd>
                {p.verticals.map((v) => (
                  <span key={v}>{VERTICAL_NAME[v]}</span>
                ))}
              </dd>
            </div>
            <div>
              <dt>For</dt>
              <dd>
                <span>
                  {p.fest}
                  {p.year ? ` ${p.year}` : ""}
                </span>
              </dd>
            </div>
            {p.tags?.length > 0 && (
              <div>
                <dt>Tags</dt>
                <dd>
                  {p.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
          {links.length > 0 && (
            <p className={i.pieceLinks}>
              {links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className={f.pill}>
                  {l.label}
                </a>
              ))}
            </p>
          )}
        </div>
      </Frame>
      <Frame id="cut" chapter="Cut" label="Next scene" w={70} edge="CUT">
        <div className={`${f.inner} ${i.cut}`}>
          <Link to={P(`/projects/${prev.slug}`)} className={i.cutLink}>
            <span className={i.kicker}>Previous scene</span>
            <span className={i.cutTitle}>{prev.title}</span>
          </Link>
          <Link to={P(`/projects/${next.slug}`)} className={`${i.cutLink} ${i.cutNext}`}>
            <span className={i.kicker}>Next scene</span>
            <span className={i.cutTitle}>{next.title}</span>
          </Link>
          <Link to={P("/projects")} className={f.pill}>
            Back to the Work reel
          </Link>
        </div>
      </Frame>
    </Reel>
  );
}
