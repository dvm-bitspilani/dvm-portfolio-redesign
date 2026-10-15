// V5 · Reel — the site as horizontal cinema, under /v/v5/*.
// Shell-level pieces outlive route changes: the reel bus (travel + input), the projector
// (the one live mercury mark as the lamp, its beam and the lit screen), the HUD, the
// grain/leaks, the reel index and the opening leader. Route changes are splices: a
// black frame runs through the gate, the next reel is cut in behind it.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ReelBus } from "./reel/bus";
import { BusContext } from "./reel/context";
import { Projector } from "./chrome/Projector";
import { Header, Footer } from "./chrome/Hud";
import Effects from "./chrome/Effects";
import Menu from "./chrome/Menu";
import Leader from "./chrome/Leader";
import { ChromeContext } from "./chrome/shell";
import { P } from "./lib/paths";
import { reelFor } from "./lib/reels";
import s from "./v5.module.css";

import Home from "./pages/Home";
import About from "./pages/About";
import Work from "./pages/Work";
import Scene from "./pages/Scene";
import Legacy from "./pages/Legacy";
import Team from "./pages/Team";
import Journal from "./pages/Journal";
import Artwork from "./pages/Artwork";
import Archive from "./pages/Archive";
import Credits from "./pages/Credits";

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function V5() {
  const bus = useMemo(() => new ReelBus(), []);
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState("idle"); // idle | cover | reveal
  const [leader, setLeader] = useState(() => !prefersReduced());
  const [live, setLive] = useState(() => prefersReduced());
  const [menu, setMenu] = useState(null); // null | open | closing
  const menuFocus = useRef(null);
  const lamp = useRef(null);

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) setStage("cover");
    else if (location.search !== displayLocation.search || location.hash !== displayLocation.hash || location.state !== displayLocation.state)
      setDisplayLocation(location);
  }, [location, displayLocation]);

  useEffect(() => {
    setMenu((m) => (m === "open" ? "closing" : m));
  }, [location.pathname]);

  // the strip doesn't move under the leader, the index or a splice
  const locked = leader || !!menu || stage === "cover";
  useEffect(() => {
    if (!locked) return;
    bus.lock();
    return () => bus.unlock();
  }, [bus, locked]);

  useEffect(() => () => bus.stop(), [bus]);

  const onSpliceEnd = (e) => {
    if (e.target !== e.currentTarget) return;
    if (stage === "cover") {
      setDisplayLocation(location);
      setStage("reveal");
    } else if (stage === "reveal") setStage("idle");
  };

  const openMenu = useCallback((from) => {
    menuFocus.current = from || document.activeElement;
    setMenu("open");
  }, []);
  const closeMenu = useCallback(() => setMenu((m) => (m ? "closing" : m)), []);
  const onMenuClosed = useCallback(() => setMenu(null), []);

  const onResolve = useCallback(() => {
    setLive(true);
    lamp.current?.intro(0.2);
  }, []);
  const onLeaderDone = useCallback(() => setLeader(false), []);
  const getLampTarget = useCallback(() => lamp.current?.pose(), []);

  const chrome = useMemo(() => ({ menuOpen: menu === "open", openMenu, closeMenu, lamp, live }), [menu, openMenu, closeMenu, live]);
  const onArchive = displayLocation.pathname.replace(/\/$/, "").endsWith("/archive");
  const dest = reelFor(location.pathname);

  return (
    <BusContext.Provider value={bus}>
      <ChromeContext.Provider value={chrome}>
        <div className={s.root}>
          <Projector ref={lamp} bus={bus} phase={live ? "live" : "leader"} routeKey={displayLocation.pathname} />
          <div className={s.stage} inert={menu || leader ? true : undefined}>
            <Header />
            <Routes location={displayLocation}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="projects" element={<Work />} />
              <Route path="projects/:name" element={<Scene />} />
              <Route path="legacy" element={<Legacy />} />
              <Route path="team" element={<Team />} />
              <Route path="blog" element={<Journal />} />
              <Route path="artwork" element={<Artwork />} />
              <Route path="archive" element={<Archive />} />
              <Route path="contactus" element={<Credits />} />
              <Route path="*" element={<Navigate to={P("/")} replace />} />
            </Routes>
            {!onArchive && <Footer scene={!!reelFor(displayLocation.pathname).scene} />}
          </div>
          {stage !== "idle" && (
            <div className={`${s.splice} ${stage === "cover" ? s.spliceIn : s.spliceOut}`} onAnimationEnd={onSpliceEnd} aria-hidden="true">
              <span className={s.spliceRailT} />
              <span className={s.spliceRailB} />
              <span className={s.spliceNum}>{dest.n}</span>
            </div>
          )}
          <Effects />
          {menu && <Menu closing={menu === "closing"} onClose={closeMenu} onClosed={onMenuClosed} returnFocus={menuFocus.current} />}
          {leader && <Leader getTarget={getLampTarget} onResolve={onResolve} onDone={onLeaderDone} />}
        </div>
      </ChromeContext.Provider>
    </BusContext.Provider>
  );
}
