// The mercury lake under the V2 hero horizon (2D canvas, no WebGL).
//  - the 30px sky grid continues below the waterline, bending into perspective
//  - the outlined DVM letters are mirrored in the surface, rippling row by row
//  - clicks (bead drops) send elliptical rings across the surface
// No per-frame allocations; pauses off-screen / in hidden tabs; one static frame
// under prefers-reduced-motion.

const TAU = Math.PI * 2;
const MAX_RINGS = 8;

export class Lake {
  constructor(canvas, { reduced = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.reduced = reduced;
    this.w = 1;
    this.h = 1;
    this.dpr = 1;
    this.t = 0;
    this.last = 0;
    this.raf = 0;
    this.visible = true;
    this.running = false;
    // live parameters (mutated from GSAP)
    this.state = { reveal: reduced ? 1 : 0, sink: 0, energy: 0, fade: 1 };
    // layout (CSS px, relative to the canvas): letters box as it stands above the waterline
    this.letters = { img: null, x: 0, w: 0, h: 0 };
    this.markX = 0.5;
    this.gridGap = 30;
    this.off = document.createElement("canvas");
    this.offCtx = this.off.getContext("2d");
    this.rings = Array.from({ length: MAX_RINGS }, () => ({ x: 0, t: -1, a: 0 }));
    this.ringIdx = 0;
    this.frame = this.frame.bind(this);
    this.onVis = () => this.kick();
    document.addEventListener("visibilitychange", this.onVis);
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.kick();
    });
    this.io.observe(canvas);
  }

  resize(w, h) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.bakeLetters();
    this.draw();
  }

  setLetters(img, x, w, h) {
    this.letters = { img, x, w, h };
    this.bakeLetters();
    this.draw();
  }

  /** Mirror the letters once at display size so each frame is plain strip copies. */
  bakeLetters() {
    const L = this.letters;
    if (!L.img || L.w < 2 || L.h < 2) return;
    const d = this.dpr;
    const ow = Math.round(L.w * d), oh = Math.round(L.h * d);
    if (this.off.width !== ow) this.off.width = ow;
    if (this.off.height !== oh) this.off.height = oh;
    const c = this.offCtx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, ow, oh);
    c.setTransform(d, 0, 0, -d, 0, oh);
    c.drawImage(L.img, 0, 0, L.w, L.h);
    // brighten the hairline outline a touch and tint it teal
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = "rgba(120, 230, 250, 0.55)";
    c.fillRect(0, 0, ow, oh);
    c.globalCompositeOperation = "source-over";
  }

  ring(xCss) {
    const r = this.rings[this.ringIdx++ % MAX_RINGS];
    r.x = xCss;
    r.t = this.t;
    r.a = 1;
    this.state.energy = Math.min(1.6, this.state.energy + 0.8);
    this.kick();
  }

  kick() {
    if (this.reduced) {
      this.draw();
      return;
    }
    const should = this.visible && !document.hidden;
    if (should && !this.running) {
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    } else if (!should && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this.state.energy *= Math.exp(-dt * 0.9);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  }

  draw() {
    const { ctx, w, h, dpr, t } = this;
    const S = this.state;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (S.fade <= 0.001) return;
    ctx.globalAlpha = 1;

    // ---- perspective grid: sky lines bend at the waterline toward a vanishing point under the mark
    const reveal = S.reveal;
    const vx = w * this.markX;
    const depth = h * reveal;
    const spread = 3.2;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.globalAlpha = S.fade;
    ctx.beginPath();
    for (let x = 0; x <= w; x += this.gridGap) {
      const xb = vx + (x - vx) * spread;
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5 + (xb - x) * reveal, depth);
    }
    ctx.stroke();
    // receding cross lines, drifting toward the viewer
    ctx.strokeStyle = "rgba(95,212,230,0.1)";
    ctx.beginPath();
    const n = 9;
    const drift = this.reduced ? 0 : (t * 0.06) % 1;
    for (let i = 0; i < n; i++) {
      const k = (i + drift) / n;
      const y = h * k * k * reveal;
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();
    // fade the grid into the deep: paint a vertical alpha ramp over it
    ctx.globalCompositeOperation = "destination-out";
    if (!this.fadeGrad || this.fadeH !== h) {
      this.fadeGrad = ctx.createLinearGradient(0, 0, 0, h);
      this.fadeGrad.addColorStop(0, "rgba(0,0,0,0)");
      this.fadeGrad.addColorStop(1, "rgba(0,0,0,0.92)");
      this.fadeH = h;
    }
    ctx.fillStyle = this.fadeGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";

    // ---- mirrored letters, strip by strip with a travelling ripple
    const L = this.letters;
    if (L.img && this.off.width > 1) {
      const squash = 0.82; // the surface foreshortens the reflection
      const sink = S.sink; // letters sinking (scroll): their reflection shortens with them
      const visibleH = L.h * (1 - sink);
      const reflH = Math.min(h, visibleH * squash) * reveal;
      const step = 2;
      const e = 1 + S.energy * 2.4;
      for (let y = 0; y < reflH; y += step) {
        const k = y / Math.max(1, reflH);
        const amp = (0.6 + k * 7) * e;
        let dx = Math.sin(y * 0.11 - t * 2.4) * amp + Math.sin(y * 0.037 + t * 1.15) * amp * 0.7;
        // ring wakes push the strips sideways too
        for (let r = 0; r < MAX_RINGS; r++) {
          const R = this.rings[r];
          if (R.a <= 0) continue;
          const age = t - R.t;
          const rad = age * 260;
          const ry = rad * 0.22;
          const d = Math.abs(y - ry);
          if (d < 14) dx += Math.sin(d * 0.5) * 6 * R.a * (1 - d / 14);
        }
        const srcY = (y / squash + sink * L.h) * this.dpr;
        const srcH = (step / squash) * this.dpr;
        if (srcY + srcH > this.off.height) break;
        ctx.globalAlpha = S.fade * 0.85 * Math.pow(1 - k, 1.6);
        ctx.drawImage(this.off, 0, srcY, this.off.width, srcH, L.x + dx, y, L.w, step);
      }
      ctx.globalAlpha = 1;
    }

    // ---- rings on the surface
    ctx.lineWidth = 1;
    for (let r = 0; r < MAX_RINGS; r++) {
      const R = this.rings[r];
      if (R.a <= 0) continue;
      const age = t - R.t;
      R.a = Math.max(0, 1 - age / 2.6);
      if (R.a <= 0) continue;
      for (let j = 0; j < 3; j++) {
        const rad = age * 260 - j * 26;
        if (rad <= 2) continue;
        ctx.strokeStyle = `rgba(160, 238, 255, ${(0.42 * R.a * (1 - j * 0.28) * S.fade).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(R.x, 6, rad, rad * 0.22, 0, 0, TAU);
        ctx.stroke();
      }
    }
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    document.removeEventListener("visibilitychange", this.onVis);
    this.off.width = this.off.height = 0;
  }
}
