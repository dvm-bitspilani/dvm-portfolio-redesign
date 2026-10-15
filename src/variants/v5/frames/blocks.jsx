// Larger frame contents used by more than one reel.
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Frame } from "../reel/Reel";
import { useBus, useWatch } from "../reel/context";
import { VERTICAL_NAME, currentCast, fests, leaders, site, socials, stillOf, tenureOf, verticals, yearTake } from "../lib/data";
import { P } from "../lib/paths";
import f from "./frames.module.css";
import b from "./blocks.module.css";

/* ------------------------------------------------------------------ the long take */
const ROWS = 8;

/** Legacy as one continuous shot: the years run left to right under a ruler. */
export function YearTake({ id = "years", full = false, chapter }) {
  const years = yearTake();
  const ref = useRef(null);
  const cols = useRef([]);
  const bus = useBus();
  // the year under the gate's centre line lights up (offsets cached per gate size)
  const cache = useRef({ key: "", spans: [] });
  useWatch(ref, ({ left, size }) => {
    const native = bus.mode === "native";
    const key = `${size}:${native}`;
    if (cache.current.key !== key) {
      cache.current = {
        key,
        spans: cols.current.map((el) => (el ? (native ? [el.offsetTop, el.offsetHeight] : [el.offsetLeft, el.offsetWidth]) : [0, 0])),
      };
    }
    const mid = size / 2;
    cols.current.forEach((el, i) => {
      if (!el) return;
      const [o, w] = cache.current.spans[i];
      const on = mid >= o + left && mid < o + left + w;
      if (on !== el.hasAttribute("data-on")) el.toggleAttribute("data-on", on);
    });
  });
  const max = full ? 99 : 5;
  return (
    <Frame id={id} chapter={chapter} label="Year by year" w="auto" edge="LONG TAKE" frameRef={ref} gateClass={b.takeGate}>
      <div className={b.take}>
        <div className={b.takeIntro}>
          <h3 className={b.takeTitle}>Year by year</h3>
          <p className={b.takeText}>
            One continuous shot from {years[0].year} to {years[years.length - 1].year}: what shipped each year and who joined the crew.
          </p>
          {!full && (
            <Link to={P("/legacy")} className={f.pill}>
              Roll the Legacy reel
            </Link>
          )}
        </div>
        {years.map((y, i) => (
          <section
            key={y.year}
            ref={(el) => (cols.current[i] = el)}
            className={b.year}
            aria-label={String(y.year)}
            style={{ "--cols": Math.max(1, Math.ceil(Math.min(y.shipped.length, max) / ROWS)), "--rows": Math.min(ROWS, Math.max(1, y.shipped.length)) }}
          >
            <h4 className={b.yearNum}>{y.year}</h4>
            <div className={b.yearBody}>
              {y.shipped.length > 0 ? (
                <ul className={b.shipped}>
                  {y.shipped.slice(0, max).map((p) => (
                    <li key={p.slug}>
                      <Link to={P(`/projects/${p.slug}`)} className={b.shipLink}>
                        {stillOf(p) && <img src={stillOf(p)} alt="" loading="lazy" draggable={false} />}
                        <span>{p.title}</span>
                      </Link>
                    </li>
                  ))}
                  {y.shipped.length > max && <li className={b.more}>and {y.shipped.length - max} more</li>}
                </ul>
              ) : (
                <p className={b.quiet}>Nothing archived from this year yet.</p>
              )}
              {y.joined.length > 0 && (
                <div className={b.joined}>
                  <p>
                    {y.joined.length} joined DVM
                  </p>
                  <ul className={b.faces}>
                    {y.joined.slice(0, full ? 12 : 7).map((m) => (
                      <li key={m.slug}>
                        <img src={m.photo} alt={m.name} title={m.name} loading="lazy" draggable={false} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        ))}
        <div className={b.ruler} aria-hidden="true" />
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ cast */
export function CastGrid({ people = currentCast, compact = false }) {
  return (
    <ul className={`${b.cast} ${compact ? b.castCompact : ""}`}>
      {people.map((m) => (
        <li key={m.slug} className={b.castItem}>
          <div className={b.castPhoto}>
            <img src={m.photo} alt="" loading="lazy" draggable={false} />
          </div>
          <p className={b.castName}>{m.name}</p>
          <p className={b.castRole}>{m.designation || VERTICAL_NAME[m.vertical]}</p>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ end credits */
export function CreditsRoll({ rolling = true }) {
  const bus = useBus();
  const latest = currentCast[0] ? tenureOf(currentCast[0].designation) : "";
  const blocks = [
    { role: "A production of", names: [site.fullName, site.institution] },
    { role: "For", names: fests.map((x) => x.name) },
    ...verticals.map((v) => ({ role: v.label, names: [v.name] })),
    { role: `Leads ${latest}`, names: currentCast.map((m) => `${m.name}, ${m.designation.replace(/\s*20\d\d.*$/, "")}`) },
    { role: "Projects heads", names: leaders.filter((m) => /project/i.test(m.designation)).map((m) => `${m.name} (${tenureOf(m.designation)})`) },
    { role: "Find us", names: socials.map((s) => s.label) },
    { role: "Write to", names: [site.contact.email] },
  ];
  return (
    <div className={`${b.roll} ${rolling ? b.rolling : ""}`} data-reel-native={bus.reduced || !rolling ? "" : undefined}>
      <div className={b.rollTrack}>
        {[0, 1].map((copy) => (
          <dl key={copy} className={b.rollList} aria-hidden={copy ? "true" : undefined}>
            {blocks.map((bl) => (
              <div key={bl.role} className={b.rollRow}>
                <dt>{bl.role}</dt>
                <dd>
                  {bl.names.map((n) => (
                    <span key={n}>{n}</span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ contact form */
const NAME_REGEX = /^(\w|\s)\D+$/;
const PHONE_REGEX = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
const EMAIL_REGEX = /^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/i;
const WEB3FORMS_ACCESS_KEY = "16d050c0-9c1e-49f1-bc6b-4e19f97587b3";

/** Posts to the same web3forms endpoint as the original contact page. */
export function ContactForm({ idPrefix = "c" }) {
  const [status, setStatus] = useState({ state: "idle", text: "" });
  const [bad, setBad] = useState({});
  const formRef = useRef(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const number = String(fd.get("number") || "").trim();
    const message = String(fd.get("message") || "").trim();
    const errors = {};
    if (!NAME_REGEX.test(name)) errors.name = "Enter your name.";
    if (!EMAIL_REGEX.test(email)) errors.email = "Enter an email we can reply to.";
    if (!PHONE_REGEX.test(number)) errors.number = "Enter a 10-digit phone number.";
    if (!message) errors.message = "Write a message.";
    setBad(errors);
    if (Object.keys(errors).length) {
      setStatus({ state: "error", text: "Check the highlighted fields." });
      formRef.current?.querySelector(`[name="${Object.keys(errors)[0]}"]`)?.focus();
      return;
    }
    setStatus({ state: "sending", text: "Sending…" });
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, number, message, access_key: WEB3FORMS_ACCESS_KEY }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 200) {
        setStatus({ state: "sent", text: "Message sent. We will write back to you soon." });
        formRef.current?.reset();
      } else {
        setStatus({ state: "error", text: json.message || `The form could not be sent. Mail ${site.contact.email} instead.` });
      }
    } catch {
      setStatus({ state: "error", text: `The form could not be sent. Mail ${site.contact.email} instead.` });
    }
  };

  const field = (name, label, props) => (
    <label className={b.field} data-bad={bad[name] ? "" : undefined}>
      <span className={b.fieldLabel}>{label}</span>
      {props.as === "textarea" ? (
        <textarea name={name} rows={4} data-reel-native="" aria-invalid={!!bad[name]} aria-describedby={bad[name] ? `${idPrefix}-${name}-err` : undefined} />
      ) : (
        <input name={name} {...props} aria-invalid={!!bad[name]} aria-describedby={bad[name] ? `${idPrefix}-${name}-err` : undefined} />
      )}
      {bad[name] && (
        <span id={`${idPrefix}-${name}-err`} className={b.fieldErr}>
          {bad[name]}
        </span>
      )}
    </label>
  );

  return (
    <form ref={formRef} className={b.form} onSubmit={onSubmit} noValidate>
      {field("name", "Your name", { type: "text", autoComplete: "name" })}
      {field("email", "Email", { type: "email", autoComplete: "email" })}
      {field("number", "Phone", { type: "tel", autoComplete: "tel" })}
      {field("message", "Message", { as: "textarea" })}
      <div className={b.formFoot}>
        <button type="submit" className={b.send} disabled={status.state === "sending"}>
          {status.state === "sending" ? "Sending" : "Send message"}
        </button>
        <p className={b.status} data-state={status.state} role="status" aria-live="polite">
          {status.text}
        </p>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ journal */
export function BlogStill({ blog }) {
  return (
    <article className={b.blog}>
      <a href={blog.url} target="_blank" rel="noreferrer" className={b.blogLink}>
        <div className={b.blogCover}>
          <img src={blog.cover} alt="" loading="lazy" draggable={false} />
        </div>
        <p className={b.blogMeta}>
          <span>{blog.date}</span>
          <span>{blog.readMinutes} min read</span>
          <span>{blog.platform}</span>
        </p>
        <h3 className={b.blogTitle}>{blog.shortTitle || blog.title}</h3>
        <p className={b.blogBy}>{blog.authors.join(" and ")}</p>
      </a>
    </article>
  );
}

export function ArtStill({ art, tall = false }) {
  return (
    <figure className={`${b.art} ${tall ? b.artTall : ""}`}>
      <div className={b.artImg}>
        <img src={art.image} alt={art.title} loading="lazy" draggable={false} />
      </div>
      <figcaption className={b.artCap}>
        <span className={b.artTitle}>{art.title}</span>
        <span className={b.artBy}>
          {art.artist}, {art.year}
        </span>
      </figcaption>
    </figure>
  );
}
