import { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { KitHost, VariantHost } from "./immersive/Hosts";
import Hub from "./hub/Hub";
import Switcher from "./hub/Switcher";
import OriginalHost, { LegacyRedirect } from "./hub/OriginalHost";

// The concept lab is only fetched when /lab is opened.
const LabHost = lazy(() => import("./lab/LabHost"));

/*
 * DVM portfolio preview — one app for everything:
 *   /                  hub (src/hub)
 *   /original/*        the original redesign (src/App.jsx, unmodified, under a basename router)
 *   /v/<id>/*          full-site variants (src/variants/<id>)
 *   /lab, /lab/d/<slug>/*  the concept lab (src/lab)
 *   /kit/<name>        component sandboxes (src/immersive/kit/<name>/demo.tsx)
 * The original's old root URLs (/team, /projects/x …) redirect to /original/….
 */
const LEGACY = ["/blog", "/about", "/contactus", "/team", "/projects", "/projects/:name", "/artwork"];

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<Hub />} />
      <Route path="/original/*" element={<OriginalHost />} />
      <Route path="/kit/:name" element={<KitHost />} />
      <Route path="/v/:id/*" element={<VariantHost />} />
      <Route
        path="/lab/*"
        element={
          <Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#050506" }} />}>
            <LabHost />
          </Suspense>
        }
      />
      {LEGACY.map((p) => (
        <Route key={p} path={p} element={<LegacyRedirect />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <Switcher />
  </BrowserRouter>
);
