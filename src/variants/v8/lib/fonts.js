// V8's type system: Hubot Sans throughout (display, title, label and text; the tokens in
// v8.module.css), JetBrains Mono for data (fontsource, imported in index.jsx) and Stretch Pro
// for the wordmark (chrome/chrome.module.css). Hubot is one Google Fonts stylesheet, loaded in
// the visitor's browser (nothing installed), injected before V8's first paint and removed again
// when V8 unmounts. (A stale localStorage["v8:font"] from the old selector is ignored.)
import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { getV8Controls, initV8Controls, subscribeV8Controls } from "../controls";

const LINK_ID = "v8-font-link";
const PRECONNECT_ID = "v8-font-preconnect";
const HUBOT = "https://fonts.googleapis.com/css2?family=Hubot+Sans:wdth,wght@100..125,400..700&display=swap";

/** The faces `document.fonts.load()` warms (display, label, text). */
const PROBES = ['650 expanded 40px "Hubot Sans"', '600 semi-expanded 13px "Hubot Sans"', '450 16px "Hubot Sans"'];

let loading = null;
/** One preconnect and the stylesheet as `<link id="v8-font-link">` (once). Resolves when its
 *  @font-face rules are in (offline / blocked: the stacks fall back to system faces). */
export function ensureFont() {
  if (!loading) {
    loading = new Promise((resolve) => {
      if (!document.getElementById(PRECONNECT_ID)) {
        const pre = document.createElement("link");
        pre.id = PRECONNECT_ID;
        pre.rel = "preconnect";
        pre.href = "https://fonts.gstatic.com";
        pre.crossOrigin = "anonymous";
        document.head.appendChild(pre);
      }
      if (document.getElementById(LINK_ID)) {
        resolve();
        return;
      }
      const link = document.createElement("link");
      link.id = LINK_ID;
      link.rel = "stylesheet";
      link.href = HUBOT;
      link.onload = link.onerror = () => resolve();
      document.head.appendChild(link);
    }).catch(() => {});
  }
  return loading;
}

let ready = null;
/** The stylesheet is in and the display + text faces have loaded (or failed). */
export function fontsReady() {
  if (!ready) {
    ready = ensureFont()
      .then(() => Promise.all(PROBES.map((f) => document.fonts?.load(f).catch(() => null))))
      .catch(() => {})
      .then(() => document.fonts?.ready)
      .catch(() => {});
  }
  return ready;
}

/** Remove the stylesheet again (V8 unmounts). */
function dropFont() {
  document.getElementById(LINK_ID)?.remove();
  document.getElementById(PRECONNECT_ID)?.remove();
  loading = null;
  ready = null;
}

const subscribe = subscribeV8Controls;
const snapshot = getV8Controls;

/** The live controls ({ team }: which version of /team); re-renders on change. */
export function useV8Controls() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * For V8's shell: read the knobs from the URL / storage once as it mounts, and inject the
 * stylesheet before Boot's effects run (layout effects of the shell run before any passive
 * effect in the tree). Removed again when V8 unmounts.
 */
export function useFonts() {
  useLayoutEffect(() => {
    initV8Controls();
    ensureFont();
  }, []);
  useEffect(() => dropFont, []);
}
