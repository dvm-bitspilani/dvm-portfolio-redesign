// The reel bus: one per variant mount, outlives route changes.
// A <Reel> page attaches its viewport + track; the bus owns the travel position, the
// input (wheel / trackpad / keys / drag with inertia on desktop, native scrolling on
// phones), one rAF ticker and the measurements every subscriber needs (frames, hero
// slot, watched elements). Subscribers (lamp, beam, HUD, frame scrubs) never trigger
// React renders per frame: they write to the DOM themselves.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TYPING = "input, textarea, select, [contenteditable], [contenteditable='true']";
const NO_DRAG = "a, button, input, textarea, select, label, iframe, [role='slider'], [data-nodrag], [data-reel-native]";

export class ReelBus {
  mode = "travel"; // travel (desktop, horizontal) | native (phone, vertical scroll)
  attached = false;
  viewport = null;
  track = null;
  pos = 0;
  target = 0;
  max = 0;
  vel = 0; // px / s, smoothed
  size = typeof window !== "undefined" ? window.innerWidth : 1440; // length of the gate along travel
  cross = typeof window !== "undefined" ? window.innerHeight : 900; // the other axis
  frames = [];
  hero = null; // { el, x, y, w, h } in track coordinates
  reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  locked = 0;
  time = 0;
  dragging = false;

  #subs = new Set();
  #frameSubs = new Set();
  #watchers = new Map(); // el → { fn, x, w }
  #raf = 0;
  #last = 0;
  #applied = NaN;
  #dirty = true;
  #measureQueued = 0;
  #ro = null;
  #drag = null;
  #suppressClick = false;
  #wheelAcc = 0;
  #wheelCool = 0;
  #wheelLast = 0;
  #pending = null; // { id, instant } to apply after the first measure
  #frameSig = "";
  #mo = null;
  #lastPos = 0;

  constructor() {
    if (typeof window !== "undefined") {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      mql.addEventListener?.("change", () => (this.reduced = mql.matches));
    }
  }

  // ---------------------------------------------------------------- lifecycle
  attach(viewport, track, { mode = "travel" } = {}) {
    if (this.attached) this.detach();
    this.viewport = viewport;
    this.track = track;
    this.mode = mode;
    this.attached = true;
    this.pos = this.target = 0;
    this.#lastPos = 0;
    this.vel = 0;
    this.#applied = NaN;
    this.#ro = new ResizeObserver(() => this.queueMeasure());
    this.#ro.observe(track);
    this.#ro.observe(viewport);
    // images arriving late change frame widths
    this.#mo = new MutationObserver(() => this.queueMeasure());
    this.#mo.observe(track, { childList: true, subtree: true });
    track.addEventListener("load", this.#onLoad, true);
    if (mode === "travel") {
      window.addEventListener("wheel", this.#onWheel, { passive: false });
      viewport.addEventListener("pointerdown", this.#onDown);
      viewport.addEventListener("click", this.#onClickCapture, true);
      viewport.addEventListener("dragstart", this.#onDragStart);
      viewport.addEventListener("scroll", this.#onStrayScroll);
    } else {
      viewport.addEventListener("scroll", this.#onScroll, { passive: true });
    }
    window.addEventListener("keydown", this.#onKey);
    viewport.addEventListener("focusin", this.#onFocus);
    window.addEventListener("resize", this.queueMeasure);
    this.measure();
    this.#start();
  }

  detach() {
    if (!this.attached) return;
    const { viewport, track } = this;
    this.#ro?.disconnect();
    this.#mo?.disconnect();
    track?.removeEventListener("load", this.#onLoad, true);
    window.removeEventListener("wheel", this.#onWheel);
    window.removeEventListener("keydown", this.#onKey);
    window.removeEventListener("resize", this.queueMeasure);
    window.removeEventListener("pointermove", this.#onMove);
    window.removeEventListener("pointerup", this.#onUp);
    window.removeEventListener("pointercancel", this.#onUp);
    viewport?.removeEventListener("pointerdown", this.#onDown);
    viewport?.removeEventListener("click", this.#onClickCapture, true);
    viewport?.removeEventListener("dragstart", this.#onDragStart);
    viewport?.removeEventListener("scroll", this.#onScroll);
    viewport?.removeEventListener("scroll", this.#onStrayScroll);
    viewport?.removeEventListener("focusin", this.#onFocus);
    cancelAnimationFrame(this.#measureQueued);
    this.#measureQueued = 0;
    this.attached = false;
    this.viewport = this.track = null;
    this.frames = [];
    this.pos = this.target = this.max = this.vel = 0;
    this.dragging = false;
    this.#drag = null;
    this.#emitFrames();
    // keep ticking for subscribers (lamp, beam) — they read `attached`
  }

  // ---------------------------------------------------------------- subscriptions
  subscribe(fn) {
    this.#subs.add(fn);
    this.#start();
    return () => this.#subs.delete(fn);
  }
  onFrames(fn) {
    this.#frameSubs.add(fn);
    fn(this.frames);
    return () => this.#frameSubs.delete(fn);
  }
  /** fn({ p, c, left, w, size }) while the element is near the gate. p: 0 entering → 1 leaving; c: centre offset in gates. */
  watch(el, fn) {
    if (!el) return () => {};
    this.#watchers.set(el, { fn, x: 0, w: 0 });
    this.queueMeasure();
    return () => this.#watchers.delete(el);
  }
  setHero(el) {
    this.hero = el ? { el, x: 0, y: 0, w: 0, h: 0 } : null;
    this.queueMeasure();
  }
  lock() {
    this.locked++;
  }
  unlock() {
    this.locked = Math.max(0, this.locked - 1);
  }

  // ---------------------------------------------------------------- measuring
  queueMeasure = () => {
    if (this.#measureQueued || !this.attached) return;
    this.#measureQueued = requestAnimationFrame(() => {
      this.#measureQueued = 0;
      this.measure();
    });
  };
  #onLoad = () => this.queueMeasure();

  measure() {
    const { viewport, track } = this;
    if (!viewport || !track) return;
    const travel = this.mode === "travel";
    const tr = track.getBoundingClientRect();
    const vr = viewport.getBoundingClientRect();
    this.size = travel ? vr.width : vr.height;
    this.cross = travel ? vr.height : vr.width;
    const len = travel ? tr.width : track.scrollHeight;
    this.max = Math.max(0, Math.round(len - this.size));
    const at = (r) => (travel ? r.left - tr.left : r.top - tr.top);
    this.frames = [...track.querySelectorAll("[data-frame]")].map((el, i) => {
      const r = el.getBoundingClientRect();
      const spot = el.dataset.spot ? el.dataset.spot.split(",").map(Number) : null;
      return {
        el,
        i,
        x: at(r),
        w: travel ? r.width : r.height,
        id: el.dataset.id || "",
        chapter: el.dataset.chapter || "",
        label: el.dataset.label || el.getAttribute("aria-label") || "",
        thumb: el.dataset.thumb || "",
        spot,
      };
    });
    this.#watchers.forEach((w, el) => {
      const r = el.getBoundingClientRect();
      w.x = at(r);
      w.w = travel ? r.width : r.height;
    });
    if (this.hero?.el?.isConnected) {
      const r = this.hero.el.getBoundingClientRect();
      this.hero.w = r.width;
      this.hero.h = r.height;
      if (travel) {
        this.hero.x = r.left - tr.left + r.width / 2;
        this.hero.y = r.top - vr.top + r.height / 2;
      } else {
        this.hero.x = r.left + r.width / 2;
        this.hero.y = r.top - tr.top + r.height / 2;
      }
    }
    this.target = clamp(this.target, 0, this.max);
    if (travel) this.pos = clamp(this.pos, 0, this.max);
    this.#dirty = true;
    this.#applied = NaN;
    this.#emitFrames();
    if (this.#pending && this.frames.length) {
      const { id, instant } = this.#pending;
      this.#pending = null;
      this.goToId(id, { instant });
    }
    this.#start();
  }

  #emitFrames() {
    const sig = this.frames.map((f) => `${f.id}:${Math.round(f.x)}:${Math.round(f.w)}`).join("|") + `#${this.max}#${this.size}`;
    if (sig === this.#frameSig) return;
    this.#frameSig = sig;
    this.#frameSubs.forEach((fn) => fn(this.frames));
  }

  // ---------------------------------------------------------------- navigation
  frameStart(f) {
    if (!f) return 0;
    if (this.mode === "native") return f.x;
    return clamp(f.w < this.size ? f.x - (this.size - f.w) / 2 : f.x, 0, this.max);
  }
  currentIndex() {
    const mid = this.pos + this.size / 2;
    let best = 0;
    let bd = Infinity;
    this.frames.forEach((f, i) => {
      const inside = mid >= f.x && mid <= f.x + f.w;
      const d = inside ? 0 : Math.min(Math.abs(mid - f.x), Math.abs(mid - f.x - f.w));
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }
  go(x, { instant = false } = {}) {
    if (!this.attached) return;
    const t = clamp(x, 0, this.max);
    if (this.mode === "native") {
      this.viewport.scrollTo({ top: t, behavior: instant || this.reduced ? "auto" : "smooth" });
      return;
    }
    this.target = t;
    if (instant || this.reduced) this.pos = t;
    this.#start();
  }
  goToFrame(i, opts) {
    const f = this.frames[clamp(i, 0, this.frames.length - 1)];
    if (f) this.go(this.frameStart(f), opts);
  }
  goToId(id, opts = {}) {
    if (!id) return;
    if (!this.frames.length) {
      this.#pending = { id, ...opts };
      return;
    }
    const f = this.frames.find((fr) => fr.id === id);
    if (f) this.go(this.frameStart(f), opts);
  }
  /** Advance one frame (or most of a screen inside a long take). */
  step(dir) {
    const from = this.mode === "native" ? this.pos : this.target;
    const reach = this.size * 0.86;
    const starts = this.frames.map((f) => this.frameStart(f));
    let t;
    if (dir > 0) {
      const next = starts.filter((s) => s > from + 4).sort((a, b) => a - b)[0];
      t = next === undefined ? this.max : Math.min(next, from + reach);
    } else {
      const prev = starts.filter((s) => s < from - 4).sort((a, b) => b - a)[0];
      t = prev === undefined ? 0 : Math.max(prev, from - reach);
    }
    this.go(t);
  }

  // ---------------------------------------------------------------- input (travel mode)
  #blocked(target) {
    return this.locked > 0 || !this.attached || (target instanceof Element && !!target.closest("[data-reel-native]"));
  }

  #onWheel = (e) => {
    if (e.ctrlKey || this.#blocked(e.target)) return;
    if (!(e.target instanceof Node) || !document.body.contains(e.target)) return;
    e.preventDefault();
    let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (e.shiftKey && !e.deltaX) d = e.deltaY;
    if (e.deltaMode === 1) d *= 32;
    else if (e.deltaMode === 2) d *= this.size;
    if (this.reduced) {
      const now = performance.now();
      if (now - this.#wheelLast > 220) this.#wheelAcc = 0;
      this.#wheelLast = now;
      this.#wheelAcc += d;
      if (now > this.#wheelCool && Math.abs(this.#wheelAcc) > 24) {
        this.step(Math.sign(this.#wheelAcc));
        this.#wheelAcc = 0;
        this.#wheelCool = now + 480;
      }
      return;
    }
    this.target = clamp(this.target + d * 1.1, 0, this.max);
    this.#start();
  };

  #onKey = (e) => {
    if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
    const t = e.target;
    if (this.#blocked(t)) return;
    if (t instanceof Element && t.closest(TYPING)) return;
    const k = e.key;
    let handled = true;
    if (this.mode === "native") {
      // the phone reel scrolls natively; only Home/End are worth taking over
      if (k === "Home") this.go(0);
      else if (k === "End") this.go(this.max);
      else handled = false;
    } else if (k === "ArrowRight" || k === "ArrowDown" || k === "PageDown") this.step(1);
    else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp") this.step(-1);
    else if (k === " " || k === "Spacebar") {
      if (t instanceof Element && t.closest("a, button, [role='button'], summary")) return;
      this.step(e.shiftKey ? -1 : 1);
    } else if (k === "Home") this.go(0);
    else if (k === "End") this.go(this.max);
    else handled = false;
    if (handled) e.preventDefault();
  };

  #onDragStart = (e) => e.preventDefault();

  #onDown = (e) => {
    if (e.button !== 0 || this.#blocked(e.target)) return;
    if (e.target instanceof Element && e.target.closest(NO_DRAG)) return;
    this.#drag = { id: e.pointerId, x: e.clientX, t0: this.target, last: e.clientX, lt: performance.now(), v: 0, moved: false };
    window.addEventListener("pointermove", this.#onMove);
    window.addEventListener("pointerup", this.#onUp);
    window.addEventListener("pointercancel", this.#onUp);
  };
  #onMove = (e) => {
    const d = this.#drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 6) return;
    if (!d.moved) {
      d.moved = true;
      this.dragging = true;
      this.viewport?.setAttribute("data-dragging", "");
      window.getSelection()?.removeAllRanges();
    }
    const now = performance.now();
    const dt = Math.max(1, now - d.lt);
    d.v = d.v * 0.6 + ((e.clientX - d.last) / dt) * 0.4; // px/ms
    d.last = e.clientX;
    d.lt = now;
    this.target = clamp(d.t0 - dx * 1.15, 0, this.max);
    if (!this.reduced) this.pos = this.pos + (this.target - this.pos) * 0.6;
    this.#start();
  };
  #onUp = (e) => {
    const d = this.#drag;
    if (!d || (e.pointerId !== undefined && e.pointerId !== d.id)) return;
    window.removeEventListener("pointermove", this.#onMove);
    window.removeEventListener("pointerup", this.#onUp);
    window.removeEventListener("pointercancel", this.#onUp);
    this.#drag = null;
    this.viewport?.removeAttribute("data-dragging");
    if (d.moved) {
      this.#suppressClick = true;
      setTimeout(() => (this.#suppressClick = false), 0);
      const idle = performance.now() - d.lt > 90;
      if (this.reduced) {
        const dir = Math.sign(d.t0 - this.target) * -1 || 0;
        this.target = d.t0;
        this.pos = d.t0;
        if (dir) this.step(dir);
      } else if (!idle) {
        this.target = clamp(this.target - d.v * 340, 0, this.max);
      }
    }
    this.dragging = false;
    this.#start();
  };
  #onClickCapture = (e) => {
    if (this.#suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      this.#suppressClick = false;
    }
  };
  // overflow: clip should make this impossible; belt and braces against focus scrolling
  #onStrayScroll = () => {
    if (this.viewport && (this.viewport.scrollLeft || this.viewport.scrollTop)) {
      this.viewport.scrollLeft = 0;
      this.viewport.scrollTop = 0;
    }
  };

  #onScroll = () => {
    this.pos = this.target = this.viewport.scrollTop;
    this.#start();
  };

  #onFocus = (e) => {
    if (this.mode !== "travel" || this.dragging) return;
    const el = e.target;
    if (!(el instanceof Element)) return;
    const r = el.getBoundingClientRect();
    if (r.left >= 24 && r.right <= this.size - 24) return;
    const frame = el.closest("[data-frame]");
    const f = frame && this.frames.find((fr) => fr.el === frame);
    if (f && f.w <= this.size) this.go(this.frameStart(f), { instant: true });
    else this.go(this.pos + r.left - this.size * 0.25, { instant: true });
  };

  // ---------------------------------------------------------------- ticker
  #start() {
    if (this.#raf || typeof window === "undefined") return;
    this.#last = performance.now();
    this.#raf = requestAnimationFrame(this.#tick);
  }
  stop() {
    cancelAnimationFrame(this.#raf);
    this.#raf = 0;
  }

  #tick = (now) => {
    this.#raf = 0;
    const dt = Math.min(0.064, Math.max(0.001, (now - this.#last) / 1000));
    this.#last = now;
    this.time += dt;
    const prev = this.#lastPos;
    if (this.attached && this.mode === "travel") {
      if (this.reduced) this.pos = this.target;
      else {
        const k = this.dragging ? 22 : 7.5;
        this.pos += (this.target - this.pos) * (1 - Math.exp(-dt * k));
        if (Math.abs(this.target - this.pos) < 0.08) this.pos = this.target;
      }
    }
    const v = (this.pos - prev) / dt;
    this.vel += (v - this.vel) * Math.min(1, dt * 12);
    if (Math.abs(this.vel) < 0.5 && this.pos === prev) this.vel *= 0.8;

    if (this.attached && this.mode === "travel" && this.track && this.pos !== this.#applied) {
      this.track.style.transform = `translate3d(${(-this.pos).toFixed(2)}px,0,0)`;
      this.#applied = this.pos;
      this.#dirty = true;
    }
    if (this.attached && (this.#dirty || this.pos !== prev)) {
      this.#dirty = false;
      const size = this.size;
      this.#watchers.forEach((w) => {
        const left = w.x - this.pos;
        if (left > size * 1.6 || left + w.w < -size * 0.6) return;
        w.fn({ p: (size - left) / (size + w.w), c: (left + w.w / 2 - size / 2) / size, left, w: w.w, size });
      });
    }
    this.#lastPos = this.pos;
    this.#subs.forEach((fn) => fn(this, dt));
    // keep running while there is a subscriber (lamp / beam need time) or motion
    if (this.#subs.size || this.pos !== this.target) this.#raf = requestAnimationFrame(this.#tick);
  };
}
