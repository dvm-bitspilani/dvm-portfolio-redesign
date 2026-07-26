import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./Team.module.css";
import twitter from "../assests/icons/twitter.png";
import behance from "../assests/icons/behance.png";
import github from "../assests/icons/github.png";
import insta from "../assests/icons/twitter.png";
import link from "../assests/icons/linkedin.png";
import dribble from "../assests/icons/dribble.svg";

// The full member roster, pasted directly from the data export. Each record
// already carries its own `team` (Frontend/AppDev/Video/Design/Backend) and
// `batch` (year) fields, so we don't need to reverse-engineer them from a
// folder name anymore.
import teamMembersRaw from "./TeamInfo.json";

gsap.registerPlugin(ScrollTrigger);

const DEPARTMENTS = ["Frontend", "AppDev", "Video", "Design", "Backend"];
const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

const SOCIAL_ICON = {
  twitter: twitter,
  github: github,
  dribble: dribble,
  insta: insta,
  behance: behance,
  linkedin: link,
};

// Eagerly import every photo under src/assests/members/{year}/{folder}/{name}.{ext}
// (Vite-specific: import.meta.glob). If you're on Create React App / webpack,
// swap this for require.context('../assests/members', true, /\.(jpe?g|png|webp|jfif)$/i)
// and adjust the path-parsing below to use module.keys() instead.
const memberImageModules = import.meta.glob(
  "../assests/members/*/*/*.{jpg,jpeg,png,JPG,JPEG,PNG,webp,WEBP,jfif,JFIF}",
  { eager: true, import: "default" }
);

// Build a lookup so a JSON record's PhotoLink (e.g.
// "./assets/members/2019/backend/anshal.jpeg") can be matched against
// whatever actually got bundled, regardless of extension/case differences.
// Key: "{year}/{folder}/{filename-without-extension, lowercased}"
const PHOTO_MODULE_LOOKUP = (() => {
  const lookup = {};
  Object.entries(memberImageModules).forEach(([path, src]) => {
    const match = path.match(/members\/(\d{4})\/([^/]+)\/([^/.]+)\.[a-zA-Z]+$/);
    if (!match) return;
    const [, year, folder, filename] = match;
    lookup[`${year}/${folder.toLowerCase()}/${filename.toLowerCase()}`] = src;
  });
  return lookup;
})();

function resolvePhoto(photoLink) {
  if (!photoLink) return null;
  const match = photoLink.match(/members\/(\d{4})\/([^/]+)\/([^/.]+)\.[a-zA-Z]+$/);
  if (match) {
    const [, year, folder, filename] = match;
    const key = `${year}/${folder.toLowerCase()}/${filename.toLowerCase()}`;
    if (PHOTO_MODULE_LOOKUP[key]) return PHOTO_MODULE_LOOKUP[key];
  }
  // Fall back to treating it as a public-folder path (e.g. served from
  // /public/assets/members/...) rather than a bundled src import.
  return photoLink.replace(/^\.\//, "/");
}

// Build { [deptLabel]: { [year]: members[] } } once, directly from the
// pasted JSON dataset — no folder-name guessing required.
const REAL_TEAM_DATA = (() => {
  const data = {};
  teamMembersRaw.forEach((record) => {
    const deptLabel = record.team;
    const year = record.batch;
    if (!DEPARTMENTS.includes(deptLabel)) return;
    if (!YEARS.includes(Number(year))) return;

    if (!data[deptLabel]) data[deptLabel] = {};
    if (!data[deptLabel][year]) data[deptLabel][year] = [];
    data[deptLabel][year].push({
      name: (record.name || "").trim(),
      designation: record.designation || "Team Member",
      PhotoLink: resolvePhoto(record.PhotoLink),
      TwitterLink: record.TwitterLink,
      GithubLink: record.GithubLink,
      DribbleLink: record.DribbleLink,
      InstagramLink: record.InstagramLink,
      BehanceLink: record.BehanceLink,
      LinkedInLink: record.LinkedInLink,
    });
  });
  // Deterministic, alphabetical order within each year.
  Object.values(data).forEach((byYear) => {
    Object.values(byYear).forEach((members) =>
      members.sort((a, b) => a.name.localeCompare(b.name))
    );
  });
  return data;
})();

// ---- component ---------------------------------------------------------------

export default function TeamPage() {
  const [activeDept, setActiveDept] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageReady, setPageReady] = useState(false);
  const [teamData, setTeamData] = useState({}); // { [deptIndex]: { [year]: members[] } }

  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const heroBgRef = useRef(null);
  const heroTitleRef = useRef(null);
  const filterWrapRef = useRef(null);
  const pillRef = useRef(null);
  const tabRefs = useRef([]);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const statRef = useRef(null);

  // Page renders immediately — no preloader/entrance animation, no boot delay.
  useLayoutEffect(() => {
    setPageReady(true);
  }, []);

  // ---- scroll progress bar (whole document) ----
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(progressRef.current, { scaleX: 0, transformOrigin: "left center" });
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => gsap.set(progressRef.current, { scaleX: self.progress }),
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  // ---- sticky filter bar shrink state ----
  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: filterWrapRef.current,
        start: "top top+=1",
        end: 99999,
        toggleClass: { targets: filterWrapRef.current, className: styles.isStuck },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  // ---- animated pill under active tab ----
  useLayoutEffect(() => {
    const btn = tabRefs.current[activeDept];
    if (!btn || !pillRef.current) return;
    const { offsetLeft, offsetWidth } = btn;
    gsap.to(pillRef.current, { x: offsetLeft, width: offsetWidth, duration: 0.45, ease: "power3.out" });
  }, [activeDept, pageReady]);

  // ---- load team data (from the JSON dataset) whenever department changes ----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      if (teamData[activeDept]) {
        setLoading(false);
        return;
      }
      // Small delay purely so the skeleton placeholder is visible on switch.
      await new Promise((r) => setTimeout(r, 350));
      if (cancelled) return;

      const deptLabel = DEPARTMENTS[activeDept];
      const byYear = REAL_TEAM_DATA[deptLabel] || {};
      setTeamData((prev) => ({ ...prev, [activeDept]: byYear }));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeDept]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- department change: instant, no swipe/wipe cover ----
  const changeDept = (i) => {
    if (i === activeDept) return;
    setActiveDept(i);
  };

  // ---- member count-up stat ----
  useEffect(() => {
    if (loading || !statRef.current) return;
    const currentYearData = teamData[activeDept] || {};
    const total = YEARS.reduce((sum, y) => sum + (currentYearData[y] || []).length, 0);
    const obj = { n: 0 };
    gsap.to(obj, {
      n: total,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => {
        if (statRef.current) statRef.current.textContent = Math.round(obj.n);
      },
    });
  }, [loading, activeDept, teamData]);

  // ---- scroll reveal: year headings, ghost numerals, alternating card entrances ----
  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray(`.${styles.teamYearBlock}`).forEach((block) => {
        const heading = block.querySelector(`.${styles.teamYearHeading}`);
        const ghost = block.querySelector(`.${styles.ghostYear}`);
        const cards = block.querySelectorAll(`.${styles.memberCard}`);

        gsap.fromTo(
          heading,
          { opacity: 0, x: -24 },
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: { trigger: block, start: "top 85%" },
          }
        );

        if (ghost) {
          gsap.fromTo(
            ghost,
            { opacity: 0 },
            {
              opacity: 1,
              duration: 1,
              scrollTrigger: { trigger: block, start: "top 85%" },
            }
          );
          gsap.to(ghost, {
            yPercent: -22,
            ease: "none",
            scrollTrigger: { trigger: block, start: "top bottom", end: "bottom top", scrub: true },
          });
        }

        cards.forEach((card) => {
          gsap.fromTo(
            card,
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: "power3.out",
              scrollTrigger: { trigger: card, start: "top 92%" },
            }
          );
        });
      });
      ScrollTrigger.refresh();
    }, containerRef);
    return () => ctx.revert();
  }, [loading, activeDept, teamData]);

  const scrollToTeam = () => filterWrapRef.current?.scrollIntoView({ behavior: "smooth" });
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const currentYearData = teamData[activeDept] || {};
  const hasAnyMembers = YEARS.some((y) => (currentYearData[y] || []).length > 0);

  return (
    <div className={styles.teamPage} ref={rootRef}>
      <div className={styles.progressBar} ref={progressRef} />

      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.hero} ref={heroRef}>
        <div className={styles.heroBg} ref={heroBgRef} />
        <div className={styles.heroOverlay} />

        <div className={styles.heroReadout} aria-hidden="true">
          <span>{DEPARTMENTS.length} depts</span>
          <span className={styles.heroReadoutDivider} />
          <span>{YEARS[0]}–{YEARS[YEARS.length - 1]}</span>
        </div>

        <div className={styles.heroInner}>

          <h1 className={styles.heroTitle} ref={heroTitleRef} aria-label="The Team">
            {"WE ARE DVM".split("").map((ch, i) => (
              <span className={styles.heroLetterWrap} key={i}>
                <span className={styles.heroLetter}>{ch === " " ? "\u00A0" : ch}</span>
              </span>
            ))}
          </h1>

        </div>
        <button className={styles.scrollCue} onClick={scrollToTeam} aria-label="Scroll to team">
          <span className={styles.scrollCueLine} />
          <span>scroll</span>
        </button>
      </header>

      <section className={styles.teamSection} ref={containerRef}>
        <div className={styles.filterWrap} ref={filterWrapRef}>
          <div className={styles.filterTerminal}>
            <div className={styles.terminalDots} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <div className={styles.deptTabs} role="tablist">
              <div className={styles.deptPill} ref={pillRef} />
              {DEPARTMENTS.map((dept, i) => (
                <button
                  key={dept}
                  ref={(el) => (tabRefs.current[i] = el)}
                  role="tab"
                  aria-selected={activeDept === i}
                  className={`${styles.deptTab} ${activeDept === i ? styles.active : ""}`}
                  onClick={() => changeDept(i)}
                >
                  {dept.toLowerCase()}
                </button>
              ))}
            </div>

            <span className={styles.statLine}>
              <span className={styles.statNumber} ref={statRef}>0</span> on record
            </span>
          </div>

          <select
            className={styles.deptSelectMobile}
            value={activeDept}
            onChange={(e) => changeDept(Number(e.target.value))}
            aria-label="Select department"
          >
            {DEPARTMENTS.map((dept, i) => (
              <option key={dept} value={i}>{dept}</option>
            ))}
          </select>
        </div>

        <div className={styles.teamContainer}>
          {loading && <SkeletonYear />}

          {!loading && !hasAnyMembers && (
            <p className={styles.errorMessage}>no members on record for this department yet.</p>
          )}

          {!loading &&
            hasAnyMembers &&
            YEARS.map((year) => {
              const members = currentYearData[year] || [];
              if (members.length === 0) return null;
              return (
                <div className={styles.teamYearBlock} key={year}>
                  <span className={styles.ghostYear} aria-hidden="true">{year}</span>
                  <h2 className={styles.teamYearHeading}>
                    <span className={styles.yearTick} />
                    {year}
                  </h2>
                  <div className={styles.teamMembersGrid}>
                    {members.map((m, idx) => (
                      <MemberCard member={m} key={`${year}-${idx}`} />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      <button className={styles.backToTop} onClick={scrollToTop} aria-label="Back to top">
        <span className={`${styles.crossLine} ${styles.crossLineV}`} />
        <span className={`${styles.crossLine} ${styles.crossLineH}`} />
      </button>
    </div>
  );
}

function MemberCard({ member }) {
  const links = [
    ["TwitterLink", "twitter"],
    ["GithubLink", "github"],
    ["DribbleLink", "dribble"],
    ["InstagramLink", "insta"],
    ["BehanceLink", "behance"],
    ["LinkedInLink", "linkedin"],
  ];

  return (
    <div className={styles.memberCard}>
      <div className={styles.memberCardInner}>
        <div className={styles.memberImage}>
          {member.PhotoLink ? (
            <img src={member.PhotoLink} alt={member.name} loading="lazy" />
          ) : (
            <div className={styles.memberImagePlaceholder} aria-hidden="true">
              {member.name?.charAt(0)}
            </div>
          )}
        </div>
        <div className={styles.memberName}>{member.name}</div>
        <div className={styles.memberDesignation}>{member.designation || "Team Member"}</div>
        <div className={styles.memberLinks}>
          {links.map(([key, icon]) =>
            member[key] ? (
              <a href={member[key]} target="_blank" rel="noreferrer" key={key} className={styles.memberLink}>
                <img src={SOCIAL_ICON[icon]} alt={icon} />
              </a>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonYear() {
  return (
    <>
      <div className={styles.placeholderHeading} />
      <div className={styles.teamMembersGrid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div className={styles.memberPlaceholder} key={i}>
            <div className={styles.placeholderImg} />
            <div className={styles.placeholderLine} />
            <div className={`${styles.placeholderLine} ${styles.short}`} />
          </div>
        ))}
      </div>
    </>
  );
}