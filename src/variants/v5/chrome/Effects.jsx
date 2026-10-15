// Projection artefacts, kept quiet: film grain (one generated noise tile jumping
// position on a CSS step animation, no JS per frame), a lens vignette, and light leaks
// that only flare at the edges while the strip is travelling fast. All off with
// prefers-reduced-motion.
import { useEffect, useRef, useState } from "react";
import { useBus } from "../reel/context";
import s from "./effects.module.css";

function makeNoise(size = 200) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.random() < 0.5 ? 0 : 255 * Math.random();
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

export default function Effects() {
  const bus = useBus();
  const [noise, setNoise] = useState(null);
  const leakL = useRef(null);
  const leakR = useRef(null);

  useEffect(() => {
    setNoise(makeNoise());
  }, []);

  useEffect(() => {
    let last = -1;
    return bus.subscribe((b) => {
      if (b.reduced) return;
      const v = b.vel;
      const amt = Math.min(1, Math.abs(v) / 4200);
      const q = Math.round(amt * 100);
      if (q === last) return;
      last = q;
      // light enters from the side the film is coming from
      if (leakR.current) leakR.current.style.opacity = (v > 0 ? amt : amt * 0.25).toFixed(3);
      if (leakL.current) leakL.current.style.opacity = (v < 0 ? amt : amt * 0.25).toFixed(3);
    });
  }, [bus]);

  return (
    <div className={s.fx} aria-hidden="true">
      <div className={s.vignette} />
      <div ref={leakL} className={`${s.leak} ${s.leakL}`} />
      <div ref={leakR} className={`${s.leak} ${s.leakR}`} />
      {noise && <div className={s.grain} style={{ backgroundImage: `url(${noise})` }} />}
    </div>
  );
}
