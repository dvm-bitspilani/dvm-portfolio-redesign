// GLSL for the V8 hologram, adapted from the lab's Holo design (src/lab/designs/holo/scene/shaders.ts).
// All ShaderMaterial (GLSL1-style), linear output, HDR > 1 feeds bloom.
// The mark shaders run in the persistent mark canvas where the mark is exactly 1 unit tall and
// centred on the origin, so the line / tear frequencies are scaled for that (the lab's mark was 1.55).
//
// The pointer's interference wake (uProbe*: mark-local, see Signal.probe in ./common.ts) is a
// soft disc around the pointer with no axis: travelling rings in the carrier, the rolling
// scanlines bent around it, the rim lifted a little, the cloud's dots lifted and twinkling
// faster, more voxels on. Every probe term is multiplied by uProbeOn, so at 0 the hologram is
// exactly its idle self.

/** The wake's shared declarations and ring phase (one definition for the mark's shaders). */
const PROBE = /* glsl */ `
uniform vec3 uProbe;
uniform float uProbeOn;
uniform float uProbeR;
uniform float uProbeKick;
/** Ring frequency (rad per mark unit) and the outward phase speed (rad / s, more on a kick). */
float probePhase(float d){ return d * 92.0 - uTime * (3.0 + uProbeKick * 9.0); }
/** The soft disc: full inside inner * radius, gone at the radius. */
float probeMask(float d, float inner){ return (1.0 - smoothstep(uProbeR * inner, uProbeR, d)) * uProbeOn; }
`

const HASH = /* glsl */ `
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash21(i), hash21(i + vec2(1., 0.)), u.x), mix(hash21(i + vec2(0., 1.)), hash21(i + vec2(1., 1.)), u.x), u.y);
}
`

/* ------------------------------------------------------------------ */
/* Hologram logo (extruded mesh, additive)                              */
/* ------------------------------------------------------------------ */
export const holoVert = /* glsl */ `
uniform float uTime;
uniform float uGlitch;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vLocal;
${HASH}
${PROBE}
void main(){
  vLocal = position;
  // probe: a travelling ring of phase displacement along the normal, so the rim moves a hair
  // (~3 mm at rest, ~6 mm on a kick) instead of only shading
  float pd = length(position.xy - uProbe.xy);
  float pm = probeMask(pd, 0.3);
  vec3 disp = normal * sin(probePhase(pd)) * (0.003 + uProbeKick * 0.003) * pm;
  vec4 wp = modelMatrix * vec4(position + disp, 1.0);
  float tick = floor(uTime * 16.0);
  float slice = floor(wp.y * 34.0);
  float r = hash21(vec2(slice, tick));
  // horizontal tearing slices driven by glitch
  float tear = step(1.0 - (0.015 + uGlitch * 0.55), r) * (hash21(vec2(slice + 7.0, tick)) - 0.5);
  // idle glitch: rare travelling band
  float g = (sin(uTime * 1.3 - wp.y * 3.1) + sin(uTime * 3.7 - wp.y * 7.7) + sin(uTime * 7.9 - wp.y * 14.0)) / 3.0;
  g = smoothstep(0.82, 1.0, g);
  wp.x += tear * (0.026 + uGlitch * 0.45) + g * (hash21(vec2(wp.y * 40.0, tick)) - 0.5) * 0.06;
  wp.z += tear * uGlitch * 0.13;
  vWorld = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const holoFrag = /* glsl */ `
uniform float uTime;
uniform float uGlitch;
uniform float uPower;
uniform float uBuild;
uniform float uFlicker;
uniform vec3 uColor;
uniform vec3 uColorB;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vLocal;
${HASH}
${PROBE}
void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 N = normalize(vNormalW);
  float facing = abs(dot(V, N));
  float fres = ((1.0 - facing) * (1.0 - facing));

  // probe (mark-local, so the disc and the shading agree whatever the turn)
  float pd = length(vLocal.xy - uProbe.xy);
  float pm = probeMask(pd, 0.35);
  float ring = 0.5 + 0.5 * sin(probePhase(pd));

  // scanlines that roll upward (bent into the rings around the probe: up to 0.3 of a line)
  float lines = pow(max(fract(vWorld.y * 59.0 - uTime * 0.55 + (ring - 0.5) * 0.6 * pm), 0.0), 4.0);
  float fine = 0.78 + 0.22 * sin(vWorld.y * 800.0);
  // slow interference bands
  float band = 0.5 + 0.5 * sin(vWorld.y * 5.1 - uTime * 1.6 + sin(uTime * 0.7) * 2.0);
  band = mix(0.55, 1.2, smoothstep(0.1, 0.9, band));
  float grain = hash21(floor(gl_FragCoord.xy * 0.5) + floor(uTime * 30.0));

  float holo = 0.06 + fres * 1.25 + lines * (0.25 + fres * 1.6);
  holo *= band * fine;
  holo += grain * 0.05;
  // probe: interference rings in the carrier (dimmer between them), a faint glow on each ring
  // where the face looks at the camera, and a slightly lifted rim inside the disc
  holo *= mix(1.0, mix(0.8, 1.3, ring * ring), pm);
  holo += pow(max(ring, 0.0), 6.0) * 0.1 * pm;
  holo += fres * 0.4 * pm;

  // flicker (low amplitude + rare dropouts)
  float t = floor(uTime * 24.0);
  float drop = step(0.985, hash11(t)) * 0.55;
  float flick = (0.93 + 0.07 * sin(uTime * 51.0) * sin(uTime * 7.3)) * (1.0 - drop * uFlicker);

  // rim tint: pale on one side of the rim, teal on the other
  float side = clamp(dot(N, vec3(1.0, 0.0, 0.0)) * 0.5 + 0.5, 0.0, 1.0);
  vec3 tint = mix(uColor, uColorB, fres * side * 0.85);
  // the ice tint creeps in inside the disc (still teal, never white under bloom)
  tint = mix(tint, vec3(0.85, 1.0, 1.0), pm * 0.18);

  // build sweep (reboot): local y from -0.5..0.5
  float by = vLocal.y + 0.5;
  float front = uBuild * 1.12 - 0.06;
  float wob = 0.025 * sin(vLocal.x * 46.0 + uTime * 9.0);
  float built = 1.0 - smoothstep(front - 0.004, front + 0.004, by + wob);
  float buildEdge = exp(-(((by + wob - front) / 0.018) * ((by + wob - front) / 0.018))) * step(uBuild, 0.999);

  vec3 col = tint * holo * flick * built;
  col += vec3(0.8, 1.0, 1.0) * buildEdge * 2.6;
  col *= uPower;
  gl_FragColor = vec4(col, 1.0);
}
`

/* ------------------------------------------------------------------ */
/* Logo surface point cloud                                            */
/* ------------------------------------------------------------------ */
export const cloudVert = /* glsl */ `
uniform float uTime;
uniform float uScatter;
uniform float uBuild;
uniform float uSize;
uniform float uPixelRatio;
attribute vec3 aDir;
attribute float aRand;
varying float vAlpha;
${HASH}
${PROBE}
void main(){
  vec3 p = position;
  float by = position.y + 0.5;
  float hidden = smoothstep(uBuild * 1.12 - 0.1, uBuild * 1.12, by);
  float sc = uScatter + hidden * 0.8;
  p += aDir * sc * (0.4 + aRand * 1.6);
  p.x += sin(uTime * 2.0 + aRand * 40.0) * 0.003;
  p.y += cos(uTime * 1.7 + aRand * 30.0) * 0.003;
  // probe: the dots inside the disc lift off the surface (more on a kick) and twinkle faster
  float pd = length(position.xy - uProbe.xy);
  float pm = probeMask(pd, 0.2);
  p += aDir * pm * (0.006 + uProbeKick * 0.02) * (0.5 + aRand);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float twRate = 10.0 + pm * 18.0;
  float tw = step(0.5, hash21(vec2(aRand * 100.0, floor(uTime * twRate + aRand * 7.0))));
  vAlpha = (0.25 + 0.75 * tw) * (1.0 - hidden * 0.7) * (1.0 + pm * 0.6);
  gl_PointSize = uSize * (0.5 + aRand) * uPixelRatio / -mv.z;
}
`

export const cloudFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uPower;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = 1.0 - smoothstep(0.0, 0.5, d);
  gl_FragColor = vec4(uColor * a * a * vAlpha * uPower * 1.4, 1.0);
}
`

/* ------------------------------------------------------------------ */
/* Dust motes inside the light cone                                    */
/* ------------------------------------------------------------------ */
export const dustFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uPower;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.05, 0.5, d);
  gl_FragColor = vec4(uColor * a * vAlpha * uPower * 0.9, 1.0);
}
`

/* ------------------------------------------------------------------ */
/* Voxel dust: instanced cubes that blink in a quantised lattice       */
/* ------------------------------------------------------------------ */
export const voxelVert = /* glsl */ `
uniform float uTime;
uniform float uGlitch;
uniform vec3 uProbe;
uniform float uProbeOn;
attribute float aSeed;
varying float vOn;
varying vec3 vN;
${HASH}
void main(){
  float tick = floor(uTime * 3.0 + aSeed * 5.0);
  // probe: voxels near the pointer blink on more often
  vec3 ip = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float pm = (1.0 - smoothstep(0.12, 0.34, length(ip.xy - uProbe.xy))) * uProbeOn;
  float on = step(0.62 - uGlitch * 0.4 - pm * 0.35, hash21(vec2(aSeed * 91.0, tick)));
  vOn = on;
  vN = normal;
  vec4 wp = modelMatrix * instanceMatrix * vec4(position * on, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const voxelFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uPower;
varying float vOn;
varying vec3 vN;
void main(){
  float shade = 0.55 + 0.45 * abs(vN.y) + 0.25 * abs(vN.x);
  gl_FragColor = vec4(uColor * shade * vOn * uPower * 0.9, 1.0);
}
`

/* ------------------------------------------------------------------ */
/* Volumetric-ish light cone (open cylinder shell)                     */
/* ------------------------------------------------------------------ */
export const coneVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormalW;
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

/* ------------------------------------------------------------------ */
/* Projector lens / emitter face                                       */
/* ------------------------------------------------------------------ */
export const lensVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

/* ------------------------------------------------------------------ */
/* Postprocessing: signal effect (tearing, chroma split, collapse)     */
/* ------------------------------------------------------------------ */
export const signalEffectFrag = /* glsl */ `
uniform float uTime;
uniform float uGlitch;
uniform float uLoss;
uniform float uStatic;
uniform float uAberration;
/** Resting chroma split in output pixels at the buffer edge (0 = none). */
uniform float uRestPx;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

vec2 warp(vec2 uv){
  // horizontal tearing
  float tick = floor(uTime * 20.0);
  float row = floor(uv.y * 48.0);
  float r = h21(vec2(row, tick));
  float tear = step(1.0 - uGlitch * 0.35, r) * (h21(vec2(row + 11.0, tick)) - 0.5);
  uv.x += tear * uGlitch * 0.12;
  // block displacement on strong glitch
  vec2 blk = floor(uv * vec2(14.0, 9.0));
  float br = h21(blk + tick);
  uv += step(1.0 - uGlitch * 0.08, br) * (vec2(h21(blk + 3.1), h21(blk + 5.7)) - 0.5) * 0.05;
  // CRT-style collapse on signal loss: squeeze to a horizontal line
  float sy = max(1.0 - uLoss, 0.004);
  float sx = max(1.0 - smoothstep(0.75, 1.0, uLoss) * 0.98, 0.02);
  return vec2(0.5 + (uv.x - 0.5) / sx, 0.5 + (uv.y - 0.5) / sy);
}

void mainImage(const in vec4 inputColor, const in vec2 uv0, out vec4 outputColor){
  vec2 uv = warp(uv0);
  vec2 c = uv - 0.5;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  // chroma split: a resting hairline defined in output pixels (c * 2 is -1..1 across the buffer)
  // plus the glitch's own split while it tears. Shifted samples stay inside the buffer (no
  // smeared border texels at the edges).
  vec2 off = c * 2.0 * uRestPx * texelSize + c * (uAberration + uGlitch * 0.02) + vec2(uGlitch * 0.006, 0.0);
  vec2 lo = 0.5 * texelSize;
  vec2 hi = 1.0 - lo;
  vec3 col;
  col.r = texture2D(inputBuffer, clamp(uv + off, lo, hi)).r;
  col.g = texture2D(inputBuffer, uv).g;
  col.b = texture2D(inputBuffer, clamp(uv - off, lo, hi)).b;
  col *= inside;

  // global fine scanlines + grain
  float scan = 0.94 + 0.06 * sin(gl_FragCoord.y * 1.6);
  float grain = h21(gl_FragCoord.xy + floor(uTime * 24.0) * 17.0) - 0.5;
  // grain only where there is light, so black stays black (no lifted square around the mark)
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = col * scan + grain * 0.02 * smoothstep(0.0, 0.06, lum);

  // collapse line glow
  vec2 suv = gl_FragCoord.xy / resolution;
  float lineY = exp(-(((suv.y - 0.5) / (0.003 + (1.0 - uLoss) * 0.025)) * ((suv.y - 0.5) / (0.003 + (1.0 - uLoss) * 0.025))));
  float lineX = 1.0 - smoothstep(0.0, 0.5, abs(suv.x - 0.5) * (0.6 + smoothstep(0.75, 1.0, uLoss) * 8.0));
  col += vec3(0.6, 1.0, 1.0) * lineY * lineX * smoothstep(0.35, 0.8, uLoss) * (1.0 - uStatic) * 2.0;

  // static snow
  float snow = h21(floor(gl_FragCoord.xy / 2.0) + floor(uTime * 40.0) * 13.0);
  float band = 0.5 + 0.5 * sin(suv.y * 8.0 + uTime * 30.0);
  col = mix(col, vec3(snow * 0.32 * (0.6 + band * 0.4)) * vec3(0.7, 1.0, 1.0), uStatic * 0.85);

  outputColor = vec4(max(col, 0.0), inputColor.a);
}
`

/* ================================================================== */
/* The projector stage (chrome/holo/Projector.tsx): the original       */
/* projector's beam, dust, lens and table shaders. Fixes over the       */
/* first version that keep its look: smoothstep(e0, e1, x) with e0 > e1 */
/* (undefined in GLSL, black on some drivers) is written as             */
/* 1.0 - smoothstep(e1, e0, x); the dust takes the cone's base height   */
/* and radii as uniforms (it stands on the pedestal's lens).            */
/* ================================================================== */
export const dustVert = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uHeight;
/** World y of the cone's base, and the motes' radius there / at the top. */
uniform float uBaseY;
uniform float uR0;
uniform float uR1;
attribute float aRand;
varying float vAlpha;
void main(){
  vec3 p = position;
  float y = mod(p.y + uTime * (0.05 + aRand * 0.12), uHeight);
  float rad = mix(uR0, uR1, y / uHeight);
  vec2 xz = p.xz * rad;
  xz += vec2(sin(uTime * 0.4 + aRand * 20.0), cos(uTime * 0.3 + aRand * 13.0)) * 0.05;
  vec4 mv = modelViewMatrix * vec4(xz.x, y + uBaseY, xz.y, 1.0);
  gl_Position = projectionMatrix * mv;
  float fade = smoothstep(0.0, 0.25, y) * (1.0 - smoothstep(uHeight * 0.6, uHeight, y));
  vAlpha = fade * (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.0 + aRand * 3.0) + aRand * 50.0)));
  gl_PointSize = (1.0 + aRand * 2.2) * uPixelRatio * 6.0 / -mv.z;
}
`

export const coneFrag = /* glsl */ `
uniform float uTime;
uniform float uPower;
uniform float uIntensity;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormalW;
${HASH}
void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  float facing = abs(dot(normalize(vNormalW), V));
  float body = pow(max(facing, 0.0), 1.6);
  float y = vUv.y;
  float vert = smoothstep(0.0, 0.08, y) * pow(max(1.0 - y, 0.0), 1.35);
  float rays = vnoise(vec2(vUv.x * 64.0, y * 2.0 - uTime * 0.35));
  rays = 0.55 + 0.75 * ((rays) * (rays));
  float shimmer = 0.85 + 0.15 * vnoise(vec2(vUv.x * 12.0 + uTime * 0.2, y * 6.0 - uTime * 1.2));
  float a = body * vert * rays * shimmer * uIntensity * uPower;
  gl_FragColor = vec4(uColor * a, 1.0);
}
`

export const lensFrag = /* glsl */ `
uniform float uTime;
uniform float uPower;
uniform vec3 uColor;
varying vec2 vUv;
${HASH}
#define PI 3.14159265
void main(){
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float a = atan(p.y, abs(p.x) + abs(p.y) < 1e-6 ? 1.0 : p.x);
  if (r > 1.0) discard;
  vec3 col = vec3(0.0);
  col += uColor * exp(-r * r * 60.0) * 6.0;
  col += uColor * exp(-r * 9.0) * 0.6;
  float rings = (1.0 - smoothstep(0.0, 0.012, abs(r - 0.32))) + (1.0 - smoothstep(0.0, 0.008, abs(r - 0.55))) * 0.7 + (1.0 - smoothstep(0.0, 0.015, abs(r - 0.93)));
  col += uColor * rings * 1.4;
  float ticks = step(0.5, fract((a / (2.0 * PI)) * 72.0 + uTime * 0.05));
  ticks *= step(0.68, r) * step(r, 0.78);
  col += uColor * ticks * 0.55;
  float sweep = fract(a / (2.0 * PI) - uTime * 0.18);
  col += uColor * smoothstep(0.82, 1.0, sweep) * step(0.82, r) * step(r, 0.88) * 1.8;
  float pr = fract(uTime * 0.45);
  col += uColor * (1.0 - smoothstep(0.0, 0.03, abs(r - pr))) * (1.0 - pr) * 1.2;
  gl_FragColor = vec4(col * uPower, 1.0);
}
`

export const tableFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uPower;
varying vec2 vUv;
#define PI 3.14159265
void main(){
  vec2 p = (vUv - 0.5) * 16.0;
  float r = length(p);
  float a = atan(p.y, abs(p.x) + abs(p.y) < 1e-6 ? 1.0 : p.x);
  float fade = 1.0 - smoothstep(1.0, 7.5, r);
  float c = 0.0;
  c += (1.0 - smoothstep(0.0, 0.02, abs(r - 1.05))) * 0.9;
  c += (1.0 - smoothstep(0.0, 0.012, abs(r - 1.6))) * 0.5;
  c += (1.0 - smoothstep(0.0, 0.01, abs(r - 2.6))) * 0.35;
  c += (1.0 - smoothstep(0.0, 0.01, abs(r - 4.0))) * 0.22;
  float tk = step(0.92, fract(a / (2.0 * PI) * 48.0)) * step(1.6, r) * step(r, 1.78);
  c += tk * 0.6;
  vec2 g = abs(p);
  c += (1.0 - smoothstep(0.0, 0.012, g.x)) * step(1.7, r) * 0.25;
  c += (1.0 - smoothstep(0.0, 0.012, g.y)) * step(1.7, r) * 0.25;
  vec2 gr = abs(fract(p * 2.0) - 0.5);
  c += (1.0 - smoothstep(0.0, 0.02, min(gr.x, gr.y))) * 0.05;
  float sw = fract(a / (2.0 * PI) + uTime * 0.05);
  c += pow(max(sw, 0.0), 18.0) * (1.0 - smoothstep(1.2, 4.0, r)) * 0.25;
  gl_FragColor = vec4(uColor * c * fade * uPower * 0.55, 1.0);
}
`

/** A flat annulus of fine ticks and segments: the ring turning around the pedestal's lens.
 *  vUv of a RingGeometry is planar: centre (0.5, 0.5), the outer edge at radius 0.5. uInner is
 *  the inner edge as a fraction of the outer radius. */
export const tickRingFrag = /* glsl */ `
uniform float uTime;
uniform float uPower;
uniform float uInner;
uniform vec3 uColor;
varying vec2 vUv;
#define PI 3.14159265
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float a = atan(p.y, abs(p.x) + abs(p.y) < 1e-6 ? 1.0 : p.x) / (2.0 * PI) + 0.5;
  float aa = fwidth(r);
  float t = (r - uInner) / (1.0 - uInner);
  // edges: a fine outer and inner rim
  float rim = (1.0 - smoothstep(0.02, 0.02 + aa * 2.0, abs(t - 0.04))) * 0.7 + (1.0 - smoothstep(0.02, 0.02 + aa * 2.0, abs(t - 0.96))) * 0.9;
  // 144 fine ticks across the middle band, every 12th long
  float tc = a * 144.0;
  float tick = 1.0 - smoothstep(0.1, 0.22, abs(fract(tc) - 0.5));
  float major = step(abs(mod(floor(tc), 12.0)), 0.5);
  tick *= step(mix(0.38, 0.16, major), t) * step(t, 0.82);
  // six segment arcs on the outer band, with gaps
  float seg = step(0.12, fract(a * 6.0)) * step(0.86, t) * step(t, 0.93);
  float c = rim + tick * mix(0.45, 0.9, major) + seg * 0.35;
  gl_FragColor = vec4(uColor * c * uPower, 1.0);
}
`
