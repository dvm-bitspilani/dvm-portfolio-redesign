// Boot + lock screen. The live mercury mark falls into place (bead intro) while the OS
// "mounts" the real archive; then the lock screen (Pilani clock, guest sign-in) blurs the
// desktop behind it. Signing in flies the same mark into the start button (or the phone's
// home widget) and the overlay melts away.
import { useCallback, useEffect, useRef, useState } from "react";
import { MercuryLogo } from "../../../immersive/kit/mercury";
import { artworks, projects, team } from "../../../immersive/data";
import { GLASS_ENV } from "./shell";
import { fmtLongDate, fmtTime, reducedNow, useClock } from "../lib/hooks";
import s from "./boot.module.css";

const STEPS = [
  `Mounting ${projects.length} projects`,
  `Indexing ${team.length} people`,
  `Developing ${artworks.length} artworks`,
  "Starting the window manager",
];

export default function Boot({ phase, setPhase, auto, phone, onSignedIn }) {
  const now = useClock();
  const [step, setStep] = useState(0);
  const wrap = useRef(null);
  const root = useRef(null);
  const reduced = reducedNow();

  // boot → login
  useEffect(() => {
    if (phase !== "boot") return;
    setStep(0);
    const total = reduced ? 500 : auto ? 1300 : 2100;
    const iv = setInterval(() => setStep((x) => Math.min(STEPS.length - 1, x + 1)), total / STEPS.length);
    const t = setTimeout(() => setPhase("login"), total);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [phase, setPhase, reduced, auto]);

  const signIn = useCallback(() => {
    if (phase !== "login") return;
    setPhase("leaving");
    const el = wrap.current;
    const target = document.querySelector(`[data-mark-target="${phone ? "phone" : "desktop"}"]`);
    const finish = () => {
      setPhase("done");
      onSignedIn?.();
    };
    root.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 150 : 650, delay: reduced ? 0 : 200, easing: "ease-in", fill: "forwards" });
    if (reduced || !el || !target) return void setTimeout(finish, reduced ? 160 : 860);
    const a = el.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const k = b.height / a.height;
    el.animate(
      [
        { transform: getComputedStyle(el).transform === "none" ? "none" : getComputedStyle(el).transform, offset: 0 },
        {
          transform: `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(${k})`,
          offset: 1,
        },
      ],
      { duration: 820, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards", composite: "replace" },
    ).onfinish = finish;
  }, [phase, phone, reduced, setPhase, onSignedIn]);

  // deep links sign in on their own; Enter / Space sign in
  useEffect(() => {
    if (phase !== "login") return;
    const t = auto ? setTimeout(signIn, reduced ? 200 : 550) : 0;
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        signIn();
      }
    };
    addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      removeEventListener("keydown", onKey);
    };
  }, [phase, auto, signIn, reduced]);

  return (
    <div className={s.boot} data-phase={phase} data-phone={phone || undefined} role="dialog" aria-label={phase === "boot" ? "DVM OS is starting" : "Lock screen"}>
      <div ref={root} className={s.backdrop} />
      <div className={s.clockBlock} aria-hidden={phase === "boot"}>
        <div className={s.clock}>{fmtTime(now)}</div>
        <div className={s.date}>{fmtLongDate(now)}, Pilani</div>
      </div>

      <div ref={wrap} className={s.mark}>
        <div className={s.markInner} data-kit>
          <MercuryLogo
            env={GLASS_ENV}
            fit={{ mode: "height", padding: 0.12 }}
            introDelay={0.15}
            interactive={phase === "login"}
            pointerTarget="window"
            sheen={1}
            shadow={0.35}
            quality="auto"
            label="DVM"
          />
        </div>
      </div>

      <div className={s.bootInfo} aria-live="polite">
        <div className={s.word}>DVM OS</div>
        <div className={s.progress}>
          <span style={{ transform: `scaleX(${(step + 1) / STEPS.length})` }} />
        </div>
        <div className={s.step}>{STEPS[step]}</div>
      </div>

      <div className={s.login}>
        <div className={s.who}>Guest</div>
        <div className={s.whoSub}>Department of Visual Media, BITS Pilani</div>
        <button className={s.signIn} onClick={signIn} disabled={phase !== "login"} autoFocus>
          {auto ? "Signing in" : "Sign in"}
        </button>
        {!auto && <div className={s.hint}>{phone ? "Tap to unlock" : "or press Enter. Pull the mercury with your cursor while you're here."}</div>}
      </div>
    </div>
  );
}
