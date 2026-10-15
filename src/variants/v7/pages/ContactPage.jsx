// Contact, inside the expanded contact tile (the campus map stays beside it as a companion).
// Same fields, validation and web3forms endpoint/key as src/pages/ContactUs.jsx; errors are
// shown inline instead of alert() boxes.
import { useRef, useState } from "react";
import Page from "./Page";
import { site, socials } from "../lib/data";
import p from "./pages.module.css";

const NAME_REGEX = /^(\w|\s)\D+$/;
const PHONE_REGEX = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
const EMAIL_REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/i;
const WEB3FORMS_ACCESS_KEY = "16d050c0-9c1e-49f1-bc6b-4e19f97587b3";
const ENDPOINT = "https://api.web3forms.com/submit";

const FIELDS = [
  { id: "name", label: "Name", type: "text", auto: "name", check: (v) => NAME_REGEX.test(v), error: "Enter your name, letters only." },
  { id: "email", label: "Email", type: "email", auto: "email", check: (v) => EMAIL_REGEX.test(v), error: "Enter an email address like name@example.com." },
  { id: "number", label: "Phone number", type: "tel", auto: "tel", check: (v) => PHONE_REGEX.test(v), error: "Enter a 10-digit phone number, with an optional country code." },
  { id: "message", label: "Message", type: "textarea", check: (v) => v.length > 0, error: "Write a message." },
];

export default function ContactPage() {
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // null | sending | sent | failed

  const onSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(FIELDS.map((f) => [f.id, String(new FormData(formRef.current).get(f.id) || "").trim()]));
    const errs = {};
    for (const f of FIELDS) if (!f.check(data[f.id])) errs[f.id] = f.error;
    setErrors(errs);
    if (Object.keys(errs).length) {
      formRef.current.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...data, access_key: WEB3FORMS_ACCESS_KEY }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 200) {
        setStatus({ kind: "sent" });
        formRef.current.reset();
      } else setStatus({ kind: "failed", message: json.message });
    } catch {
      setStatus({ kind: "failed" });
    }
  };

  const clearError = (id) => errors[id] && setErrors((e) => ({ ...e, [id]: undefined }));

  return (
    <Page id="contact" label="Contact" title="Write to DVM" readout="web3forms">
      <div className={p.contactGrid}>
        <div>
          <p className={p.lead}>Questions about a fest website or app, a collaboration, or joining the department: send a message and it reaches the team’s inbox.</p>
          <p className={p.body}>Or write directly:</p>
          <a className={p.mailBig} href={`mailto:${site.contact.email}`}>
            {site.contact.email}
          </a>
          <div className={p.linkRow}>
            {socials.map((s) => (
              <a key={s.id} className={p.btnGhost} href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            ))}
          </div>
        </div>
        <form ref={formRef} className={p.form} onSubmit={onSubmit} noValidate>
          {FIELDS.map((f) => {
            const err = errors[f.id];
            const props = {
              id: `v7-${f.id}`,
              name: f.id,
              className: p.input,
              "aria-invalid": err ? "true" : undefined,
              "aria-describedby": err ? `v7-${f.id}-err` : undefined,
              onInput: () => clearError(f.id),
            };
            return (
              <div key={f.id} className={p.field}>
                <label htmlFor={`v7-${f.id}`}>{f.label}</label>
                {f.type === "textarea" ? <textarea {...props} rows={5} /> : <input {...props} type={f.type} autoComplete={f.auto} />}
                {err && (
                  <p id={`v7-${f.id}-err`} className={p.err}>
                    {err}
                  </p>
                )}
              </div>
            );
          })}
          <div className={p.linkRow} style={{ marginTop: 4, alignItems: "center" }}>
            <button type="submit" className={p.btn} disabled={status?.kind === "sending"}>
              {status?.kind === "sending" ? "Sending…" : "Send message"}
            </button>
            <p className={p.status} role="status" data-tone={status?.kind === "sent" ? "ok" : status?.kind === "failed" ? "bad" : undefined}>
              {status?.kind === "sent" && "Message sent. We’ll reply by email."}
              {status?.kind === "failed" && (status.message ? `Not sent: ${status.message}` : `Not sent. Mail us at ${site.contact.email} instead.`)}
            </p>
          </div>
        </form>
      </div>
    </Page>
  );
}
