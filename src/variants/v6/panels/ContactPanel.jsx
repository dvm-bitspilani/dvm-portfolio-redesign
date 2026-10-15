// /contactus — the contact node beside the mark, with the same form + web3forms endpoint
// as the base contact page (validation and delivery reported inline, not with alert()).
import { useRef, useState } from "react";
import { site, socials } from "../../../immersive/data";
import Panel, { panelStyles as s } from "./Panel";

const NAME_REGEX = /^(\w|\s)\D+$/;
const PHONE_REGEX = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
const EMAIL_REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/i;
const WEB3FORMS_ACCESS_KEY = "16d050c0-9c1e-49f1-bc6b-4e19f97587b3";
const ext = { target: "_blank", rel: "noreferrer noopener" };

export default function ContactPanel() {
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // { kind: 'ok' | 'err' | 'busy', text }

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status?.kind === "busy") return;
    const f = new FormData(formRef.current);
    const name = String(f.get("name") || "").trim();
    const email = String(f.get("email") || "").trim();
    const number = String(f.get("number") || "").trim();
    const message = String(f.get("message") || "").trim();
    const errs = {};
    if (!NAME_REGEX.test(name)) errs.name = "Use letters and spaces only.";
    if (!EMAIL_REGEX.test(email)) errs.email = "That doesn't look like an email address.";
    if (!PHONE_REGEX.test(number)) errs.number = "Use a 10-digit number, with an optional +91.";
    if (!message) errs.message = "Write a line or two first.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      setStatus({ kind: "err", text: "Nothing was sent. Fix the highlighted fields and send again." });
      formRef.current.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    setStatus({ kind: "busy", text: "Sending…" });
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, number, message, access_key: WEB3FORMS_ACCESS_KEY }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 200) {
        setStatus({ kind: "ok", text: `Sent. We'll reply to ${email}.` });
        formRef.current.reset();
      } else {
        setStatus({ kind: "err", text: `The form service said: ${json.message || res.status}. You can also mail ${site.contact.email}.` });
      }
    } catch {
      setStatus({ kind: "err", text: `Couldn't reach the form service. Mail ${site.contact.email} instead.` });
    }
  };

  const field = (name, label, props = {}) => (
    <label className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      {props.textarea ? (
        <textarea name={name} rows={5} aria-invalid={errors[name] ? true : undefined} aria-describedby={errors[name] ? `v6-err-${name}` : undefined} />
      ) : (
        <input name={name} type={props.type || "text"} autoComplete={props.autoComplete} inputMode={props.inputMode} aria-invalid={errors[name] ? true : undefined} aria-describedby={errors[name] ? `v6-err-${name}` : undefined} />
      )}
      {errors[name] && <span id={`v6-err-${name}`} className={s.fieldErr}>{errors[name]}</span>}
    </label>
  );

  return (
    <Panel kicker="The node next to the mark" title="Contact us">
      <p className={s.body}>Questions about a fest site, a collaboration, or joining DVM: write to us and a member of the department replies.</p>
      <form ref={formRef} className={s.form} onSubmit={onSubmit} noValidate>
        {field("name", "Name", { autoComplete: "name" })}
        {field("email", "Email", { type: "email", autoComplete: "email" })}
        {field("number", "Phone number", { type: "tel", autoComplete: "tel", inputMode: "tel" })}
        {field("message", "Message", { textarea: true })}
        <button type="submit" className={s.submit} disabled={status?.kind === "busy"}>
          {status?.kind === "busy" ? "Sending…" : "Send message"}
        </button>
        <p className={`${s.status} ${status ? s[`status_${status.kind}`] : ""}`} role="status" aria-live="polite">
          {status?.text || ""}
        </p>
      </form>
      <p className={s.note}>
        Or mail <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
      </p>
      <div className={s.links}>
        {socials.map((x) => (
          <a key={x.id} href={x.url} {...ext} className={s.btn}>{x.label}</a>
        ))}
      </div>
    </Panel>
  );
}
