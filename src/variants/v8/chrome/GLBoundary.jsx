// A DOM error boundary around one WebGL canvas: a decorative view that cannot render (no WebGL,
// renderer creation fails, the context is lost) shows its static fallback instead of taking the
// page down, and gets fresh attempts before it gives up:
//   lossRetries   fresh canvases after a lost context (default 1), RETRY_MS apart
//   errorRetries  fresh canvases after a thrown error (default 0: most errors would throw again;
//                 the hero stage opts in, its parts degrade on their own first)
// The counts start over once a canvas has run for HEALTHY_MS without failing, so a long visit
// (a phone that drops the context each time it is backgrounded) never runs out of retries.
// `onFail(error, { final })` fires on every failure (`final`: no more attempts); `onRecover()`
// when a fresh canvas is mounted.
//
//   <GLBoundary fallback={<Static />} onFail={…} onRecover={…}>
//     {(onLost, attempt) => <Canvas key={attempt} onCreated={useContextLoss(onLost)} … />}
//   </GLBoundary>
import { Component } from "react";

const RETRY_MS = 1500;
const HEALTHY_MS = 60000;

export default class GLBoundary extends Component {
  state = { failed: false, attempt: 0 };
  retry = 0;
  losses = 0;
  errors = 0;
  lastFail = 0;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn("[v8] a WebGL view failed; showing its static fallback.", error);
    this.fail(error, "errors", this.props.errorRetries ?? 0);
  }

  componentWillUnmount() {
    window.clearTimeout(this.retry);
  }

  lost = () => {
    if (this.state.failed) return;
    this.setState({ failed: true });
    this.fail(new Error("WebGL context lost"), "losses", this.props.lossRetries ?? 1);
  };

  fail(error, counter, max) {
    const now = performance.now();
    if (now - this.lastFail > HEALTHY_MS) {
      this.losses = 0;
      this.errors = 0;
    }
    this.lastFail = now;
    const final = this[counter] >= max;
    this[counter]++;
    this.props.onFail?.(error, { final });
    if (final) return;
    window.clearTimeout(this.retry);
    // (a little longer for each attempt)
    this.retry = window.setTimeout(() => {
      this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));
      this.props.onRecover?.();
    }, RETRY_MS * this[counter]);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children(this.lost, this.state.attempt);
  }
}
