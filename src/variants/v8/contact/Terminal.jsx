// The contact form as a terminal session (the right half of contact/Contact.jsx). Same fields
// and web3forms endpoint as the base page; validation and delivery are reported as terminal
// output instead of alert(), and each invalid field is marked (aria-invalid, its message tied to
// it, focus on the first one). `onFail` (invalid fields, a refused or failed send) and `onSent`
// let the ASCII mark next to it react.
import { useEffect, useRef, useState } from "react";
import ui from "../ui.module.css";
import s from "./terminal.module.css";

const WEB3FORMS_ACCESS_KEY = "16d050c0-9c1e-49f1-bc6b-4e19f97587b3";
const FALLBACK_MAIL = "admin@bits-dvm.org";
/** A send that has not answered by then is reported as failed. */
const SEND_TIMEOUT_MS = 15000;

const BOOT = { t: "Write to us and a person from the department answers.", c: "dim" };

/* Validation: any script's letters in a name, a real-looking address, a phone number in any of the
   usual groupings (spaces, dots, dashes, brackets) with an optional country code. */
const NAME_RE = /^\p{L}[\p{L}\p{M}'’. -]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(\+\d{1,3})?\d{10}$/;
const FIELDS = ["name", "email", "number", "message"];

/** Field → message for every invalid field (empty when the draft can be sent). */
function validate({ name, email, number, message }, emailInput) {
  const errs = {};
  if (!name || name.length > 80 || !NAME_RE.test(name)) errs.name = "name: letters, spaces, hyphens or apostrophes, please.";
  if (!EMAIL_RE.test(email) || (emailInput && !emailInput.validity.valid)) errs.email = "email: that doesn't look like an address.";
  if (!PHONE_RE.test(number.replace(/[\s().-]/g, ""))) errs.number = "phone: a 10-digit number, with an optional country code like +91.";
  if (!message) errs.message = "message: write a line or two first.";
  return errs;
}

/** POST the draft. Resolves to { ok: true } or { ok: false, why }. */
async function deliver(draft, signal) {
  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...draft, access_key: WEB3FORMS_ACCESS_KEY }),
      signal,
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) return { ok: true };
    return { ok: false, why: `The form service said: ${json.message || res.status}` };
  } catch {
    if (signal.aborted && signal.reason === "unmount") return { ok: false, why: null };
    return { ok: false, why: "Couldn't reach the form service." };
  }
}

export default function Terminal({ onFail, onSent }) {
  const formRef = useRef(null);
  const logRef = useRef(null);
  const sending = useRef(null);
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);
  // a send in flight is dropped with the form
  useEffect(() => () => sending.current?.abort("unmount"), []);

  const print = (lines) => setLog((l) => [...l, ...lines].slice(-14));
  const fail = (lines) => {
    print(lines);
    onFail?.();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const form = formRef.current;
    const f = new FormData(form);
    const draft = Object.fromEntries(FIELDS.map((k) => [k, String(f.get(k) || "").trim()]));
    const errs = validate(draft, form.elements.namedItem("email"));
    setErrors(errs);
    print([{ t: `$ contact --send --from "${draft.name || "anonymous"}"`, c: "cmd" }]);
    const bad = FIELDS.filter((k) => errs[k]);
    if (bad.length) {
      fail([...bad.map((k) => ({ t: errs[k], c: "err" })), { t: "Nothing was sent. Fix the fields above and press Send again.", c: "dim" }]);
      form.elements.namedItem(bad[0])?.focus();
      return;
    }
    setBusy(true);
    print([{ t: "sending…", c: "dim" }]);
    const ctl = new AbortController();
    sending.current = ctl;
    const timer = window.setTimeout(() => ctl.abort("timeout"), SEND_TIMEOUT_MS);
    const result = await deliver(draft, ctl.signal);
    window.clearTimeout(timer);
    if (sending.current === ctl) sending.current = null;
    if (result.why === null) return; // unmounted
    setBusy(false);
    if (result.ok) {
      print([{ t: `Sent. We'll reply to ${draft.email}.`, c: "ok" }]);
      form.reset();
      onSent?.();
    } else {
      fail([{ t: result.why, c: "err" }, { t: `You can also mail ${FALLBACK_MAIL}.`, c: "dim" }]);
    }
  };

  // the fields are read-only while a send is in flight, so what is sent is what was typed
  const field = (name) => ({
    name,
    readOnly: busy,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `v8-contact-${name}-err` : undefined,
    onInput: errors[name]
      ? () =>
          setErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
          })
      : undefined,
  });
  const err = (name) =>
    errors[name] ? (
      <span id={`v8-contact-${name}-err`} className={ui.srOnly}>
        {errors[name]}
      </span>
    ) : null;

  return (
    <div className={`${ui.panel} ${s.term}`}>
      <p className={s.header}>dvm — contact</p>
      <div className={s.log} ref={logRef} aria-live="polite">
        <p className={s[BOOT.c]}>{BOOT.t}</p>
        {log.map((l, i) => (
          <p key={i} className={s[l.c]}>
            {l.t}
          </p>
        ))}
      </div>
      <form ref={formRef} className={s.form} onSubmit={onSubmit} noValidate aria-busy={busy}>
        <label className={s.row}>
          <span className={s.prompt}>name</span>
          <input className={`${ui.input} ${s.field}`} type="text" autoComplete="name" placeholder="Your name" maxLength={80} {...field("name")} />
        </label>
        {err("name")}
        <label className={s.row}>
          <span className={s.prompt}>email</span>
          <input className={`${ui.input} ${s.field}`} type="email" autoComplete="email" placeholder="you@example.com" {...field("email")} />
        </label>
        {err("email")}
        <label className={s.row}>
          <span className={s.prompt}>phone</span>
          <input className={`${ui.input} ${s.field}`} type="tel" autoComplete="tel" placeholder="+91 98765 43210" {...field("number")} />
        </label>
        {err("number")}
        <label className={`${s.row} ${s.rowTall}`}>
          <span className={s.prompt}>message</span>
          <textarea className={`${ui.input} ${s.field} ${s.area}`} rows={4} placeholder="What are you building?" {...field("message")} />
        </label>
        {err("message")}
        <div className={s.actions}>
          <button type="submit" className={ui.btn} disabled={busy}>
            {busy ? "Sending…" : "Send"}
          </button>
          <span className={s.alt}>
            or mail{" "}
            <a className={s.altLink} href={`mailto:${FALLBACK_MAIL}`}>
              {FALLBACK_MAIL}
            </a>
          </span>
        </div>
      </form>
    </div>
  );
}
