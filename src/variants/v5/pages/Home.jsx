// Reel 1: the whole story on one strip.
// Prologue / About / Work / Legacy / Team / Journal / Credits.
import { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Frame, Reel } from "../reel/Reel";
import { useBus, useHeroSlot } from "../reel/context";
import { ChapterCard, ProjectFrame } from "../frames/pieces";
import { ArtStill, BlogStill, CastGrid, ContactForm, CreditsRoll, YearTake } from "../frames/blocks";
import { featuredBlogs, featuredWork, journalArt, projects, site, team, verticals, currentCast, tenureOf, stillOf, projectsByDate } from "../lib/data";
import { P } from "../lib/paths";
import f from "../frames/frames.module.css";
import s from "./pages.module.css";

export function Prologue({ id = "prologue" }) {
  const slot = useRef(null);
  useHeroSlot(slot);
  return (
    <Frame id={id} chapter="Prologue" label="Prologue" w={100} spot="0.7,0.5" edge="PROLOGUE">
      <div className={s.prologue}>
        <p className={s.letters} aria-hidden="true">
          DVM
        </p>
        <div className={s.heroCopy}>
          <p className={s.dept}>Department of</p>
          <h1 className={s.heroTitle}>
            Visual
            <br />
            Media
          </h1>
          <p className={s.lede}>We make the websites, apps and films for BITS Pilani's three fests: BOSM, Oasis and APOGEE.</p>
        </div>
        <div className={s.lampWell} aria-hidden="true">
          <svg className={s.lampReticle} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="98" />
            <circle cx="100" cy="100" r="84" />
            <path d="M100 -60v320M-120 100h440" />
          </svg>
          <span ref={slot} className={s.lampSlot} />
        </div>
        <p className={s.motto}>
          <span>Code.</span>
          <span>Design.</span>
          <span>Animate.</span>
        </p>
        <RollHint />
      </div>
    </Frame>
  );
}

function RollHint() {
  const bus = useBus();
  return (
    <button type="button" className={s.hint} onClick={() => bus.step(1)}>
      <span className={s.hintStrip} aria-hidden="true" />
      <span className={s.hintText}>
        <span className={s.hintDesk}>Scroll, drag or press → to roll the film</span>
        <span className={s.hintPhone}>Swipe up to roll the film</span>
      </span>
    </button>
  );
}

function AboutFrame() {
  const [lead, ...rest] = site.about;
  return (
    <Frame id="about-us" label="We are DVM" w={104} edge="WE ARE DVM">
      <div className={`${f.inner} ${s.about}`}>
        <h2 className={s.aboutHead}>{site.headline}</h2>
        <p className={s.aboutLead}>{lead}</p>
        <div className={s.aboutRest}>
          {rest.map((t) => (
            <p key={t.slice(0, 20)}>{t}</p>
          ))}
          <Link to={P("/about")} className={f.pill}>
            Roll the About reel
          </Link>
        </div>
      </div>
    </Frame>
  );
}

export function CrewsFrame({ id = "crews", w = 132 }) {
  return (
    <Frame id={id} label="Five crews" w={w} edge="FIVE CREWS">
      <div className={`${f.inner} ${s.crews}`}>
        <h2 className={s.crewsHead}>Five crews, one strip</h2>
        <ol className={s.crewList}>
          {verticals.map((v) => {
            const n = team.filter((m) => m.vertical === v.id).length;
            const recent = projectsByDate.filter((p) => p.verticals.includes(v.id)).slice(0, 2);
            return (
              <li key={v.id} className={s.crew}>
                <h3 className={s.crewName}>{v.label}</h3>
                <p className={s.crewText}>{v.description}</p>
                <p className={s.crewMeta}>{n} members on record</p>
                <ul className={s.crewWork}>
                  {recent.map((p) => (
                    <li key={p.slug}>
                      <Link to={P(`/projects/${p.slug}`)}>{p.title}</Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    </Frame>
  );
}

function AllWorkFrame() {
  const counts = [
    ["websites", projects.filter((p) => p.kind === "website").length],
    ["apps", projects.filter((p) => p.kind === "app").length],
    ["portals", projects.filter((p) => p.kind === "portal").length],
    ["films", projects.filter((p) => p.kind === "video").length],
  ];
  const strip = projectsByDate.filter((p) => stillOf(p)).slice(0, 10);
  return (
    <Frame id="all-work" label="All work" w={66} edge="ALL WORK">
      <div className={`${f.inner} ${s.allWork}`}>
        <ul className={s.contact} aria-hidden="true">
          {strip.map((p) => (
            <li key={p.slug}>
              <img src={stillOf(p)} alt="" loading="lazy" draggable={false} />
            </li>
          ))}
        </ul>
        <h2 className={s.allHead}>{projects.length} projects on the Work reel</h2>
        <p className={s.allText}>{counts.map(([k, n]) => `${n} ${k}`).join(", ")}, from {Math.min(...projects.filter((p) => p.year).map((p) => p.year))} to now.</p>
        <Link to={P("/projects")} className={f.pill}>
          Roll the Work reel
        </Link>
      </div>
    </Frame>
  );
}

function CastFrame() {
  const tenure = currentCast[0] ? tenureOf(currentCast[0].designation) : "";
  return (
    <Frame id="cast" label={`Cast ${tenure}`} w={118} edge="CAST">
      <div className={`${f.inner} ${s.castFrame}`}>
        <div className={s.castIntro}>
          <h2 className={s.castHead}>Starring</h2>
          <p className={s.castText}>The leads for {tenure}, out of {team.length} members on record since 2017.</p>
          <Link to={P("/team")} className={f.pill}>
            Meet the full cast
          </Link>
        </div>
        <CastGrid compact />
      </div>
    </Frame>
  );
}

function BlogsFrame() {
  return (
    <Frame id="blogs" label="From the journal" w={104} edge="JOURNAL">
      <div className={`${f.inner} ${s.blogs}`}>
        <div className={s.blogsHead}>
          <h2 className={s.sectionHead}>From the journal</h2>
          <Link to={P("/blog")} className={f.pill}>
            Roll the Journal reel
          </Link>
        </div>
        <div className={s.blogRow}>
          {featuredBlogs.map((bl) => (
            <BlogStill key={bl.slug} blog={bl} />
          ))}
        </div>
      </div>
    </Frame>
  );
}

function ArtFrame() {
  return (
    <Frame id="art" label="Artwork" w="auto" edge="ARTWORK">
      <div className={s.artRow}>
        <div className={s.artIntro}>
          <h2 className={s.sectionHead}>Artwork</h2>
          <p className={s.castText}>Renders, illustrations and UI shots from the design and video crews.</p>
          <Link to={P("/artwork")} className={f.pill}>
            Roll the Artwork reel
          </Link>
        </div>
        {journalArt.map((a) => (
          <ArtStill key={a.slug} art={a} />
        ))}
      </div>
    </Frame>
  );
}

export function CreditsFrame({ id = "credits-roll", w = 100 }) {
  return (
    <Frame id={id} label="End credits" w={w} edge="END CREDITS">
      <div className={`${f.inner} ${s.credits}`}>
        <CreditsRoll />
        <div className={s.creditsForm}>
          <h2 className={s.formHead}>Send us a message</h2>
          <p className={s.castText}>Questions about a fest, a project or joining DVM. We reply by email.</p>
          <ContactForm idPrefix={id} />
        </div>
      </div>
    </Frame>
  );
}

export function EndFrame({ id = "the-end" }) {
  const bus = useBus();
  return (
    <Frame id={id} label="The end" w={72} edge="THE END" spot="0.5,0.45">
      <div className={s.end}>
        <p className={s.endTitle}>The End</p>
        <p className={s.endText}>Everything above, and more, is on one wall in the archive.</p>
        <div className={s.endActions}>
          <Link to={P("/archive")} className={f.pill}>
            Open the contact sheet
          </Link>
          <button type="button" className={s.rewind} onClick={() => bus.go(0)}>
            Rewind to the start
          </button>
        </div>
      </div>
    </Frame>
  );
}

export default function Home() {
  const location = useLocation();
  const at = location.hash.slice(1) || location.state?.at || undefined;
  return (
    <Reel label="DVM, the full reel" at={at}>
      <Prologue />
      <ChapterCard id="about" n={1} title="About" line="Who we are, and the five crews behind every fest." />
      <AboutFrame />
      <CrewsFrame />
      <ChapterCard id="work" n={2} title="Work" line="Films we cut, sites we shipped. Rest on a film to preview it." />
      {featuredWork.map((p) => (
        <ProjectFrame key={p.slug} project={p} />
      ))}
      <AllWorkFrame />
      <ChapterCard id="legacy" n={3} title="Legacy" line="From the 2017 batch to now, in one long take." />
      <YearTake />
      <ChapterCard id="team" n={4} title="Team" line={`${team.length} people on record. These are this year's leads.`} />
      <CastFrame />
      <ChapterCard id="journal" n={5} title="Journal" line="What we wrote down and what we drew." />
      <BlogsFrame />
      <ArtFrame />
      <ChapterCard id="credits" n={6} title="Credits" line="Who made this, and how to reach them." />
      <CreditsFrame />
      <EndFrame />
    </Reel>
  );
}
