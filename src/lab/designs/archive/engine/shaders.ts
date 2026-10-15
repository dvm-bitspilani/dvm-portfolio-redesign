// GLSL for the wall. All shaders are GLSL3 (three's ShaderMaterial with glslVersion = GLSL3),
// written in css-pixel / cell units. World y grows downward.

export const MAX_PAGES = 6

const COMMON = /* glsl */ `
  uniform vec2 uCam;      // camera centre in cells
  uniform float uZoom;    // css px per cell
  uniform vec2 uView;     // viewport in css px
  uniform vec2 uPeriod;   // wall period in cells
  uniform float uTime;
`

export const fullscreenVert = /* glsl */ `
  out vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// ------------------------------------------------------------------ background
export const bgFrag = /* glsl */ `
  precision highp float;
  layout(location = 0) out highp vec4 outColor;
  ${COMMON}
  uniform float uDpr;
  uniform vec2 uPoly[32];
  uniform ivec2 uPolyN;
  uniform sampler2D uCentre;
  uniform sampler2D uGlyphs;
  uniform float uGlyphAspect;
  uniform vec4 uCentreRect;   // x, y, w, h (cells)
  uniform float uMarkHover;
  uniform float uMarkDim;
  uniform float uMotion;      // 0 when reduced motion

  const vec3 BG = vec3(0.086, 0.090, 0.102);
  const vec3 ACCENT = vec3(0.302, 0.486, 1.0);
  const vec3 INK = vec3(0.933, 0.941, 0.957);

  // Exact signed distance to a polygon (iq), negative inside.
  float sdPoly(vec2 p, int off, int n) {
    float d = 1e9;
    float s = 1.0;
    for (int k = 0; k < 24; k++) {
      if (k >= n) break;
      int jj = k == 0 ? n - 1 : k - 1;
      vec2 vi = uPoly[off + k], vj = uPoly[off + jj];
      vec2 e = vj - vi, w = p - vi;
      vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
      d = min(d, dot(b, b));
      bvec3 c = bvec3(p.y >= vi.y, p.y < vj.y, e.x * w.y > e.y * w.x);
      if (all(c) || all(not(c))) s *= -1.0;
    }
    return s * sqrt(d);
  }

  // glyph index: 0-9 digits, 10 minus, 11 comma, 12 space
  float glyph(int g, vec2 p) {
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return 0.0;
    vec2 uv = vec2((float(g) + p.x) / 13.0, p.y);
    return texture(uGlyphs, uv).a;
  }

  float label(ivec2 v, vec2 p, float charW) {
    // Build "x, y" right here; up to 12 chars.
    int chars[14];
    int n = 0;
    for (int k = 0; k < 2; k++) {
      int val = k == 0 ? v.x : v.y;
      if (val < 0) { chars[n++] = 10; val = -val; }
      int digs[6];
      int c = 0;
      do { digs[c++] = val % 10; val /= 10; } while (val > 0 && c < 6);
      for (int i = c - 1; i >= 0; i--) chars[n++] = digs[i];
      if (k == 0) { chars[n++] = 11; chars[n++] = 12; }
    }
    int i = int(floor(p.x / charW));
    if (i < 0 || i >= n) return 0.0;
    return glyph(chars[i], vec2(fract(p.x / charW), p.y));
  }

  void main() {
    vec2 frag = vec2(gl_FragCoord.x, uView.y * uDpr - gl_FragCoord.y) / uDpr;
    vec2 wp = uCam + (frag - uView * 0.5) / uZoom;
    vec3 col = BG;

    // Registration crosses at every cell corner; they fade out when zoomed far out.
    vec2 g = abs(wp - floor(wp + 0.5)) * uZoom;
    float arm = clamp(uZoom * 0.05, 2.0, 5.5);
    float cx = (1.0 - smoothstep(0.3, 0.9, g.x)) * (1.0 - smoothstep(arm - 0.5, arm + 0.5, g.y));
    float cy = (1.0 - smoothstep(0.3, 0.9, g.y)) * (1.0 - smoothstep(arm - 0.5, arm + 0.5, g.x));
    col = mix(col, vec3(0.25, 0.26, 0.29), max(cx, cy) * smoothstep(14.0, 36.0, uZoom));

    // Nearest origin copy.
    vec2 sector = floor(wp / uPeriod + 0.5);
    vec2 lp = wp - sector * uPeriod;
    float px = 1.0 / uZoom; // one css px in cells

    // Centre block mask with a soft 1.2-cell falloff for the contours.
    vec2 bmin = uCentreRect.xy, bmax = uCentreRect.xy + uCentreRect.zw;
    vec2 outside = max(bmin - lp, lp - bmax);
    float blockSoft = 1.0 - smoothstep(-1.2, 0.0, max(outside.x, outside.y));

    // Mark SDF (distance in cells), only evaluated around the centre block.
    float d = 99.0;
    if (blockSoft > 0.0) d = min(sdPoly(lp, 0, uPolyN.x), sdPoly(lp, uPolyN.x, uPolyN.y));

    float home = (sector == vec2(0.0)) ? 1.0 : 0.62;

    if (blockSoft > 0.0 && d < 90.0) {
      // Topographic contours radiating from the mark, every 4th one heavier.
      float sp = 0.28;
      float f = d / sp - uTime * 0.12 * uMotion;
      float fw = fwidth(f);
      float dl = abs(fract(f + 0.5) - 0.5);
      float line = 1.0 - smoothstep(fw * 0.5, fw * 1.5, dl);
      float idx = floor(f + 0.5);
      float major = mod(idx + floor(uTime * 0.12 * uMotion + 0.5), 4.0) < 0.5 ? 1.0 : 0.0;
      float fade = exp(-max(d, 0.0) * 0.38) * blockSoft * step(0.0, d);
      vec3 lineCol = mix(vec3(0.36, 0.40, 0.50), ACCENT, 0.35 + 0.4 * major);
      col = mix(col, lineCol, line * fade * (0.28 + 0.32 * major) * home);

      // Accent keyline hugging the mark.
      float kl = 1.0 - smoothstep(0.6 * px, 1.6 * px, abs(d - 0.14));
      col = mix(col, ACCENT, kl * (0.55 + 0.45 * uMarkHover) * home);

      // The mark.
      float fill = 1.0 - smoothstep(-0.75 * px, 0.75 * px, d);
      vec3 ink = mix(INK, mix(INK, ACCENT, 0.1), uMarkHover);
      ink *= 0.92 + 0.08 * smoothstep(-0.9, 0.0, d); // faint inner rim
      col = mix(col, ink * mix(1.0, 0.78, 1.0 - home), fill);
    }

    // Static furniture (frame, name, copy).
    vec2 bq = (lp - bmin) / uCentreRect.zw;
    if (all(greaterThanEqual(bq, vec2(0.0))) && all(lessThan(bq, vec2(1.0)))) {
      vec4 t = texture(uCentre, bq);
      col = mix(col, t.rgb, t.a * mix(0.75, 1.0, home));

      // Live coordinate label of this origin copy, top-left inside the frame.
      float lh = 0.24; // cells
      vec2 lpos = (lp - (bmin + vec2(0.55, 0.5))) / lh;
      ivec2 coord = ivec2(int(sector.x * uPeriod.x), int(-sector.y * uPeriod.y));
      float lab = label(coord, lpos, uGlyphAspect * 0.92);
      col = mix(col, ACCENT, lab);
    }

    // Origin crosshair.
    vec2 o = abs(lp) * uZoom;
    float ch = (1.0 - smoothstep(0.4, 1.2, o.x)) * (1.0 - smoothstep(6.0, 7.0, o.y));
    ch = max(ch, (1.0 - smoothstep(0.4, 1.2, o.y)) * (1.0 - smoothstep(6.0, 7.0, o.x)));
    col = mix(col, ACCENT, ch * home);

    col = mix(col, BG, uMarkDim * 0.6);
    outColor = vec4(col, 1.0);
  }
`

// ------------------------------------------------------------------ tiles
export const tileVert = /* glsl */ `
  precision highp float;
  precision highp int;
  ${COMMON}
  uniform sampler2D uData;
  uniform int uN;
  uniform int uCopies;     // 1 or 3 (per axis)
  uniform int uOnly;       // >= 0: draw just this item (lift / focus passes)
  uniform vec2 uAnchor;    // wrap reference for single-item passes
  uniform float uPadPx;    // extra quad margin for the drop shadow
  uniform float uGap;      // gutter in cells

  out vec2 vQ;
  out vec2 vSizePx;
  flat out int vItem;
  flat out vec4 vUvR;
  flat out vec4 vS2;
  flat out vec4 vS3;

  void main() {
    int id = gl_InstanceID;
    int item = uOnly >= 0 ? uOnly : id % uN;
    int copy = uOnly >= 0 ? 0 : id / uN;
    vec4 r = texelFetch(uData, ivec2(item, 0), 0);
    vUvR = texelFetch(uData, ivec2(item, 1), 0);
    vS2 = texelFetch(uData, ivec2(item, 2), 0);
    vS3 = texelFetch(uData, ivec2(item, 3), 0);
    vItem = item;

    vec2 ref = uOnly >= 0 ? uAnchor : uCam;
    vec2 c = r.xy + r.zw * 0.5;
    vec2 d = c - ref;
    d -= uPeriod * floor(d / uPeriod + 0.5);
    int half_ = uCopies / 2;
    vec2 off = vec2(float(copy % uCopies - half_), float(copy / uCopies - half_));
    vec2 wc = ref + d + off * uPeriod;

    float scale = vS3.x * (1.0 + 0.07 * vS3.y);
    vec2 size = max(r.zw - uGap, vec2(0.0)) * scale;
    vSizePx = size * uZoom;
    vec2 full = vSizePx + 2.0 * uPadPx;
    vQ = vec2(position.x + 0.5, 0.5 - position.y);
    vec2 sp = (wc - uCam) * uZoom + (vQ - 0.5) * full;
    gl_Position = vec4(sp.x / (uView.x * 0.5), -sp.y / (uView.y * 0.5), 0.0, 1.0);
  }
`

const pageSamplers = Array.from({ length: MAX_PAGES }, (_, i) => `uniform sampler2D uP${i};`).join('\n')
const pageSwitch = Array.from(
  { length: MAX_PAGES },
  (_, i) => `${i ? 'else ' : ''}if (page == ${i}) img = textureGrad(uP${i}, auv, ddx, ddy).rgb;`,
).join('\n')

export const tileFrag = /* glsl */ `
  precision highp float;
  layout(location = 0) out highp vec4 outColor;
  precision highp int;
  ${COMMON}
  ${pageSamplers}
  uniform int uMode;        // 0 wall, 1 lifted (hover), 2 focused
  uniform float uPadPx;
  uniform sampler2D uHi;
  uniform float uHiReady;
  uniform vec4 uHiCrop;

  in vec2 vQ;
  in vec2 vSizePx;
  flat in int vItem;
  flat in vec4 vUvR;
  flat in vec4 vS2;
  flat in vec4 vS3;

  const vec3 BG = vec3(0.086, 0.090, 0.102);
  const vec3 ACCENT = vec3(0.302, 0.486, 1.0);

  float sdRect(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float sdTri(vec2 p, float r) {
    const float k = 1.7320508;
    p.x = abs(p.x) - r;
    p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
  }

  void main() {
    vec2 full = vSizePx + 2.0 * uPadPx;
    vec2 p = vQ * full - full * 0.5;
    float d = sdRect(p, vSizePx * 0.5, min(2.5, vSizePx.x * 0.1));
    float a = clamp(0.5 - d, 0.0, 1.0);

    vec2 tq = clamp((p + vSizePx * 0.5) / max(vSizePx, vec2(1.0)), 0.0, 1.0);
    vec2 auv = mix(vUvR.xy, vUvR.zw, tq);
    vec2 ddx = dFdx(auv), ddy = dFdy(auv);
    int page = int(vS2.x + 0.5);
    vec3 img = BG;
    ${pageSwitch}

    // Placeholder: hatched plate with a slow sweep, until the image lands.
    vec2 lp = p + vSizePx * 0.5;
    float hs = (lp.x + lp.y) / 7.0;
    float hw = fwidth(hs);
    float stripe = 1.0 - smoothstep(0.0, hw * 1.5, abs(fract(hs) - 0.5) - 0.38);
    vec3 ph = mix(vec3(0.115, 0.12, 0.135), vec3(0.17, 0.18, 0.205), stripe);
    float sweepX = fract(uTime * 0.28 + float(vItem) * 0.0137) * 2.4 - 0.7;
    ph += exp(-pow((tq.x + tq.y) * 0.5 - sweepX, 2.0) * 30.0) * 0.04;
    float load = vS2.y;
    vec3 col = mix(ph, img, load);

    if (uMode == 2 && uHiReady > 0.0) {
      vec3 hi = texture(uHi, mix(uHiCrop.xy, uHiCrop.zw, tq)).rgb;
      col = mix(col, hi, uHiReady);
    }

    int kind = int(vS2.z + 0.5);
    // Film tiles carry a play glyph.
    if (kind == 1 && vSizePx.y > 60.0) {
      vec2 gp = lp - vec2(22.0, vSizePx.y - 22.0);
      float disc = length(gp) - 13.0;
      col = mix(col, vec3(0.05), (1.0 - smoothstep(-0.8, 0.8, disc)) * 0.72);
      float tri = sdTri(vec2(-gp.y, gp.x - 1.5), 5.0);
      col = mix(col, vec3(1.0), 1.0 - smoothstep(-0.7, 0.7, tri));
    }

    // Filtered out: recede into the graphite.
    float dim = vS2.w;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, mix(BG, vec3(lum), 0.16), dim * 0.88);
    // Something else is in focus.
    col = mix(col, BG, vS3.z * 0.72);

    float hov = vS3.y;
    col *= 1.0 + hov * 0.05;
    float ring = (1.0 - smoothstep(0.0, 1.0, abs(d + 1.0) - 0.5)) * hov;
    col = mix(col, ACCENT, ring * (uMode == 2 ? 0.0 : 1.0));

    float alpha = a;
    if (uMode > 0) {
      float sh = (1.0 - smoothstep(-6.0, uPadPx, d)) * 0.6 * max(hov, uMode == 2 ? 1.0 : 0.0);
      col = mix(vec3(0.0), col, a);
      alpha = max(a, sh);
    }
    outColor = vec4(col, alpha * vS3.w);
  }
`

// ------------------------------------------------------------------ lens post
export const postFrag = /* glsl */ `
  precision highp float;
  layout(location = 0) out highp vec4 outColor;
  uniform sampler2D tScene;
  uniform vec2 uVel;       // smear vector in uv units
  uniform float uK;        // barrel strength 0..1
  uniform float uZoomVel;  // radial smear
  uniform float uAspect;
  in vec2 vUv;

  vec2 barrel(vec2 uv, float k) {
    vec2 c = uv - 0.5;
    c.x *= uAspect;
    float r2 = dot(c, c);
    float rmax2 = 0.25 * (uAspect * uAspect + 1.0);
    c *= 1.0 - k * (1.0 - r2 / rmax2);
    c.x /= uAspect;
    return c + 0.5;
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c * vec2(uAspect, 1.0));
    vec3 col;
    if (uK < 0.002 && abs(uZoomVel) < 0.002) {
      col = texture(tScene, vUv).rgb;
    } else {
      float k = uK * 0.13;
      vec2 dir = uVel * (0.35 + 1.3 * r) + c * uZoomVel;
      vec2 split = dir * 0.4 + c * uK * 0.01;
      vec3 acc = vec3(0.0);
      float ws = 0.0;
      for (int i = 0; i < 7; i++) {
        float t = float(i) / 6.0 - 0.5;
        float w = 1.0 - abs(t) * 1.3;
        vec2 o = dir * t;
        acc.r += texture(tScene, barrel(vUv, k * 1.07) + o + split).r * w;
        acc.g += texture(tScene, barrel(vUv, k) + o).g * w;
        acc.b += texture(tScene, barrel(vUv, k * 0.93) + o - split).b * w;
        ws += w;
      }
      col = acc / ws;
    }
    col *= 1.0 - 0.32 * smoothstep(0.45, 1.05, r);
    col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;
    outColor = vec4(col, 1.0);
  }
`
