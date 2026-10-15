// Reel 2: About. Statement, the five crews one frame each, the three fests.
import { Link } from "react-router-dom";
import { Frame, Reel } from "../reel/Reel";
import { NextReel, TitleCard } from "../frames/ends";
import { fests, projects, projectsByDate, site, stillOf, team, verticals } from "../lib/data";
import { P } from "../lib/paths";
import f from "../frames/frames.module.css";
import s from "./pages.module.css";
import i from "./inner.module.css";

export default function About() {
  const [lead, ...rest] = site.about;
  return (
    <Reel label="About DVM">
      <TitleCard n={2} title="About" line="What we do for BOSM, Oasis and APOGEE, and who does it." />
      <Frame id="statement" chapter="Who we are" label={site.headline} w={104} edge="WE ARE DVM">
        <div className={`${f.inner} ${s.about}`}>
          <h1 className={s.aboutHead}>{site.headline}</h1>
          <p className={s.aboutLead}>{lead}</p>
          <div className={s.aboutRest}>
            {rest.map((t) => (
              <p key={t.slice(0, 20)}>{t}</p>
            ))}
          </div>
        </div>
      </Frame>
      {verticals.map((v, k) => {
        const people = team.filter((m) => m.vertical === v.id);
        const work = projectsByDate.filter((p) => p.verticals.includes(v.id));
        return (
          <Frame key={v.id} id={`crew-${v.id}`} chapter={k === 0 ? "Crews" : undefined} label={v.name} w={64} edge={v.label.toUpperCase()}>
            <div className={`${f.inner} ${i.crew}`}>
              <p className={i.kicker}>Crew {k + 1} of {verticals.length}</p>
              <h2 className={i.crewTitle}>{v.name}</h2>
              <p className={i.body}>{v.description}</p>
              <ul className={i.faces} aria-label={`${people.length} members on record`}>
                {people.slice(0, 14).map((m) => (
                  <li key={m.slug}>
                    <img src={m.photo} alt={m.name} title={m.name} loading="lazy" draggable={false} />
                  </li>
                ))}
                {people.length > 14 && <li className={i.facesMore}>+{people.length - 14}</li>}
              </ul>
              <div className={i.credits}>
                <p className={i.mono}>{work.length} projects credited</p>
                <ul className={i.workList}>
                  {work.slice(0, 4).map((p) => (
                    <li key={p.slug}>
                      <Link to={P(`/projects/${p.slug}`)}>{p.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Frame>
        );
      })}
      {fests.map((fe, k) => {
        const work = projectsByDate.filter((p) => p.fest === fe.id);
        const stills = work.map(stillOf).filter(Boolean).slice(0, 6);
        return (
          <Frame key={fe.id} id={`fest-${fe.id.toLowerCase()}`} chapter={k === 0 ? "Fests" : undefined} label={fe.name} w={92} edge={fe.name.toUpperCase()}>
            <div className={`${f.inner} ${i.fest}`}>
              <div className={i.festText}>
                <h2 className={i.festName}>{fe.name}</h2>
                <p className={i.body}>{fe.blurb}</p>
                <p className={i.mono}>
                  {work.length} of our {projects.length} projects were made for {fe.name}
                </p>
                {fe.website && (
                  <a href={fe.website} target="_blank" rel="noreferrer" className={f.pill}>
                    Visit {fe.name}
                  </a>
                )}
              </div>
              <ul className={i.festStills} aria-hidden="true">
                {stills.map((src) => (
                  <li key={src}>
                    <img src={src} alt="" loading="lazy" draggable={false} />
                  </li>
                ))}
              </ul>
            </div>
          </Frame>
        );
      })}
      <NextReel n={3} />
    </Reel>
  );
}
