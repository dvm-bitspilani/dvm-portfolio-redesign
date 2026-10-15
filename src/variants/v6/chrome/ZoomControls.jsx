import s from "./chrome.module.css";

export default function ZoomControls({ api, panel }) {
  return (
    <div className={`${s.zoom} ${panel ? s.zoomPanel : ""}`} role="group" aria-label="Graph view">
      <button type="button" onClick={() => api.current?.zoomBy(1.35)} aria-label="Zoom in">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
      </button>
      <button type="button" onClick={() => api.current?.zoomBy(1 / 1.35)} aria-label="Zoom out">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
      </button>
      <button type="button" onClick={() => api.current?.fit()} aria-label="Recentre on the current focus">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" /><circle cx="8" cy="8" r="1.6" /></svg>
      </button>
    </div>
  );
}
