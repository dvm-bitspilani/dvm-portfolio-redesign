// Reel 4: Legacy. The long take through the years, then the roll call of everyone who led.
import { Link } from "react-router-dom";
import { Frame, Reel } from "../reel/Reel";
import { YearTake } from "../frames/blocks";
import { NextReel, TitleCard } from "../frames/ends";
import { VERTICAL_LABEL, leaders } from "../lib/data";
import { P } from "../lib/paths";
import f from "../frames/frames.module.css";
import i from "./inner.module.css";

/** Group positions by tenure ("2025–26"); a person with two posts appears under both. */
function rollCall() {
  const map = new Map();
  leaders.forEach((m) => {
    m.designation.split(/\s*(?:\/|&)\s*/).forEach((part) => {
      const t = part.match(/(20\d\d)\s*-\s*(\d\d)/);
      if (!t) return;
      const key = `${t[1]}–${t[2]}`;
      const role = part.replace(/\s*20\d\d\s*-\s*\d\d.*/, "").trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ m, role });
    });
  });
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export default function Legacy() {
  const tenures = rollCall();
  return (
    <Reel label="Legacy">
      <TitleCard n={4} title="Legacy" line="Since 2017: what shipped, who joined, and who led." />
      <YearTake full chapter="Years" id="years" />
      <Frame id="leads" chapter="Leads" label="Roll call" w="auto" edge="ROLL CALL">
        <div className={i.leads}>
          <div className={i.leadsIntro}>
            <h2 className={i.sectionTitle}>Roll call</h2>
            <p className={i.body}>Everyone who held a post at DVM, by tenure. Coordinators of each fest, creative and projects heads, StuCCAn and CoStAAn.</p>
          </div>
          {tenures.map(([t, list]) => (
            <section key={t} className={i.tenure} aria-label={`Tenure ${t}`}>
              <h3 className={i.tenureYear}>{t}</h3>
              <ul className={i.tenureList}>
                {list.map(({ m, role }) => (
                  <li key={m.slug + role}>
                    <img src={m.photo} alt="" loading="lazy" draggable={false} />
                    <span className={i.tName}>{m.name}</span>
                    <span className={i.tRole}>
                      {role}, {VERTICAL_LABEL[m.vertical]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Frame>
      <Frame id="archive-door" chapter="Archive" label="The archive" w={60} edge="ARCHIVE" spot="0.5,0.45">
        <div className={`${f.inner} ${i.center}`}>
          <h2 className={i.sectionTitle}>Every record, one wall</h2>
          <p className={i.body}>Projects, screens, films, artwork, essays and members, laid out as one contact sheet you can drag and zoom.</p>
          <Link to={P("/archive")} className={f.pill}>
            Open the contact sheet
          </Link>
        </div>
      </Frame>
      <NextReel n={5} />
    </Reel>
  );
}
