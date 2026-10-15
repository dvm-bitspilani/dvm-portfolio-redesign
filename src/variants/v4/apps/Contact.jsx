// Mail: a composer addressed to DVM. Same fields, validation and endpoint as the base
// contact page (web3forms), with inline errors instead of alerts, a sending state, a
// "Sent" mailbox for this session and a notification when it goes out.
import { memo, useRef, useState } from "react";
import { ArrowUpRight, Inbox, Loader, PenSquare, Send } from "lucide-react";
import { site, socials } from "../../../immersive/data";
import { useOs } from "../os/shell";
import { fmtTime } from "../lib/hooks";
import a from "./app.module.css";
import s from "./contact.module.css";

const WEB3FORMS_ACCESS_KEY = "16d050c0-9c1e-49f1-bc6b-4e19f97587b3";
const NAME_REGEX = /^(\w|\s)\D+$/;
const PHONE_REGEX = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
const EMAIL_REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/i;

const sent = []; // this session's sent messages (module scope: survives closing the window)

function validate(f) {
  const e = {};
  if (!NAME_REGEX.test(f.name.trim())) e.name = "Enter your name (letters only).";
  if (!EMAIL_REGEX.test(f.email.trim())) e.email = "Enter an email address we can reply to.";
  if (!PHONE_REGEX.test(f.number.trim())) e.number = "Enter a 10-digit phone number, with country code if outside India.";
  if (!f.message.trim()) e.message = "Write a message.";
  return e;
}

const EMPTY = { name: "", email: "", number: "", message: "" };

function Contact() {
  const { notify } = useOs();
  const [box, setBox] = useState("new");
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState("idle"); // idle | sending | sent | failed
  const [failMsg, setFailMsg] = useState("");
  const [, force] = useState(0);
  const formRef = useRef(null);

  const field = (k) => ({
    id: `v4-mail-${k}`,
    value: f[k],
    onChange: (e) => {
      setF((x) => ({ ...x, [k]: e.target.value }));
      if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
    },
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `v4-mail-${k}-err` : undefined,
  });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    if (Object.keys(errs).length) {
      formRef.current?.querySelector(`#v4-mail-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setState("sending");
    const payload = { name: f.name.trim(), email: f.email.trim(), number: f.number.trim(), message: f.message.trim(), access_key: WEB3FORMS_ACCESS_KEY };
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 200) {
        sent.unshift({ ...payload, at: new Date() });
        setState("sent");
        setF(EMPTY);
        force((n) => n + 1);
        notify({ app: "contact", source: "Mail", title: "Message sent", body: "DVM will reply to the email address you gave." });
      } else {
        setFailMsg(json.message || `The form service answered ${res.status}.`);
        setState("failed");
      }
    } catch {
      setFailMsg("The message couldn't reach the form service.");
      setState("failed");
    }
  };

  return (
    <div className={a.app}>
      <div className={a.split}>
        <nav className={a.side} aria-label="Mailboxes">
          <button className={s.compose} onClick={() => (setBox("new"), setState("idle"))}>
            <PenSquare size={16} /> New message
          </button>
          <div className={a.sideHead}>Mailboxes</div>
          <button className={a.sideItem} aria-current={box === "new"} onClick={() => setBox("new")}>
            <PenSquare /> Draft
          </button>
          <button className={a.sideItem} aria-current={box === "sent"} onClick={() => setBox("sent")}>
            <Inbox /> Sent <span className={a.count}>{sent.length}</span>
          </button>
          <div className={a.sideHead}>Elsewhere</div>
          <a className={a.sideItem} href={`mailto:${site.contact.email}`}>
            {site.contact.email}
          </a>
          {socials.map((x) => (
            <a key={x.id} className={a.sideItem} href={x.url} target="_blank" rel="noreferrer">
              {x.label} <ArrowUpRight style={{ marginLeft: "auto" }} />
            </a>
          ))}
        </nav>

        <div className={a.main}>
          <div className={a.chips}>
            <button className={a.chipBtn} aria-current={box === "new"} onClick={() => setBox("new")}>
              Draft
            </button>
            <button className={a.chipBtn} aria-current={box === "sent"} onClick={() => setBox("sent")}>
              Sent ({sent.length})
            </button>
            <a className={a.chipBtn} href={`mailto:${site.contact.email}`} style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
              {site.contact.email}
            </a>
          </div>
          {box === "sent" ? (
            <div className={a.scroll}>
              {sent.length === 0 ? (
                <p className={a.empty}>Nothing sent yet. Messages you send from this window appear here.</p>
              ) : (
                <ul className={s.sentList}>
                  {sent.map((m) => (
                    <li key={m.at.getTime()} className={s.sentItem}>
                      <div className={s.sentHead}>
                        <b>To DVM</b>
                        <span>{fmtTime(m.at)}</span>
                      </div>
                      <p>{m.message}</p>
                      <span className={s.sentFrom}>
                        From {m.name}, {m.email}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : state === "sent" ? (
            <div className={s.done}>
              <span className={s.doneIcon}>
                <Send />
              </span>
              <h2>Message sent</h2>
              <p>DVM will reply to the email address you gave. You can find a copy under Sent.</p>
              <div className={s.doneBtns}>
                <button className={a.btnPrimary} onClick={() => setState("idle")}>
                  Write another
                </button>
                <button className={a.btn} onClick={() => setBox("sent")}>
                  View sent
                </button>
              </div>
            </div>
          ) : (
            <form ref={formRef} className={s.form} onSubmit={submit} noValidate>
              <div className={a.toolbar}>
                <button type="submit" className={a.btnPrimary} disabled={state === "sending"}>
                  {state === "sending" ? <Loader className={s.spin} /> : <Send />}
                  {state === "sending" ? "Sending" : "Send"}
                </button>
                <button type="button" className={a.btn} onClick={() => (setF(EMPTY), setErrors({}), setState("idle"))}>
                  Discard
                </button>
              </div>
              <div className={a.scroll}>
                <div className={s.head}>
                  <div className={s.line}>
                    <span className={s.lab}>To</span>
                    <span className={s.to}>
                      DVM <span>{site.contact.email}</span>
                    </span>
                  </div>
                  {[
                    ["name", "Name", "text", "name", "Your name"],
                    ["email", "Email", "email", "email", "you@example.com"],
                    ["number", "Phone", "tel", "tel", "+91 98765 43210"],
                  ].map(([k, label, type, ac, ph]) => (
                    <div key={k} className={s.line} data-error={errors[k] ? "" : undefined}>
                      <label className={s.lab} htmlFor={`v4-mail-${k}`}>
                        {label}
                      </label>
                      <div className={s.fieldWrap}>
                        <input className={s.input} type={type} autoComplete={ac} placeholder={ph} {...field(k)} />
                        {errors[k] && (
                          <span className={s.err} id={`v4-mail-${k}-err`}>
                            {errors[k]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={s.bodyWrap} data-error={errors.message ? "" : undefined}>
                  <label className={s.hidden} htmlFor="v4-mail-message">
                    Message
                  </label>
                  <textarea className={s.textarea} placeholder="Tell us about your fest, your idea, or say hello." {...field("message")} />
                  {errors.message && (
                    <span className={s.err} id="v4-mail-message-err">
                      {errors.message}
                    </span>
                  )}
                </div>
                {state === "failed" && (
                  <div className={s.fail} role="alert">
                    <b>Not sent.</b> {failMsg} Your draft is still here. Try again, or write to{" "}
                    <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a> directly.
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(Contact);
