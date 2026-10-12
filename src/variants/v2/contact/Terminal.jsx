// Contact as a terminal session: the DVM mark spins on a CRT in ASCII (kit/ascii)
// next to a shell-styled form. Same fields + web3forms endpoint as the base page;
// validation and delivery are reported as terminal output instead of alert().
import { useEffect, useRef, useState } from "react";
import { AsciiLogo } from "../../../immersive/kit/ascii";
import { useNear, useReducedMotion } from "../lib/hooks";
import "@fontsource-variable/jetbrains-mono";
import s from "./terminal.module.css";

const NAME_REGEX = /^(\w|\s)\D+$/;
const PHONE_REGEX = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
const EMAIL_REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/i;
const WEB3FORMS_ACCESS_KEY = "16d050c0-9c1e-49f1-bc6b-4e19f97587b3";
const FALLBACK_MAIL = "admin@bits-dvm.org";

const BOOT = [
  { t: "DVM terminal, BITS Pilani", c: "dim" },
  { t: "Websites, apps and films for BOSM, Oasis and APOGEE.", c: "dim" },
  { t: "Write to us and a human from the department answers.", c: "dim" },
];

export default function Terminal({ id, page = false, headingLevel = 2 }) {
  const rootRef = useRef(null);
  const formRef = useRef(null);
  const logRef = useRef(null);
  const near = useNear(rootRef, page ? "0px" : "-30% 0px");
  const reduced = useReducedMotion();
  const asciiRef = useRef(null);
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const H = `h${headingLevel}`;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const print = (lines) => setLog((l) => [...l, ...lines].slice(-14));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(formRef.current);
    const name = String(f.get("name") || "").trim();
    const email = String(f.get("email") || "").trim();
    const number = String(f.get("number") || "").trim();
    const message = String(f.get("message") || "").trim();
    const errs = [];
    if (!NAME_REGEX.test(name)) errs.push({ t: "name: letters and spaces only, please.", c: "err" });
    if (!EMAIL_REGEX.test(email)) errs.push({ t: "email: that doesn't look like an address.", c: "err" });
    if (!PHONE_REGEX.test(number)) errs.push({ t: "phone: use a 10-digit number, with an optional +91.", c: "err" });
    if (!message) errs.push({ t: "message: write a line or two first.", c: "err" });
    print([{ t: `$ contact --send --from "${name || "anonymous"}"`, c: "cmd" }]);
    if (errs.length) {
      print([...errs, { t: "Nothing was sent. Fix the fields above and press Send again.", c: "dim" }]);
      asciiRef.current?.glitch(0.6);
      return;
    }
    setBusy(true);
    print([{ t: "sending…", c: "dim" }]);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, number, message, access_key: WEB3FORMS_ACCESS_KEY }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 200) {
        print([{ t: "Sent. We'll reply to " + email + ".", c: "ok" }]);
        formRef.current.reset();
        asciiRef.current?.replay();
      } else {
        print([{ t: `The form service said: ${json.message || res.status}`, c: "err" }, { t: `You can also mail ${FALLBACK_MAIL}.`, c: "dim" }]);
      }
    } catch {
      print([{ t: `Couldn't reach the form service. Mail ${FALLBACK_MAIL} instead.`, c: "err" }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section ref={rootRef} id={id} className={`${s.wrap} ${page ? s.page : ""}`} aria-labelledby={`${id || "contact"}-title`}>
      <div className={s.grid} aria-hidden="true" />
      <div className={s.head}>
        <H id={`${id || "contact"}-title`} className={s.headFill}>Contact us</H>
        <span className={s.headOutline} aria-hidden="true">Contact us</span>
      </div>

      <div className={s.rig}>
        <div className={s.crt} aria-hidden="true">
          {near ? (
            <AsciiLogo
              ref={asciiRef}
              palette="teal"
              bezel
              autoRotate={reduced ? false : "sway"}
              reveal="print"
              revealDuration={1.4}
              caption
              scale={0.74}
            />
          ) : (
            <div className={s.crtIdle} />
          )}
        </div>

        <div className={s.term}>
          <div className={s.titlebar}>
            <span className={s.dots} aria-hidden="true"><i /><i /><i /></span>
            <span>dvm@bits-pilani: ~/contact</span>
          </div>
          <div className={s.body}>
            <div className={s.log} ref={logRef} aria-live="polite">
              {BOOT.map((l) => (
                <p key={l.t} className={s[l.c]}>{l.t}</p>
              ))}
              {log.map((l, i) => (
                <p key={i} className={s[l.c]}>{l.t}</p>
              ))}
            </div>
            <form ref={formRef} className={s.form} onSubmit={onSubmit} noValidate>
              <label className={s.row}>
                <span className={s.prompt}>name</span>
                <input name="name" type="text" autoComplete="name" placeholder="Your name" />
              </label>
              <label className={s.row}>
                <span className={s.prompt}>email</span>
                <input name="email" type="email" autoComplete="email" placeholder="you@example.com" />
              </label>
              <label className={s.row}>
                <span className={s.prompt}>phone</span>
                <input name="number" type="tel" autoComplete="tel" placeholder="+91 98765 43210" />
              </label>
              <label className={`${s.row} ${s.rowTall}`}>
                <span className={s.prompt}>message</span>
                <textarea name="message" rows={4} placeholder="What are you building?" />
              </label>
              <div className={s.actions}>
                <button type="submit" className={s.send} disabled={busy}>
                  {busy ? "Sending…" : "Send"}
                  <kbd aria-hidden="true">↵</kbd>
                </button>
                <span className={s.alt}>or mail <a href={`mailto:${FALLBACK_MAIL}`}>{FALLBACK_MAIL}</a></span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
