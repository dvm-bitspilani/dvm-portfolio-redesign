// V4 · DVM OS — the site as an operating system, under /v/v4/*.
// Desktop (≥ 761px): a window manager where every route is a window (the URL is the
// focused window; closing the last one returns to the desktop route).
// Phone (≤ 760px): a home screen with full-screen apps; the URL is the open app.
import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import "@fontsource-variable/jetbrains-mono";
import os from "./os/os.module.css";
import { IconDefs } from "./os/icons";
import { NotifyProvider, useNotify } from "./os/notify";
import { MenuProvider } from "./os/menus";
import { WmProvider, useWm } from "./os/wm";
import { OsContext } from "./os/shell";
import Desktop from "./os/Desktop";
import Boot from "./os/Boot";
import Phone from "./phone/Phone";
import { useMedia } from "./lib/hooks";
import { OsRoutes, useSession } from "./os/session";

function WindowTarget({ app }) {
  const { slug } = useParams();
  const loc = useLocation();
  const { ensure } = useWm();
  useEffect(() => {
    ensure(app, slug);
  }, [app, slug, loc.key, ensure]);
  return null;
}

function DesktopShell() {
  const wm = useWm();
  const { notify } = useNotify();
  const session = useSession(wm.launch);
  const { phase } = session;
  const value = useMemo(() => ({ phone: false, launch: wm.launch, notify, booted: phase === "done" }), [wm.launch, notify, phase]);
  return (
    <OsContext.Provider value={value}>
      <OsRoutes Target={WindowTarget} />
      <Desktop phase={phase} onLock={session.lock} onRestart={() => session.restart(wm.closeAll)} />
      {phase !== "done" && <Boot phase={phase} setPhase={session.setPhase} auto={session.auto} onSignedIn={session.onSignedIn} />}
    </OsContext.Provider>
  );
}

function DesktopRoot() {
  const { notify } = useNotify();
  const onNotFound = useCallback(
    (slug) => notify({ app: "projects", source: "Projects", title: "That project isn't on this machine", body: `Nothing is filed under “${slug}”. Showing all projects instead.` }),
    [notify],
  );
  return (
    <WmProvider onNotFound={onNotFound}>
      <DesktopShell />
    </WmProvider>
  );
}

export default function V4() {
  const phone = useMedia("(max-width: 760px)");
  useEffect(() => {
    const h = document.documentElement;
    const prev = [h.style.overflow, h.style.scrollbarGutter];
    // the base sets `scrollbar-gutter: stable` on html, which would leave a strip on the right
    h.style.overflow = "hidden";
    h.style.scrollbarGutter = "auto";
    document.title = "DVM OS";
    return () => {
      [h.style.overflow, h.style.scrollbarGutter] = prev;
    };
  }, []);
  return (
    <div className={os.root} data-v4os="">
      <IconDefs />
      <NotifyProvider>
        <MenuProvider>{phone ? <Phone /> : <DesktopRoot />}</MenuProvider>
      </NotifyProvider>
    </div>
  );
}
