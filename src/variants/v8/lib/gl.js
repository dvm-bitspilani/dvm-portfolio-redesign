// Whether this browser can make a WebGL2 context at all (cached after the first ask). The
// scroll-driven home stages check it before choosing their pinned WebGL layout; without it they
// use their plain page-flow layout instead.
let webgl2 = null;

export function hasWebGL2() {
  if (webgl2 === null) {
    try {
      webgl2 = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      webgl2 = false;
    }
  }
  return webgl2;
}
