// DVM OS on a phone: a home screen (live mercury widget, featured-work widget, app icons,
// a search pill and a dock) with full-screen apps. Apps zoom out of their icon and back
// into it; project pages push in from the right. The URL is the open app, so deep links,
// Back and the home bar all agree.
import { Suspense, createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Search, X } from "lucide-react";
import { MercuryLogo } from "../../../immersive/kit/mercury";
import { featuredProjects, projects, team } from "../../../immersive/data";
import Wallpaper from "../os/Wallpaper";
import Boot from "../os/Boot";
import { APPS, COMPONENTS, pathFor, projectBySlug, titleFor } from "../os/apps";
import { AppIcon, MarkSvg } from "../os/icons";
import { GLASS_ENV, OsContext, rectOf } from "../os/shell";
import { NotificationList, Toasts, useNotify } from "../os/notify";
import { OsRoutes, useSession } from "../os/session";
import { SearchResults, useSearch } from "../os/StartMenu";
import { fmtLongDate, fmtTime, reducedNow, useClock } from "../lib/hooks";
import { P } from "../lib/paths";
import s from "./phone.module.css";

const GRID = ["about", "legacy", "blogs", "artwork"];
const DOCK = ["projects", "team", "archive", "contact"];

const RouteSink = createContext(() => {});
function PhoneTarget({ app }) {
  const { slug } = useParams();
  const loc = useLocation();
  const sink = useContext(RouteSink);
  useLayoutEffect(() => {
    sink(app ?? null, slug, loc.key);
  }, [sink, app, slug, loc.key]);
  return null;
}

function StatusBar({ onTap, dark }) {
  const now = useClock();
  return (
    <button className={`${s.status} ${dark ? s.statusDark : ""}`} onClick={onTap} aria-label={`${fmtTime(now)}. Open notifications`}>
      <span className={s.sTime}>{fmtTime(now)}</span>
      <span className={s.sIcons} aria-hidden="true">
        <svg viewBox="0 0 18 12" width="18" height="12">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4.6} y={9 - i * 3} width="3.2" height={3 + i * 3} rx="1" fill="currentColor" />
          ))}
        </svg>
        <svg viewBox="0 0 16 12" width="16" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1.5 4.5a9.5 9.5 0 0 1 13 0M4 7.2a6 6 0 0 1 8 0M6.6 9.8a2.2 2.2 0 0 1 2.8 0" />
        </svg>
        <svg viewBox="0 0 27 12" width="27" height="12">
          <rect x="0.5" y="0.5" width="23" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".45" />
          <rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor" />
          <rect x="24.5" y="4" width="1.8" height="4" rx="1" fill="currentColor" opacity=".45" />
        </svg>
      </span>
    </button>
  );
}

function MarkWidget({ live, onOpen }) {
  const now = useClock();
  const [ready, setReady] = useState(false);
  return (
    <button className={`${s.widget} ${s.markWidget}`} onClick={onOpen} aria-label="About DVM">
      <span className={s.wMark} data-mark-target="phone">
        <MarkSvg className={`${s.wSvg} ${live && ready ? s.hide : ""}`} fill="url(#v4-mark-grad)" />
        {live && (
          <span className={s.wGl} data-kit>
            <MercuryLogo env={GLASS_ENV} fit={{ mode: "height", padding: 0.12 }} interactive={false} pointerTarget="window" intro={false} shadow={0.3} sheen={1} fps={30} quality="low" label="DVM" onReady={() => setReady(true)} />
          </span>
        )}
      </span>
      <span className={s.wText}>
        <span className={s.wTitle}>DVM</span>
        <span className={s.wSub}>Department of Visual Media, BITS Pilani</span>
        <span className={s.wDate}>{fmtLongDate(now)}</span>
        <span className={s.wStats}>
          <b>{projects.length}</b> projects <b>{team.length}</b> people
        </span>
      </span>
    </button>
  );
}

function FeaturedWidget({ onOpen }) {
  const list = featuredProjects.filter((p) => p.cover);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reducedNow()) return;
    const t = setInterval(() => setI((x) => (x + 1) % list.length), 5000);
    return () => clearInterval(t);
  }, [list.length]);
  const p = list[i];
  return (
    <button className={`${s.widget} ${s.featWidget}`} onClick={(e) => onOpen(p, e.currentTarget)} aria-label={`Featured: ${p.title}`}>
      {list.map((x, k) => (
        <img key={x.slug} src={x.cover} alt="" className={s.featImg} data-on={k === i || undefined} />
      ))}
      <span className={s.featText}>
        <span className={s.featLabel}>Featured work</span>
        <span className={s.featTitle}>{p.title}</span>
      </span>
    </button>
  );
}

function SearchSheet({ onClose, launch }) {
  const input = useRef(null);
  const pick = (o, el) => {
    onClose();
    launch(o.app, o.param, { origin: rectOf(el), props: o.props });
  };
  const sr = useSearch(pick, "v4-pres");
  useEffect(() => input.current?.focus(), []);
  return (
    <div className={s.sheet} role="dialog" aria-label="Search">
      <div className={s.sheetBar}>
        <label className={s.sheetInput}>
          <Search size={18} />
          <input ref={input} value={sr.q} onChange={(e) => sr.setQ(e.target.value)} onKeyDown={sr.onKey} placeholder="Search DVM" aria-label="Search" />
        </label>
        <button className={s.cancel} onClick={onClose}>
          Cancel
        </button>
      </div>
      <div className={s.sheetBody}>
        {sr.q.trim() ? (
          sr.results.length ? (
            <SearchResults results={sr.results} active={sr.active} setActive={sr.setActive} onPick={pick} listId="v4-pres" />
          ) : (
            <p className={s.none}>Nothing matches “{sr.q}”.</p>
          )
        ) : (
          <p className={s.none}>Projects, people, essays, artwork and apps.</p>
        )}
      </div>
    </div>
  );
}

export default function Phone() {
  const navigate = useNavigate();
  const { notify } = useNotify();
  const [route, setRoute] = useState({ app: null, param: undefined, key: "" });
  const [shown, setShown] = useState(null); // { app, param, props } on screen (kept while closing)
  const [anim, setAnim] = useState(null); // "open" | "push" | "close" | null
  const [search, setSearch] = useState(false);
  const [center, setCenter] = useState(false);
  const pending = useRef(null);
  const layer = useRef(null);
  const props = useRef({});

  const sink = useCallback((app, param, key) => setRoute((r) => (r.app === app && r.param === param && r.key === key ? r : { app, param, key })), []);

  const launch = useCallback(
    (app, param, opts = {}) => {
      pending.current = { app, param, origin: opts.origin ?? null };
      if (opts.props) props.current = { ...opts.props, nonce: Date.now() };
      const to = pathFor(app, param);
      navigate(to);
    },
    [navigate],
  );
  const session = useSession(launch);
  const { phase } = session;

  // route → screen
  useEffect(() => {
    const { app, param } = route;
    if (app === "project" && !projectBySlug(param)) {
      navigate(P("/projects"), { replace: true });
      return;
    }
    if (!app) {
      if (shown) setAnim("close");
      return;
    }
    const pend = pending.current?.app === app ? pending.current : null;
    pending.current = null;
    const fromApp = shown && !anim;
    setShown({ app, param, props: props.current, origin: pend?.origin ?? null });
    props.current = {};
    setAnim(fromApp ? "push" : "open");
    setSearch(false);
    setCenter(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  const iconRect = (app) => rectOf(document.querySelector(`[data-phone-icon="${app === "project" ? "projects" : app}"]`));

  // open / push / close animations on the app layer
  useLayoutEffect(() => {
    const el = layer.current;
    if (!anim || !el) return;
    const done = () => {
      if (anim === "close") setShown(null);
      setAnim(null);
    };
    if (reducedNow()) {
      el.animate([{ opacity: anim === "close" ? 1 : 0 }, { opacity: anim === "close" ? 0 : 1 }], { duration: 160, fill: "forwards" }).onfinish = done;
      return;
    }
    const W = el.clientWidth;
    const H = el.clientHeight;
    const o = anim === "close" ? iconRect(shown?.app) : shown?.origin ?? iconRect(shown?.app);
    const inset = o ? `inset(${o.top}px ${W - o.left - o.width}px ${H - o.top - o.height}px ${o.left}px round 18px)` : "inset(30% 20% 30% 20% round 24px)";
    let a;
    if (anim === "push") {
      a = el.animate([{ transform: "translateX(100%)" }, { transform: "translateX(0)" }], { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" });
    } else {
      const frames = [
        { clipPath: inset, opacity: 0.5, filter: "brightness(1.4)" },
        { clipPath: "inset(0px 0px 0px 0px round 0px)", opacity: 1, filter: "brightness(1)" },
      ];
      a = el.animate(anim === "close" ? [...frames].reverse() : frames, {
        duration: anim === "close" ? 380 : 480,
        easing: anim === "close" ? "cubic-bezier(.4,0,.2,1)" : "cubic-bezier(.16,1,.3,1)",
        fill: anim === "close" ? "forwards" : "none",
      });
    }
    a.onfinish = done;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim]);

  const goHome = () => navigate(P("/"));
  const back = () => {
    if (shown?.app === "project") navigate(P("/projects"));
    else goHome();
  };

  // home bar: tap or swipe up to go home
  const swipe = useRef(null);
  const homeBar = {
    onPointerDown: (e) => {
      swipe.current = { y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const d = swipe.current;
      if (!d || !layer.current) return;
      const dy = Math.min(0, e.clientY - d.y);
      d.dy = dy;
      layer.current.style.transform = `translateY(${dy * 0.5}px) scale(${1 + dy / 1800})`;
      layer.current.style.borderRadius = `${Math.min(30, -dy / 4)}px`;
    },
    onPointerUp: () => {
      const d = swipe.current;
      swipe.current = null;
      if (layer.current) {
        layer.current.style.transform = "";
        layer.current.style.borderRadius = "";
      }
      if (!d || d.dy == null || d.dy < -60 || Math.abs(d.dy) < 4) goHome();
    },
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented && shown && !e.target.closest?.("[role=dialog]")) back();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const value = useMemo(() => ({ phone: true, launch, notify, booted: phase === "done" }), [launch, notify, phase]);
  const App = shown ? COMPONENTS[shown.app] : null;
  const appOpen = !!shown && anim !== "open";
  const title = shown ? (shown.app === "project" ? projectBySlug(shown.param)?.title : titleFor(shown.app)) : "";
  const icon = (id) => (
    <button key={id} className={s.icon} data-phone-icon={id} onClick={(e) => launch(id, undefined, { origin: rectOf(e.currentTarget.firstChild) })} aria-label={APPS.find((x) => x.id === id).label}>
      <AppIcon app={id} size={60} />
      <span>{APPS.find((x) => x.id === id).label.replace(" DVM", "")}</span>
    </button>
  );

  return (
    <OsContext.Provider value={value}>
      <RouteSink.Provider value={sink}>
        <OsRoutes Target={PhoneTarget} />
      </RouteSink.Provider>
      <div className={s.phone}>
        <Wallpaper mobile mode="horizon" />
        <div className={s.home} aria-hidden={appOpen || undefined} inert={appOpen ? true : undefined}>
          <StatusBar onTap={() => setCenter(true)} />
          <div className={s.homeBody}>
            <MarkWidget live={phase === "done" && !appOpen && !center && !search} onOpen={(e) => launch("about", undefined, { origin: rectOf(e?.currentTarget) })} />
            <div className={s.grid}>{GRID.map(icon)}</div>
            <FeaturedWidget onOpen={(p, el) => launch("project", p.slug, { origin: rectOf(el) })} />
          </div>
          <button className={s.searchPill} onClick={() => setSearch(true)}>
            <Search size={15} /> Search
          </button>
          <nav className={s.dock} aria-label="Dock">
            {DOCK.map(icon)}
          </nav>
        </div>

        {shown && (
          <div ref={layer} className={s.appLayer} role="dialog" aria-label={title}>
            <StatusBar dark onTap={() => setCenter(true)} />
            <header className={s.appBar}>
              <button className={s.back} onClick={back} aria-label={shown.app === "project" ? "Back to Projects" : "Back to Home"}>
                <ChevronLeft size={20} />
                {shown.app === "project" ? "Projects" : "Home"}
              </button>
              <h1 className={s.appTitle}>{title}</h1>
              <span className={s.appSpacer} />
            </header>
            <div className={s.appBody}>
              <Suspense fallback={<div className={s.loading} />}>
                <App key={`${shown.app}:${shown.param ?? ""}`} param={shown.param} props={shown.props} focused live={anim !== "close"} />
              </Suspense>
            </div>
            <button className={s.homeBar} aria-label="Go home" {...homeBar}>
              <span />
            </button>
          </div>
        )}

        {search && <SearchSheet onClose={() => setSearch(false)} launch={launch} />}
        {center && (
          <div className={s.center} role="dialog" aria-label="Notifications" onClick={(e) => e.target === e.currentTarget && setCenter(false)}>
            <div className={s.centerPanel}>
              <div className={s.centerHead}>
                <CenterClock />
                <button className={s.closeX} onClick={() => setCenter(false)} aria-label="Close notifications">
                  <X size={18} />
                </button>
              </div>
              <NotificationList onRun={() => setCenter(false)} />
            </div>
          </div>
        )}
        <Toasts phone />
        {phase !== "done" && <Boot phone phase={phase} setPhase={session.setPhase} auto={session.auto} onSignedIn={session.onSignedIn} />}
      </div>
    </OsContext.Provider>
  );
}

function CenterClock() {
  const now = useClock();
  return (
    <div className={s.cClock}>
      <span>{fmtTime(now)}</span>
      <small>{fmtLongDate(now)}, Pilani</small>
    </div>
  );
}
