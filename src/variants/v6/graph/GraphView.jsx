// React host for the constellation engine. Owns the canvas, the pooled label layer and the
// live mercury mark, which the engine poses over the core node every frame (no React work
// per frame). The mark box is quantised in size and scaled with CSS so zooming does not
// reallocate the mercury canvas every frame.
import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { MercuryLogo, MERCURY_ENVS } from "../../../immersive/kit/mercury";
import { GraphEngine } from "./engine";
import s from "./graph.module.css";

const MARK_K = 2.2;
const FIT = { mode: "height", padding: (1 - 1 / MARK_K) / 2 };
const ENV = { ...MERCURY_ENVS.teal, glass: [1.0, 1.05, 1.07] };
const STEP = Math.log(1.18);

const GraphView = forwardRef(function GraphView({ sim, focus, insets, intro, compact, reduced, onSelect, onExplore, className }, ref) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const labelRef = useRef(null);
  const markRef = useRef(null);
  const mercRef = useRef(null);
  const engineRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onExploreRef = useRef(onExplore);
  onExploreRef.current = onExplore;
  const focusRef = useRef(focus);
  focusRef.current = focus;

  useImperativeHandle(ref, () => ({
    preview: (id) => engineRef.current?.preview(id),
    zoomBy: (f) => engineRef.current?.zoomBy(f),
    fit: () => engineRef.current?.fit(),
    drop: () => mercRef.current?.drop(),
  }));

  useEffect(() => {
    const mark = markRef.current;
    let lastSize = 0;
    const engine = new GraphEngine(boxRef.current, canvasRef.current, sim, {
      reduced,
      compact,
      labelLayer: labelRef.current,
      onSelect: (n) => onSelectRef.current?.(n),
      onExplore: (v) => onExploreRef.current?.(v),
      onCore: ({ x, y, h, opacity }) => {
        const want = Math.max(20, Math.min(compact ? 260 : 440, h * MARK_K));
        const q = Math.round(Math.exp(Math.round(Math.log(want) / STEP) * STEP));
        if (q !== lastSize) {
          mark.style.width = `${q}px`;
          mark.style.height = `${q}px`;
          lastSize = q;
        }
        const sc = want / q;
        mark.style.transform = `translate3d(${(x - q / 2).toFixed(1)}px, ${(y - q / 2).toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
        mark.style.opacity = opacity.toFixed(3);
        mark.style.visibility = opacity < 0.02 ? "hidden" : "visible";
      },
    });
    engine.labelTop = compact ? -20 : 100;
    engineRef.current = engine;
    engine.start(focusRef.current, intro);
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // the engine lives for the lifetime of the view; focus/insets are pushed below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, compact, reduced]);

  useEffect(() => {
    engineRef.current?.setFocus(focus);
  }, [focus]);

  useEffect(() => {
    engineRef.current?.setInsets(insets);
  }, [insets]);

  return (
    <div
      ref={boxRef}
      className={`${s.graph} ${className || ""}`}
      tabIndex={0}
      role="application"
      aria-roledescription="network graph"
      aria-label="DVM network. Drag or use the arrow keys to move, scroll or press plus and minus to zoom, 0 to recentre. Every node is also listed in the panel."
    >
      <canvas ref={canvasRef} className={s.canvas} />
      <div ref={markRef} className={s.mark} aria-hidden="true">
        <MercuryLogo
          ref={mercRef}
          env={ENV}
          fit={FIT}
          intro={intro && !reduced}
          introDelay={0.1}
          shadow={0}
          sheen={0.95}
          tilt={0.8}
          sway={0.7}
          contours={0.9}
          pointerTarget={boxRef}
          interactive
          label="DVM"
        />
      </div>
      <div ref={labelRef} className={s.labels} aria-hidden="true" />
    </div>
  );
});

export default GraphView;
