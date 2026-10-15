// Session plumbing shared by the desktop and phone shells: the route table (each route
// names the app it opens), the boot/lock phase and the welcome notifications.
import { useCallback, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { blogs, projects, team } from "../../../immersive/data";
import { useNotify } from "./notify";
import { P } from "../lib/paths";
import { MOD } from "../lib/hooks";

export const SESSION = "v4-os-session";
export const isHome = (p) => p.replace(/\/$/, "") === P("/");
const signedIn = () => {
  try {
    return sessionStorage.getItem(SESSION) === "1";
  } catch {
    return false;
  }
};
const setSigned = (v) => {
  try {
    if (v) sessionStorage.setItem(SESSION, "1");
    else sessionStorage.removeItem(SESSION);
  } catch {
    /* private mode */
  }
};

/** The route table, shared by both shells: each route names the app it opens. */
export function OsRoutes({ Target }) {
  return (
    <Routes>
      <Route index element={<Target />} />
      <Route path="about" element={<Target app="about" />} />
      <Route path="projects" element={<Target app="projects" />} />
      <Route path="projects/:slug" element={<Target app="project" />} />
      <Route path="legacy" element={<Target app="legacy" />} />
      <Route path="team" element={<Target app="team" />} />
      <Route path="blog" element={<Target app="blogs" />} />
      <Route path="artwork" element={<Target app="artwork" />} />
      <Route path="archive" element={<Target app="archive" />} />
      <Route path="contactus" element={<Target app="contact" />} />
      <Route path="*" element={<Navigate to={P("/")} replace />} />
    </Routes>
  );
}

/** Boot phase + welcome notifications, shared by desktop and phone. */
export function useSession(launch) {
  const loc = useLocation();
  const { notify } = useNotify();
  const [phase, setPhase] = useState(() => (signedIn() ? "done" : "boot"));
  const [auto, setAuto] = useState(() => !isHome(loc.pathname));

  const welcome = useCallback(() => {
    const phone = window.matchMedia("(max-width: 760px)").matches;
    notify({
      app: "about",
      title: "Welcome to DVM OS",
      body: phone
        ? `${projects.length} projects, ${team.length} people, ${blogs.length} essays. Swipe up on the bar to come home.`
        : `${projects.length} projects, ${team.length} people and ${blogs.length} essays live on this machine. Search everything with ${MOD} K, or right-click the desktop.`,
      ttl: phone ? 3800 : 6500,
      action: phone ? null : { label: "Open Projects", run: () => launch("projects") },
    });
    const latest = [...blogs].sort((a, b) => b.isoDate.localeCompare(a.isoDate))[0];
    setTimeout(
      () =>
        notify({
          app: "blogs",
          source: "Blogs",
          title: latest.shortTitle ?? latest.title,
          body: `Latest essay, by ${latest.authors.join(", ")}`,
          ttl: phone ? 3800 : 6500,
          action: { label: "Read", run: () => launch("blogs", undefined, { props: { select: latest.slug } }) },
        }),
      phone ? 4400 : 2600,
    );
  }, [notify, launch]);

  const onSignedIn = useCallback(() => {
    const first = !signedIn();
    setSigned(true);
    if (first) welcome();
  }, [welcome]);

  return {
    phase,
    setPhase,
    auto,
    onSignedIn,
    lock: () => {
      setAuto(false);
      setPhase("login");
    },
    restart: (before) => {
      before?.();
      setSigned(false);
      setAuto(false);
      setPhase("boot");
    },
  };
}

