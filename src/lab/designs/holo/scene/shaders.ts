// GLSL for the HOLO design. All ShaderMaterial (GLSL1-style), linear output, HDR > 1 feeds bloom.

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
void main(){
  vLocal = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float tick = floor(uTime * 16.0);
  float slice = floor(wp.y * 22.0);
  float r = hash21(vec2(slice, tick));
  // horizontal tearing slices driven by glitch
  float tear = step(1.0 - (0.015 + uGlitch * 0.55), r) * (hash21(vec2(slice + 7.0, tick)) - 0.5);
  // idle glitch: rare travelling band
  float g = (sin(uTime * 1.3 - wp.y * 2.0) + sin(uTime * 3.7 - wp.y * 5.0) + sin(uTime * 7.9 - wp.y * 9.0)) / 3.0;
  g = smoothstep(0.82, 1.0, g);
  wp.x += tear * (0.04 + uGlitch * 0.7) + g * (hash21(vec2(wp.y * 40.0, tick)) - 0.5) * 0.09;
  wp.z += tear * uGlitch * 0.2;
  vWorld = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const holoFrag = /* glsl */ `
uniform float uTime;
uniform float uScanY;
uniform float uBand;
uniform float uScanOn;
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
void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 N = normalize(vNormalW);
  float facing = abs(dot(V, N));
  float fres = pow(1.0 - facing, 2.0);

  // world-space scanlines that roll upward
  float lines = pow(fract(vWorld.y * 38.0 - uTime * 0.55), 4.0);
  float fine = 0.78 + 0.22 * sin(vWorld.y * 520.0);
  // slow interference bands
  float band = 0.5 + 0.5 * sin(vWorld.y * 3.3 - uTime * 1.6 + sin(uTime * 0.7) * 2.0);
  band = mix(0.55, 1.2, smoothstep(0.1, 0.9, band));
  float grain = hash21(floor(gl_FragCoord.xy * 0.5) + floor(uTime * 30.0));

  float holo = 0.06 + fres * 1.25 + lines * (0.25 + fres * 1.6);
  holo *= band * fine;
  holo += grain * 0.05;

  // flicker (low amplitude + rare dropouts)
  float t = floor(uTime * 24.0);
  float drop = step(0.985, hash11(t)) * 0.55;
  float flick = (0.93 + 0.07 * sin(uTime * 51.0) * sin(uTime * 7.3)) * (1.0 - drop * uFlicker);

  // chromatic edge tint: violet on one side of the rim, white-cyan on the other
  float side = clamp(dot(N, vec3(1.0, 0.0, 0.0)) * 0.5 + 0.5, 0.0, 1.0);
  vec3 tint = mix(uColor, uColorB, fres * side * 0.85);

  // scanner band: hologram gives way to chrome inside, hot edges at the boundary
  float d = abs(vWorld.y - uScanY);
  float inside = (1.0 - smoothstep(uBand * 0.75, uBand, d)) * uScanOn;
  float edge = exp(-pow((d - uBand) / 0.010, 2.0)) * uScanOn;

  // build sweep (reboot): local y from -0.5..0.5
  float by = vLocal.y + 0.5;
  float front = uBuild * 1.12 - 0.06;
  float wob = 0.025 * sin(vLocal.x * 46.0 + uTime * 9.0);
  float built = 1.0 - smoothstep(front - 0.004, front + 0.004, by + wob);
  float buildEdge = exp(-pow((by + wob - front) / 0.018, 2.0)) * step(uBuild, 0.999);

  vec3 col = tint * holo * flick * (1.0 - inside * 0.92);
  col += vec3(0.75, 1.0, 1.0) * edge * 3.2;
  col *= built;
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
void main(){
  vec3 p = position;
  float by = position.y + 0.5;
  float hidden = smoothstep(uBuild * 1.12 - 0.1, uBuild * 1.12, by);
  float sc = uScatter + hidden * 0.8;
  p += aDir * sc * (0.4 + aRand * 1.6);
  p.x += sin(uTime * 2.0 + aRand * 40.0) * 0.004;
  p.y += cos(uTime * 1.7 + aRand * 30.0) * 0.004;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = step(0.5, hash21(vec2(aRand * 100.0, floor(uTime * 10.0 + aRand * 7.0))));
  vAlpha = (0.25 + 0.75 * tw) * (1.0 - hidden * 0.7);
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
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor * a * a * vAlpha * uPower * 1.4, 1.0);
}
`

/* ------------------------------------------------------------------ */
/* Dust motes inside the light cone                                    */
/* ------------------------------------------------------------------ */
export const dustVert = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uHeight;
attribute float aRand;
varying float vAlpha;
void main(){
  vec3 p = position;
  float y = mod(p.y + uTime * (0.05 + aRand * 0.12), uHeight);
  float rad = mix(0.2, 1.15, y / uHeight);
  vec2 xz = p.xz * rad;
  xz += vec2(sin(uTime * 0.4 + aRand * 20.0), cos(uTime * 0.3 + aRand * 13.0)) * 0.05;
  vec4 mv = modelViewMatrix * vec4(xz.x, y + 0.12, xz.y, 1.0);
  gl_Position = projectionMatrix * mv;
  float fade = smoothstep(0.0, 0.25, y) * smoothstep(uHeight, uHeight * 0.6, y);
  vAlpha = fade * (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.0 + aRand * 3.0) + aRand * 50.0)));
  gl_PointSize = (1.0 + aRand * 2.2) * uPixelRatio * 6.0 / -mv.z;
}
`

export const dustFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uPower;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);
  gl_FragColor = vec4(uColor * a * vAlpha * uPower * 0.9, 1.0);
}
`

/* ------------------------------------------------------------------ */
/* Voxel dust: instanced cubes that blink in a quantised lattice       */
/* ------------------------------------------------------------------ */
export const voxelVert = /* glsl */ `
uniform float uTime;
uniform float uGlitch;
attribute float aSeed;
varying float vOn;
varying vec3 vN;
${HASH}
void main(){
  float tick = floor(uTime * 3.0 + aSeed * 5.0);
  float on = step(0.62 - uGlitch * 0.4, hash21(vec2(aSeed * 91.0, tick)));
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
  // more light where the view ray crosses more of the cone volume
  float body = pow(facing, 1.6);
  float y = vUv.y;
  float vert = smoothstep(0.0, 0.08, y) * pow(1.0 - y, 1.35);
  float rays = vnoise(vec2(vUv.x * 64.0, y * 2.0 - uTime * 0.35));
  rays = 0.55 + 0.75 * pow(rays, 2.0);
  float shimmer = 0.85 + 0.15 * vnoise(vec2(vUv.x * 12.0 + uTime * 0.2, y * 6.0 - uTime * 1.2));
  float a = body * vert * rays * shimmer * uIntensity * uPower;
  gl_FragColor = vec4(uColor * a, 1.0);
}
`

/* ------------------------------------------------------------------ */
/* Projector lens / emitter face                                       */
/* ------------------------------------------------------------------ */
export const lensVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
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
  float a = atan(p.y, p.x);
  if (r > 1.0) discard;
  vec3 col = vec3(0.0);
  // core
  col += uColor * exp(-r * r * 60.0) * 6.0;
  col += uColor * exp(-r * 9.0) * 0.6;
  // concentric rings
  float rings = smoothstep(0.012, 0.0, abs(r - 0.32)) + smoothstep(0.008, 0.0, abs(r - 0.55)) * 0.7 + smoothstep(0.015, 0.0, abs(r - 0.93));
  col += uColor * rings * 1.4;
  // rotating tick marks
  float ticks = step(0.5, fract((a / (2.0 * PI)) * 72.0 + uTime * 0.05));
  ticks *= step(0.68, r) * step(r, 0.78);
  col += uColor * ticks * 0.55;
  // sweeping arc segment
  float sweep = fract(a / (2.0 * PI) - uTime * 0.18);
  col += uColor * smoothstep(0.82, 1.0, sweep) * step(0.82, r) * step(r, 0.88) * 1.8;
  // pulse ring travelling outward
  float pr = fract(uTime * 0.45);
  col += uColor * smoothstep(0.03, 0.0, abs(r - pr)) * (1.0 - pr) * 1.2;
  gl_FragColor = vec4(col * uPower, 1.0);
}
`

/* ------------------------------------------------------------------ */
/* Lab table markings on top of the reflective floor                    */
/* ------------------------------------------------------------------ */
export const tableFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uPower;
varying vec2 vUv;
#define PI 3.14159265
void main(){
  vec2 p = (vUv - 0.5) * 16.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  float fade = smoothstep(7.5, 1.0, r);
  float c = 0.0;
  c += smoothstep(0.02, 0.0, abs(r - 1.05)) * 0.9;
  c += smoothstep(0.012, 0.0, abs(r - 1.6)) * 0.5;
  c += smoothstep(0.01, 0.0, abs(r - 2.6)) * 0.35;
  c += smoothstep(0.01, 0.0, abs(r - 4.0)) * 0.22;
  // radial tick marks on the 1.6 ring
  float tk = step(0.92, fract(a / (2.0 * PI) * 48.0)) * step(1.6, r) * step(r, 1.78);
  c += tk * 0.6;
  // crosshair axes
  vec2 g = abs(p);
  c += smoothstep(0.012, 0.0, g.x) * step(1.7, r) * 0.25;
  c += smoothstep(0.012, 0.0, g.y) * step(1.7, r) * 0.25;
  // fine grid
  vec2 gr = abs(fract(p * 2.0) - 0.5);
  c += smoothstep(0.02, 0.0, min(gr.x, gr.y)) * 0.05;
  // slow radar sweep
  float sw = fract(a / (2.0 * PI) + uTime * 0.05);
  c += pow(sw, 18.0) * smoothstep(4.0, 1.2, r) * 0.25;
  gl_FragColor = vec4(uColor * c * fade * uPower * 0.55, 1.0);
}
`

/* ------------------------------------------------------------------ */
/* Scanner sheet: a horizontal plane of light following the cursor     */
/* ------------------------------------------------------------------ */
export const sheetFrag = /* glsl */ `
uniform float uTime;
uniform float uOn;
uniform vec3 uColor;
varying vec2 vUv;
${HASH}
void main(){
  vec2 p = vUv - 0.5;
  float edge = smoothstep(0.5, 0.18, abs(p.x)) * smoothstep(0.5, 0.1, abs(p.y));
  float lines = 0.85 + 0.15 * sin(vUv.x * 300.0 + uTime * 12.0);
  float n = vnoise(vec2(vUv.x * 30.0 - uTime * 4.0, vUv.y * 4.0));
  gl_FragColor = vec4(uColor * edge * lines * (0.35 + n * 0.5) * uOn * 0.5, 1.0);
}
`

/* ------------------------------------------------------------------ */
/* Image hologram (project cards, portraits, dossier mockups)          */
/* ------------------------------------------------------------------ */
export const imageVert = /* glsl */ `
uniform float uTime;
uniform float uGlitch;
varying vec2 vUv;
varying vec3 vWorld;
${HASH}
void main(){
  vUv = uv;
  vec3 p = position;
  float tick = floor(uTime * 18.0);
  float slice = floor(uv.y * 26.0);
  float r = hash21(vec2(slice, tick));
  p.x += step(1.0 - uGlitch * 0.6, r) * (hash21(vec2(slice, tick + 3.0)) - 0.5) * 0.25 * uGlitch;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const imageFrag = /* glsl */ `
uniform sampler2D uMap;
uniform float uTime;
uniform float uGlitch;
uniform float uSolid;     // 0 = hologram, 1 = materialised true colour
uniform float uOpacity;
uniform float uBuild;
uniform float uScanY;     // world y of scanner, for the in-band materialise
uniform float uBand;
uniform float uScanOn;
uniform vec2 uCover;      // uv scale for object-fit: cover
uniform vec3 uColor;
uniform vec3 uColorB;
varying vec2 vUv;
varying vec3 vWorld;
${HASH}
vec3 samp(vec2 uv){
  vec2 cuv = (uv - 0.5) * uCover + 0.5;
  return texture2D(uMap, cuv).rgb;
}
void main(){
  vec2 uv = vUv;
  float split = 0.003 + uGlitch * 0.03;
  vec3 c;
  c.r = samp(uv + vec2(split, 0.0)).r;
  c.g = samp(uv).g;
  c.b = samp(uv - vec2(split, 0.0)).b;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));

  float lines = 0.72 + 0.28 * sin(vUv.y * 420.0 - uTime * 6.0);
  float roll = pow(fract(vUv.y * 3.0 - uTime * 0.25), 6.0) * 0.35;
  float grain = hash21(floor(gl_FragCoord.xy * 0.5) + floor(uTime * 30.0));
  vec3 holo = mix(uColor * 0.08, uColor * 1.35, pow(lum, 0.85));
  holo = mix(holo, uColorB, smoothstep(0.85, 1.0, lum) * 0.2);
  holo = holo * lines + uColor * roll + grain * 0.04;

  // edge frame glow
  vec2 e = min(vUv, 1.0 - vUv);
  float frame = smoothstep(0.012, 0.0, min(e.x, e.y));
  float corner = step(min(e.x, e.y), 0.006) * step(max(e.x, e.y), 0.08);

  float d = abs(vWorld.y - uScanY);
  float inBand = (1.0 - smoothstep(uBand * 0.8, uBand, d)) * uScanOn;
  float bandEdge = exp(-pow((d - uBand) / 0.008, 2.0)) * uScanOn;
  float solid = max(uSolid, inBand);
  vec3 col = mix(holo, c * 1.02, solid);
  col += uColor * (frame * 0.6 + corner * 2.0);
  col += vec3(0.8, 1.0, 1.0) * bandEdge * 2.0;

  float by = vUv.y;
  float front = uBuild * 1.1 - 0.05;
  float built = 1.0 - smoothstep(front - 0.003, front + 0.003, by);
  float bEdge = exp(-pow((by - front) / 0.012, 2.0)) * step(uBuild, 0.999);
  col = col * built + vec3(0.8, 1.0, 1.0) * bEdge * 2.5;

  float alpha = mix(0.82, 1.0, solid) * built + bEdge;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0) * uOpacity);
}
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
  vec2 off = c * (uAberration + uGlitch * 0.02) + vec2(uGlitch * 0.006, 0.0);
  vec3 col;
  col.r = texture2D(inputBuffer, uv + off).r;
  col.g = texture2D(inputBuffer, uv).g;
  col.b = texture2D(inputBuffer, uv - off).b;
  col *= inside;

  // global fine scanlines + grain
  float scan = 0.94 + 0.06 * sin(gl_FragCoord.y * 1.6);
  float grain = h21(gl_FragCoord.xy + floor(uTime * 24.0) * 17.0) - 0.5;
  col = col * scan + grain * 0.025;

  // collapse line glow
  vec2 suv = gl_FragCoord.xy / resolution;
  float lineY = exp(-pow((suv.y - 0.5) / (0.003 + (1.0 - uLoss) * 0.025), 2.0));
  float lineX = smoothstep(0.5, 0.0, abs(suv.x - 0.5) * (0.6 + smoothstep(0.75, 1.0, uLoss) * 8.0));
  col += vec3(0.6, 1.0, 1.0) * lineY * lineX * smoothstep(0.35, 0.8, uLoss) * (1.0 - uStatic) * 2.0;

  // static snow
  float snow = h21(floor(gl_FragCoord.xy / 2.0) + floor(uTime * 40.0) * 13.0);
  float band = 0.5 + 0.5 * sin(suv.y * 8.0 + uTime * 30.0);
  col = mix(col, vec3(snow * 0.32 * (0.6 + band * 0.4)) * vec3(0.7, 1.0, 1.0), uStatic * 0.85);

  // vignette
  float v = smoothstep(1.05, 0.35, length(c * vec2(1.1, 1.0)));
  col *= mix(0.55, 1.0, v);
  outputColor = vec4(max(col, 0.0), inputColor.a);
}
`
