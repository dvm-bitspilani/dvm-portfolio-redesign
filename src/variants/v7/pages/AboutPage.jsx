// About, inside the expanded mark tile. Copy is verbatim from the live site / data layer.
import { Link } from "react-router-dom";
import Page from "./Page";
import { site, verticals, fests, team, socials } from "../lib/data";
import { P } from "../lib/paths";
import p from "./pages.module.css";

const memberCount = (id) => team.filter((m) => m.vertical === id).length;

export default function AboutPage({ scrollRef }) {
  return (
    <Page id="mark" label="About DVM" title="We are DVM" scrollRef={scrollRef} className={p.about} readout={null}>
      <p className={p.lead}>{site.about[0]}</p>
      <p className={p.body}>{site.about[1]}</p>
      <p className={p.body}>{site.about[2]}</p>

      <h2 className={p.h2}>
        {site.about[3].replace(/\.$/, "")}
      </h2>
      <ul className={p.teams}>
        {verticals.map((v) => (
          <li key={v.id} className={p.teamRow}>
            <span className={p.teamName}>{v.name}</span>
            <p className={p.teamDesc}>{v.description}</p>
            <Link className={p.teamCount} to={`${P("/team")}?team=${v.id}`}>
              {memberCount(v.id)} members
            </Link>
          </li>
        ))}
      </ul>

      <h2 className={p.h2}>The three fests</h2>
      <div className={p.festBlurbs}>
        {fests.map((f) => (
          <section key={f.id} className={p.festBlurb}>
            <h3>{f.name}</h3>
            <p>{f.blurb}</p>
            <Link className={p.textLink} to={`${P("/projects")}?fest=${f.id}`}>
              What we built for {f.name}
            </Link>
          </section>
        ))}
      </div>

      <h2 className={p.h2}>Find us</h2>
      <div className={p.linkRow}>
        {socials.map((s) => (
          <a key={s.id} className={p.btnGhost} href={s.url} target="_blank" rel="noreferrer">
            {s.label}
          </a>
        ))}
        <Link className={p.btn} to={P("/contactus")}>
          Write to us
        </Link>
      </div>
    </Page>
  );
}
