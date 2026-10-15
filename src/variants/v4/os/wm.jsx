// Window manager: state (reducer), geometry (snap zones, cascade) and the URL contract.
//   - the URL is always the focused window: opening an app pushes its route, focusing or
//     closing replaces it; closing/minimising the last window lands on the desktop route.
//   - routes call ensure(app, param) so deep links and Back/Forward open/focus windows.
import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { APPS, appById, pathFor, projectBySlug, titleFor, winKey } from "./apps";
import { P } from "../lib/paths";

const WmContext = createContext(null);
export const useWm = () => useContext(WmContext);

export const GAP = 8;
const TITLE_H = 40;

let seq = 0;

const top = (order, id) => [...order.filter((x) => x !== id), id];

export function nextFocus(s, exclude) {
  for (let i = s.order.length - 1; i >= 0; i--) {
    const id = s.order[i];
    const w = s.wins[id];
    if (id !== exclude && w && !w.min && !w.minimizing && !w.closing) return id;
  }
  return null;
}

const patchWin = (s, id, patch) => (s.wins[id] ? { ...s, wins: { ...s.wins, [id]: { ...s.wins[id], ...patch } } } : s);

function reducer(s, a) {
  switch (a.type) {
    case "open": {
      const ex = Object.values(s.wins).find((w) => w.key === a.key && !w.closing);
      if (ex) {
        const patch = { props: a.props ? { ...ex.props, ...a.props, nonce: ++seq } : ex.props };
        if (ex.min || ex.minimizing) Object.assign(patch, { min: false, minimizing: false, restoring: true });
        return { ...patchWin(s, ex.id, patch), order: top(s.order, ex.id), focus: ex.id };
      }
      const id = `${a.key}#${++seq}`;
      const w = {
        id,
        key: a.key,
        app: a.app,
        param: a.param,
        props: a.props || {},
        ...a.rect,
        max: !!a.max,
        snap: null,
        min: false,
        origin: a.origin || null,
        opening: true,
      };
      return { ...s, wins: { ...s.wins, [id]: w }, order: [...s.order, id], focus: id };
    }
    case "focus":
      if (!a.id) return s.focus ? { ...s, focus: null } : s;
      if (!s.wins[a.id]) return s;
      return { ...s, order: top(s.order, a.id), focus: a.id };
    case "patch":
      return patchWin(s, a.id, a.patch);
    case "close": {
      const n = patchWin(s, a.id, { closing: true });
      return { ...n, focus: s.focus === a.id ? nextFocus(s, a.id) : s.focus };
    }
    case "remove": {
      const wins = { ...s.wins };
      delete wins[a.id];
      return { ...s, wins, order: s.order.filter((x) => x !== a.id), focus: s.focus === a.id ? null : s.focus };
    }
    case "minimize": {
      const w = s.wins[a.id];
      if (!w || w.min) return s;
      const n = patchWin(s, a.id, { minimizing: true, restoring: false });
      return { ...n, focus: s.focus === a.id ? nextFocus(s, a.id) : s.focus };
    }
    case "minDone":
      return patchWin(s, a.id, { min: true, minimizing: false });
    case "rects": {
      // batch geometry update (tile / show desktop)
      let n = s;
      for (const [id, patch] of Object.entries(a.rects)) n = patchWin(n, id, patch);
      return n;
    }
    default:
      return s;
  }
}

/** Effective geometry of a window inside the desk (w × h). */
export function geom(win, desk) {
  const W = desk.w;
  const H = desk.h;
  if (win.max) return { x: 0, y: 0, w: W, h: H };
  if (win.snap) return zoneRect(win.snap, desk);
  const w = Math.min(win.w, W);
  const h = Math.min(win.h, H);
  const x = Math.max(-w + 140, Math.min(win.x, W - 140));
  const y = Math.max(0, Math.min(win.y, H - TITLE_H));
  return { x, y, w, h };
}

export function zoneRect(zone, desk) {
  const W = desk.w;
  const H = desk.h;
  const hw = (W - GAP * 3) / 2;
  const hh = (H - GAP * 3) / 2;
  switch (zone) {
    case "max":
      return { x: 0, y: 0, w: W, h: H };
    case "left":
      return { x: GAP, y: GAP, w: hw, h: H - GAP * 2 };
    case "right":
      return { x: GAP * 2 + hw, y: GAP, w: hw, h: H - GAP * 2 };
    case "tl":
      return { x: GAP, y: GAP, w: hw, h: hh };
    case "tr":
      return { x: GAP * 2 + hw, y: GAP, w: hw, h: hh };
    case "bl":
      return { x: GAP, y: GAP * 2 + hh, w: hw, h: hh };
    case "br":
      return { x: GAP * 2 + hw, y: GAP * 2 + hh, w: hw, h: hh };
    default:
      return null;
  }
}

function defaultRect(app, s, desk) {
  const def = appById(app);
  const open = Object.values(s.wins).filter((w) => !w.closing && !w.min).length;
  const [dw, dh] = def.size === "max" ? [desk.w, desk.h] : def.size;
  const w = Math.round(Math.min(dw, desk.w - 48));
  const h = Math.round(Math.min(dh, desk.h - 40));
  const step = (open % 6) * 30;
  // cascade from slightly left of centre so the desktop icons (right column) stay visible
  const x = Math.round(Math.max(16, (desk.w - w) / 2 - 70 + step - 60));
  const y = Math.round(Math.max(12, (desk.h - h) / 2 - 24 + step));
  return { x, y, w, h };
}

export function WmProvider({ children, onNotFound }) {
  const [state, dispatch] = useReducer(reducer, { wins: {}, order: [], focus: null });
  const [desk, setDesk] = useState({ w: 1200, h: 800 });
  const [preview, setPreview] = useState(null); // snap preview zone while dragging
  const navigate = useNavigate();
  const location = useLocation();
  const S = useRef(state);
  S.current = state;
  const D = useRef(desk);
  D.current = desk;
  const L = useRef(location);
  L.current = location;
  const pending = useRef(null);

  const go = useCallback(
    (to, replace) => {
      if (L.current.pathname.replace(/\/$/, "") === to) return;
      navigate(to, { replace });
    },
    [navigate],
  );
  const goWin = useCallback((id) => {
    const w = id && S.current.wins[id];
    go(w ? pathFor(w.app, w.param) : P("/"), true);
  }, [go]);

  const api = useMemo(() => {
    const ensure = (app, param) => {
      if (!app) {
        dispatch({ type: "focus", id: null });
        return;
      }
      if (app === "project" && !projectBySlug(param)) {
        onNotFound?.(param);
        go(P("/projects"), true);
        return;
      }
      const key = winKey(app, param);
      const pend = pending.current?.key === key ? pending.current : null;
      pending.current = null;
      const s = S.current;
      const ex = Object.values(s.wins).find((w) => w.key === key && !w.closing);
      if (ex) {
        if (s.focus !== ex.id || pend?.props || ex.min || ex.minimizing) dispatch({ type: "open", key, props: pend?.props });
        return;
      }
      const def = appById(app);
      dispatch({
        type: "open",
        key,
        app,
        param,
        props: pend?.props,
        origin: pend?.origin,
        rect: defaultRect(app, s, D.current),
        max: def.size === "max" || D.current.w < 700,
      });
    };
    return {
      ensure,
      /** Open (or focus/restore) an app; `origin` is the launching element's rect for the zoom. */
      launch(app, param, opts = {}) {
        const key = winKey(app, param);
        pending.current = { key, origin: opts.origin || null, props: opts.props || null };
        const to = pathFor(app, param);
        if (L.current.pathname.replace(/\/$/, "") === to) ensure(app, param);
        else navigate(to);
      },
      focus(id) {
        if (S.current.focus === id) return;
        dispatch({ type: "focus", id });
        goWin(id);
      },
      close(id) {
        const s = S.current;
        const next = s.focus === id ? nextFocus(s, id) : s.focus;
        dispatch({ type: "close", id });
        if (s.focus === id) goWin(next);
      },
      remove: (id) => dispatch({ type: "remove", id }),
      minimize(id) {
        const s = S.current;
        const next = s.focus === id ? nextFocus(s, id) : s.focus;
        dispatch({ type: "minimize", id });
        if (s.focus === id) goWin(next);
      },
      minDone: (id) => dispatch({ type: "minDone", id }),
      patch: (id, patch) => dispatch({ type: "patch", id, patch }),
      toggleMax(id) {
        const w = S.current.wins[id];
        if (!w) return;
        dispatch({ type: "patch", id, patch: w.max || w.snap ? { max: false, snap: null } : { max: true } });
      },
      snap(id, zone) {
        if (zone === "max") dispatch({ type: "patch", id, patch: { max: true, snap: null } });
        else dispatch({ type: "patch", id, patch: { max: false, snap: zone } });
      },
      setRect(id, r) {
        dispatch({ type: "patch", id, patch: { ...r, max: false, snap: null } });
      },
      /** Restore a minimised window (from the dock) with the reverse genie. */
      restore(id) {
        const w = S.current.wins[id];
        if (!w) return;
        api.launch(w.app, w.param);
      },
      minimizeAll() {
        const s = S.current;
        for (const id of s.order) if (!s.wins[id].min && !s.wins[id].closing) dispatch({ type: "minimize", id });
        go(P("/"), true);
      },
      tile() {
        const s = S.current;
        const ids = s.order.filter((id) => !s.wins[id].min && !s.wins[id].closing && !s.wins[id].minimizing);
        if (!ids.length) return;
        const { w: W, h: H } = D.current;
        const cols = Math.ceil(Math.sqrt(ids.length * (W / H) * 0.62));
        const rows = Math.ceil(ids.length / cols);
        const cw = (W - GAP * (cols + 1)) / cols;
        const ch = (H - GAP * (rows + 1)) / rows;
        const rects = {};
        ids.forEach((id, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          rects[id] = { x: GAP + c * (cw + GAP), y: GAP + r * (ch + GAP), w: cw, h: ch, max: false, snap: null };
        });
        dispatch({ type: "rects", rects });
      },
      closeAll() {
        const s = S.current;
        for (const id of s.order) if (!s.wins[id].closing) dispatch({ type: "close", id });
        go(P("/"), true);
      },
      setDesk,
      setPreview,
      titleFor,
    };
  }, [go, goWin, navigate, onNotFound]);

  const value = useMemo(() => ({ ...api, state, desk, preview }), [api, state, desk, preview]);
  return <WmContext.Provider value={value}>{children}</WmContext.Provider>;
}

export { APPS };
