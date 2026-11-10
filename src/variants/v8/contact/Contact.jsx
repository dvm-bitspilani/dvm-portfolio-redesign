// Contact, the last part of the home page (and the /contactus page): the hologram printed as
// text beside the terminal form, then the footer. The ASCII mark is flat and 2D (no CRT, no
// WebGL context); it prints when the section is 40% in view, tears when a send fails and
// prints again when one succeeds.
import { useId, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { AsciiLogo } from "../../../immersive/kit/ascii";
import { site, socials } from "../../../immersive/data";
import { isModifiedClick } from "../lib/events";
import { P } from "../lib/paths";
import { socialLabel } from "../lib/socials";
import { useOnceNear, useReducedMotion } from "../lib/hooks";
import { useReveal } from "../lib/reveal";
import Terminal from "./Terminal";
import ui from "../ui.module.css";
import s from "./contact.module.css";

const SITE_LINKS = [
  { label: "About", to: "/about" },
  { label: "Projects", to: "/projects" },
  { label: "Team", to: "/team" },
  { label: "Alumni", to: "/alumni" },
  { label: "Blog", to: "/blog" },
  { label: "Artwork", to: "/artwork" },
  { label: "Archive", to: "/archive" },
  { label: "Contact", to: "/contactus" },
];

const HEART = "M12 21 2 11V6l4-4h3.5L12 4.5 14.5 2H18l4 4v5Z";

/** The credit's heart, drawn like the mark's print: faceted (the mark is chevrons, so a round heart
 *  would be the page's only soft shape), the print's teal gradient, its hairline edge. */
function Heart() {
  const id = `v8-heart-${useId().replace(/:/g, "")}`;
  return (
    <>
      <svg className={s.heart} viewBox="0 0 24 22" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8df0ff" />
            <stop offset=".55" stopColor="#45e6ff" />
            <stop offset="1" stopColor="#2cb8d6" />
          </linearGradient>
        </defs>
        <path d={HEART} fill={`url(#${id})`} />
        <path d={HEART} className={s.heartEdge} />
      </svg>
      <span className={ui.srOnly}>love</span>
    </>
  );
}

/** "Made with ❤️ by DVM": the data keeps the words; the emoji becomes the drawn heart and "DVM"
 *  links home (on the home page, back to the top, like the lockup). */
function Credit({ text }) {
  const { pathname } = useLocation();
  const parts = text.split(/❤️|❤/);
  if (parts.length < 2) return <p className={s.made}>{text}</p>;
  const [before, after] = [parts[0], parts.slice(1).join("")];
  const m = after.match(/^(.*?)\bDVM\b(.*)$/s);
  const toTop = (e) => {
    if (isModifiedClick(e) || pathname.replace(/\/$/, "") !== P("/")) return;
    e.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };
  return (
    <p className={s.made}>
      {before}
      <Heart />
      {m ? (
        <>
          {m[1]}
          <Link to={P("/")} className={`${s.footLink} ${s.madeLink}`} onClick={toTop}>
            DVM
          </Link>
          {m[2]}
        </>
      ) : (
        after
      )}
    </p>
  );
}

function Footer() {
  return (
    <div className={s.footer} role="contentinfo">
      <p className={s.endWord} aria-hidden="true">
        DVM
      </p>
      <nav className={s.siteLinks} aria-label="Footer">
        <ul>
          {SITE_LINKS.map((l) => (
            <li key={l.to}>
              <Link to={P(l.to)} className={s.footLink}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <ul className={s.socials}>
        {socials.map((x) => (
          <li key={x.id}>
            <a href={x.url} target="_blank" rel="noreferrer" className={s.footLink}>
              {socialLabel(x)} ↗
            </a>
          </li>
        ))}
      </ul>
      <p className={s.legal}>
        {site.fullName}, {site.institution}
      </p>
      <Credit text={site.taglines.footer} />
    </div>
  );
}

export default function Contact({ id = "contact", page = false, headingLevel = 2 }) {
  const ref = useRef(null);
  const asciiRef = useRef(null);
  useReveal(ref);
  const reduced = useReducedMotion();
  const near = useOnceNear(ref, page ? "0px" : "0px 0px -40% 0px");
  const H = `h${headingLevel}`;

  return (
    <section ref={ref} id={id} className={`${ui.sec} ${s.contact} ${page ? s.page : ""}`} data-light="28% 50% 36vw" data-chapter={page ? undefined : "Contact"} aria-labelledby={`${id}-title`}>
      <div className={ui.wrap}>
        <div className={ui.secHead}>
          <H id={`${id}-title`} className={page ? ui.h1 : ui.h2} data-reveal="head">
            Contact
          </H>
        </div>

        <div className={s.rig}>
          <div className={`${ui.panel} ${s.ascii}`} aria-hidden="true">
            {near && (
              <AsciiLogo
                ref={asciiRef}
                palette="teal"
                transparent
                crt={false}
                renderer="2d"
                autoRotate={reduced ? false : "sway"}
                reveal="print"
                revealDuration={1.4}
                scale={0.8}
                probe={false}
                caption={false}
              />
            )}
          </div>
          <Terminal onFail={() => asciiRef.current?.glitch(0.6)} onSent={() => asciiRef.current?.replay()} />
        </div>

        <Footer />
      </div>
    </section>
  );
}
