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

// Maps the on-disk folder name (under src/assests/members/{year}/{folder})
// to the department label used everywhere else in this component.
const FOLDER_TO_DEPT_LABEL = {
  frontend: "Frontend",
  app: "AppDev",
  video: "Video",
  ui: "Design",
  backend: "Backend",
};

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Eagerly import every photo under src/assests/members/{year}/{team}/{name}.{ext}
// (Vite-specific: import.meta.glob). If you're on Create React App / webpack,
// swap this for require.context('../assests/members', true, /\.(jpe?g|png)$/i)
// and adjust the path-parsing below to use module.keys() instead.
const memberImageModules = import.meta.glob(
  "../assests/members/*/*/*.{jpg,jpeg,png,JPG,JPEG,PNG}",
  { eager: true, import: "default" }
);

// Build { [deptLabel]: { [year]: members[] } } once, from the real folders.
const REAL_TEAM_DATA = (() => {
  const data = {};
  Object.entries(memberImageModules).forEach(([path, src]) => {
    const match = path.match(/members\/(\d{4})\/([^/]+)\/([^/]+)\.[a-zA-Z]+$/);
    if (!match) return;
    const [, year, folder, filename] = match;
    const deptLabel = FOLDER_TO_DEPT_LABEL[folder];
    if (!deptLabel) return;

    const name = capitalizeFirst(filename);

    if (!data[deptLabel]) data[deptLabel] = {};
    if (!data[deptLabel][year]) data[deptLabel][year] = [];
    data[deptLabel][year].push({
      name,
      designation: "Team Member",
      PhotoLink: src,
      TwitterLink: "#",
      GithubLink: null,
      DribbleLink: null,
      InstagramLink: null,
      BehanceLink: null,
      LinkedInLink: null,
    });
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
  const cursorRef = useRef(null);
  const preloaderRef = useRef(null);
  const progressRef = useRef(null);
  const statRef = useRef(null);

  // ---- landing sequence: preloader -> hero reveal (page-load only, no scroll tie-in) ----
  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set(preloaderRef.current, { display: "none" });
        gsap.set(
          [
            `.${styles.heroLetter}`,
            `.${styles.heroEyebrow}`,
            `.${styles.heroSub}`,
            `.${styles.scrollCue}`,
            `.${styles.heroReadout}`,
          ],
          { opacity: 1, x: 0, y: 0, yPercent: 0, rotate: 0 }
        );
        gsap.set(`.${styles.heroEyebrowLine}`, { scaleX: 1 });
        setPageReady(true);
        return;
      }

      // starting states for everything the landing sequence will animate in
      gsap.set(heroBgRef.current, { scale: 1.22, filter: "grayscale(100%) brightness(0.3)" });
      gsap.set(`.${styles.heroEyebrow}`, { opacity: 0, y: 10 });
      gsap.set(`.${styles.heroEyebrowLine}`, { scaleX: 0 });
      gsap.set(`.${styles.heroLetter}`, { yPercent: 120, opacity: 0, rotate: 4 });
      gsap.set(`.${styles.heroSub}`, { opacity: 0, y: 14 });
      gsap.set(`.${styles.scrollCue}`, { opacity: 0 });
      gsap.set(`.${styles.heroReadout}`, { opacity: 0, x: 10 });

      const boot = gsap.timeline();
      boot
        .to(`.${styles.preloaderLine}`, {
          opacity: 1,
          stagger: 0.12,
          duration: 0.4,
          ease: "power2.out",
        })
        .to(`.${styles.preloaderLine}`, { opacity: 0.3, duration: 0.3, delay: 0.3 })
        .to(preloaderRef.current, { yPercent: -100, duration: 0.8, ease: "power4.inOut" })
        .set(preloaderRef.current, { display: "none" });

      // hero lands as the preloader clears, then settles
      const land = gsap.timeline({ delay: 1.35, onComplete: () => setPageReady(true) });
      land
        .to(heroBgRef.current, {
          scale: 1,
          filter: "grayscale(100%) brightness(0.55)",
          duration: 1.8,
          ease: "power3.out",
        }, 0)
        .to(`.${styles.heroEyebrow}`, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.15)
        .to(`.${styles.heroEyebrowLine}`, { scaleX: 1, duration: 0.7, ease: "power3.inOut" }, 0.28)
        .to(`.${styles.heroReadout}`, { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" }, 0.3)
        .to(`.${styles.heroLetter}`, {
          yPercent: 0,
          opacity: 1,
          rotate: 0,
          duration: 1.1,
          stagger: 0.028,
          ease: "power4.out",
        }, 0.32)
        .to(`.${styles.heroSub}`, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 0.95)
        .to(`.${styles.scrollCue}`, { opacity: 1, duration: 0.6 }, 1.2);

      // quiet ambient life once landed — time-based, never scroll-linked
      gsap.to(heroBgRef.current, {
        scale: 1.06,
        duration: 16,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 3.2,
      });
    }, rootRef);

    return () => ctx.revert();
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

  // ---- load team data (real local photos) whenever department changes ----
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

  // ---- custom cursor: simple follow, no card tilt/magnetic interaction ----
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (prefersReduced || isTouch) return;

    const cursor = cursorRef.current;
    const move = (e) => gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15 });
    window.addEventListener("mousemove", move);

    return () => {
      window.removeEventListener("mousemove", move);
    };
  }, []);

  const scrollToTeam = () => filterWrapRef.current?.scrollIntoView({ behavior: "smooth" });
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const currentYearData = teamData[activeDept] || {};
  const hasAnyMembers = YEARS.some((y) => (currentYearData[y] || []).length > 0);

  return (
    <div className={styles.teamPage} ref={rootRef}>
      <div className={styles.progressBar} ref={progressRef} />

      <div className={styles.preloader} ref={preloaderRef}>
        <div className={styles.preloaderLine}>fetching team</div>
      </div>

      <div className={styles.cursorDot} ref={cursorRef} />
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
          <img src={member.PhotoLink} alt={member.name} loading="lazy" />
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