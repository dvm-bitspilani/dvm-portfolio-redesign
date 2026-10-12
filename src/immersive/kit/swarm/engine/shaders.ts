/**
 * GLSL for the swarm (ported from the DVM hero lab). Simulation = two GPUComputationRenderer variables
 * (textureVelocity, texturePosition). GPUComputationRenderer injects the
 * dependency samplers and the `resolution` define, so they are not declared here.
 *
 * Texel layout
 *   position: xyz = world position, w = per-particle seed (0..1, constant)
 *   velocity: xyz = velocity,       w = brightness carried from the target
 *   target  : xyz = normalised shape point, w = brightness (>= 0) or -1 = ambient dust
 */

// Simplex noise with analytic gradient (Stefan Gustavson / Ashima, MIT).
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoiseGrad(vec3 v, out vec3 gradient){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  vec4 m2 = m * m;
  vec4 m3 = m2 * m;
  vec4 m4 = m2 * m2;
  vec4 pdotx = vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3));
  vec4 temp = m3 * pdotx;
  gradient = -8.0 * (temp.x * x0 + temp.y * x1 + temp.z * x2 + temp.w * x3);
  gradient += m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3;
  gradient *= 105.0;
  return 105.0 * dot(m4, pdotx);
}

// Divergence-free flow: cross product of two noise gradients (Bridson-style).
vec3 curlFlow(vec3 p){
  vec3 g1; vec3 g2;
  snoiseGrad(p, g1);
  snoiseGrad(p + vec3(31.416, -47.853, 12.793), g2);
  return cross(g1, g2) * 0.25;
}
`

const COMMON = /* glsl */ `
uniform float uTime;
uniform float uDt;
uniform float uSnap;
uniform sampler2D uSnapTex;
`

export const velocityShader = /* glsl */ `
${COMMON}
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform vec4 uXA;      // offset.xyz, scale
uniform vec4 uXB;
uniform vec2 uRA;      // spin (y axis), tilt (x axis)
uniform vec2 uRB;
uniform float uMix;
uniform float uStiff;
uniform float uDamp;
uniform float uNoise;
uniform float uNoiseFreq;
uniform float uKick;
uniform float uBurst;
uniform vec3 uBurstOrigin;
uniform vec3 uCursor;
uniform vec3 uCursorVel;
uniform float uCursorOn;
uniform float uCursorRadius;
uniform float uHold;
uniform float uMaxSpeed;
${NOISE}

vec3 xform(vec3 p, vec4 X, vec2 R){
  float c = cos(R.x), s = sin(R.x);
  p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  c = cos(R.y); s = sin(R.y);
  p = vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
  return p * X.w + X.xyz;
}

vec3 hash3(float n){
  return fract(sin(vec3(n, n + 1.7, n + 3.3)) * vec3(43758.5453, 22578.1459, 19642.3490));
}

void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 P = texture2D(texturePosition, uv);
  vec4 V = texture2D(textureVelocity, uv);
  vec4 A = texture2D(uTexA, uv);
  vec4 B = texture2D(uTexB, uv);
  float seed = P.w;
  float dust = step(A.w, -0.5);

  // Staggered morph: each particle departs at its own moment.
  float stagger = fract(seed * 7.31);
  float m = clamp((uMix - stagger * 0.4) / 0.6, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);

  vec3 ta = dust > 0.5 ? A.xyz : xform(A.xyz, uXA, uRA);
  vec3 tb = dust > 0.5 ? B.xyz : xform(B.xyz, uXB, uRB);
  vec3 target = mix(ta, tb, m);
  float bright = dust > 0.5 ? 0.22 + 0.4 * fract(seed * 3.7) : mix(A.w, B.w, m);

  // Cursor field
  vec3 d = P.xyz - uCursor;
  d.z *= 0.5;
  float r2 = dot(d, d);
  float r = sqrt(r2) + 1e-4;
  vec3 n = d / r;
  vec3 tang = vec3(-d.y, d.x, 0.0) / (length(d.xy) + 1e-4);
  float R = uCursorRadius;
  float fall = exp(-r2 / (R * R));
  float well = exp(-r2 / (2.4 * 2.4));

  // Spring towards the formation. Softer for slow particles + during kicks / black hole.
  float k = uStiff * mix(0.45, 1.5, fract(seed * 13.7));
  k *= (1.0 - 0.8 * uKick);
  k *= mix(1.0, 0.05, dust);
  k *= 1.0 - 0.92 * uHold * uCursorOn * well;
  vec3 acc = (target - P.xyz) * k;

  // Curl-noise flow, stronger in the middle of a morph.
  float turb = uNoise * (1.0 + 7.0 * sin(3.14159 * m) + 10.0 * uKick);
  turb *= mix(1.0, 3.0, dust);
  acc += curlFlow(P.xyz * uNoiseFreq + vec3(0.0, uTime * 0.05, uTime * 0.09)) * turb;

  // Repulsor + vortex + wake (released) / accretion black hole (held).
  vec3 push = (n * 13.0 + tang * 7.0) * fall + uCursorVel * 3.0 * fall;
  vec3 hole = (-n * (r - 0.16) * 26.0 + tang * (9.0 + 9.0 * fract(seed * 5.1))) * well;
  acc += mix(push, hole, uHold) * uCursorOn * (1.0 - dust * 0.6);

  V.xyz += acc * uDt;
  V.xyz *= exp(-uDamp * uDt);

  if (uBurst > 0.0) {
    vec3 h = normalize(hash3(seed * 917.0) - 0.5 + 1e-4);
    vec3 away = normalize(P.xyz - uBurstOrigin + 1e-4);
    V.xyz += (h * 0.8 + away) * uBurst * (0.35 + fract(seed * 31.1)) * (1.0 - dust);
  }

  float sp = length(V.xyz);
  if (sp > uMaxSpeed) V.xyz *= uMaxSpeed / sp;
  if (uSnap > 0.5) V.xyz *= dust;

  gl_FragColor = vec4(V.xyz, bright);
}
`

export const positionShader = /* glsl */ `
${COMMON}
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 P = texture2D(texturePosition, uv);
  vec4 V = texture2D(textureVelocity, uv);
  vec3 p = P.xyz + V.xyz * uDt;
  if (uSnap > 0.5) {
    vec4 S = texture2D(uSnapTex, uv);
    if (S.w > -0.5) p = S.xyz;
  }
  gl_FragColor = vec4(p, P.w);
}
`

export const renderVertex = /* glsl */ `
attribute vec2 aRef;
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform float uSize;
uniform float uScale;
uniform float uFocus;
uniform float uAperture;
uniform float uAlpha;
uniform float uHeat;
uniform float uTime;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
varying vec3 vCol;

void main(){
  vec4 P = texture2D(uPos, aRef);
  vec4 V = texture2D(uVel, aRef);
  vec4 mv = modelViewMatrix * vec4(P.xyz, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = max(-mv.z, 0.1);
  float rnd = fract(P.w * 91.7);
  float base = uSize * (0.55 + 1.1 * rnd * rnd) * uScale / depth;
  float coc = abs(depth - uFocus) / depth * uAperture * uScale;
  float size = clamp(base + coc, 1.0, 30.0);
  gl_PointSize = size;
  // Energy-conserving defocus: bigger discs get dimmer.
  float energy = min(1.0, (base * base + 0.6) / (size * size));

  float speed = length(V.xyz);
  float rnd2 = fract(P.w * 53.13);
  float sparkle = pow(rnd2, 7.0);
  float heat = clamp(1.0 - exp(-speed * uHeat) + sparkle * 0.75, 0.0, 1.0);
  vec3 col = mix(uC0, uC1, smoothstep(0.0, 0.3, heat));
  col = mix(col, uC2, smoothstep(0.25, 0.65, heat));
  col = mix(col, uC3, smoothstep(0.6, 1.0, heat));
  float b = max(V.w, 0.0);
  float twinkle = 0.7 + 0.3 * sin(uTime * (1.5 + 2.0 * rnd) + P.w * 211.0);
  vCol = col * b * uAlpha * energy * (1.0 + heat * 1.4) * (1.0 + sparkle * 2.5) * twinkle;
}
`

export const renderFragment = /* glsl */ `
varying vec3 vCol;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d2 = dot(c, c);
  if (d2 > 0.25) discard;
  float a = 1.0 - d2 * 4.0;
  vec3 col = vCol * a * a;
  // Alpha carries brightness so a transparent canvas composites as light (no dark discs).
  gl_FragColor = vec4(col, max(max(col.r, col.g), col.b));
}
`
