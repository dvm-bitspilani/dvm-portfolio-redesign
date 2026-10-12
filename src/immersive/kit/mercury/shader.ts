import { logoGlsl } from './logoSdf'

export const MAX_BLOBS = 12
export const MAX_RIPPLES = 4
export const HALF_DEPTH = 0.075
export const ROUND = 0.03

/**
 * Fullscreen raymarcher for the DVM mark: the exact 2D polygon SDF extruded
 * with rounded edges, smooth-unioned with metaball droplets living in the
 * logo's local frame. Three materials blended by uMode (0 liquid chrome with
 * thin-film sheen, 1 refractive glass, 2 x-ray). Output is premultiplied alpha:
 *  - transparent mode: alpha = SDF hit (+ cone-traced edge coverage for AA),
 *    a soft drop shadow on an implicit back plane, x-ray contour lines;
 *  - studio mode: opaque cyclorama + glossy floor reflection and caustics.
 */
export function buildMercuryShader() {
  return /* glsl */ `#version 300 es
precision highp float;
precision highp int;
out vec4 fragColor;

uniform vec2 uRes;
uniform float uPxPerCss;
uniform float uTime;
uniform float uMode;
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform float uFocal;
uniform vec3 uLogoPos;
uniform mat3 uLogoRotT;
uniform float uLogoScale;
uniform vec4 uBlobs[${MAX_BLOBS}];
uniform int uBlobN;
uniform vec4 uRipples[${MAX_RIPPLES}];
uniform int uRippleN;
uniform float uBlendK;
uniform vec4 uBound;
uniform int uSteps;
uniform sampler2D uBackdrop;
uniform int uHasBackdrop;
uniform vec4 uBdXform;      // backdrop uv = cssPx * xy + zw
uniform float uFrost;
uniform vec2 uLogoScreen;   // logo centre, canvas css px
uniform float uMarkPx;      // logo height, css px
uniform int uStudio;
uniform float uFloorY;
uniform float uFloorAmt;
uniform float uShadow;
uniform vec2 uShadowOff;
uniform float uFade;
uniform float uSheen;
uniform float uExposure;
uniform vec3 uBgTop;
uniform vec3 uBgBottom;
uniform vec3 uBgGlow;
uniform float uEnvSpin;
uniform vec3 uEnvTop;
uniform vec3 uEnvKey;
uniform vec3 uEnvRim;
uniform vec3 uEnvFill;
uniform vec3 uEnvCard;
uniform vec3 uEnvPanel;
uniform vec3 uEnvHaze;
uniform vec3 uGlassTint;
uniform vec3 uXrayTint;
uniform float uContours;

#define PI 3.14159265
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float smin(float a, float b, float k){ float h = max(k-abs(a-b), 0.0)/k; return min(a,b) - h*h*k*0.25; }
float maxc(vec3 c){ return max(c.r, max(c.g, c.b)); }

// Analytic soft-box studio seen in reflections: overhead box, key / rim / fill
// strips, a low accent card (teal in the redesign theme), a graded front panel.
vec3 studio(vec3 d){
  d = normalize(d);
  float cs = cos(uEnvSpin), sn = sin(uEnvSpin);
  d.xz = mat2(cs, -sn, sn, cs) * d.xz;
  float az = atan(d.x, d.z);
  float y = d.y;
  vec3 c = uEnvHaze * 0.12;
  c += uEnvHaze * exp(-abs(y - 0.02) * 10.0);
  c += vec3(0.020) * smoothstep(-0.1, 0.9, y);
  if (y > 0.05) {
    vec2 q = d.xz / y;
    float box = smoothstep(0.62, 0.5, abs(q.x)) * smoothstep(0.9, 0.75, abs(q.y - 0.35));
    c += uEnvTop * box;
    c += uEnvTop * 0.1 * smoothstep(1.4, 0.0, length(q - vec2(0.0, 0.35)));
  }
  c += uEnvKey * smoothstep(0.16, 0.04, abs(az + 0.85)) * smoothstep(0.75, 0.55, abs(y - 0.1));
  c += uEnvRim * smoothstep(0.13, 0.03, abs(az - 1.95)) * smoothstep(0.85, 0.6, abs(y - 0.05));
  c += uEnvFill * smoothstep(0.16, 0.07, abs(az - 0.62)) * smoothstep(0.5, 0.3, abs(y - 0.18));
  c += uEnvCard * smoothstep(0.26, 0.1, abs(az + 2.2)) * smoothstep(0.16, 0.04, abs(y + 0.02));
  float fp = smoothstep(0.9, 0.5, abs(az)) * smoothstep(-0.25, 0.05, y) * smoothstep(0.75, 0.45, y);
  c += uEnvPanel * fp * (0.25 + 0.75*smoothstep(-0.3, 0.5, y + 0.12*sin(az*3.0)));
  c += uEnvPanel * 0.14 * smoothstep(1.2, 0.0, abs(az)) * smoothstep(-0.6, 0.0, y);
  c += vec3(0.012) * smoothstep(0.0, -0.4, y);
  return c;
}

// Thin-film interference (oil slick).
vec3 thinFilm(float cosI, float thickness){
  float n = 1.38;
  float sinT2 = (1.0 - cosI*cosI) / (n*n);
  float cosT = sqrt(max(0.0, 1.0 - sinT2));
  float opd = 2.0 * n * thickness * cosT;
  return 0.5 + 0.5 * cos(2.0 * PI * opd / vec3(650.0, 532.0, 450.0) + vec3(0.0, 0.4, 0.9));
}

vec3 tonemap(vec3 c){
  c = max(c * uExposure, 0.0);
  c = (c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0/2.2));
}

${logoGlsl()}

const float HALF_D = ${HALF_DEPTH.toFixed(4)};
const float RND = ${ROUND.toFixed(4)};

float ripple(vec2 q){
  float r = 0.0;
  for(int i=0;i<uRippleN;i++){
    vec4 R = uRipples[i];
    float age = uTime - R.z;
    float dd = length(q - R.xy);
    float x = dd - age*0.62;
    r += R.w * sin(x*46.0) * exp(-x*x*60.0) * exp(-age*1.3);
  }
  return r;
}

float logoLocal(vec3 p){
  float d2 = logoSdf2(p.xy);
  float h = HALF_D;
  if(d2 < 0.03){
    h += ripple(p.xy) + 0.003*sin(p.x*4.5+uTime*1.1)*sin(p.y*3.7-uTime*0.8);
  }
  vec2 w = vec2(d2 + RND, abs(p.z) - h + RND);
  return min(max(w.x,w.y),0.0) + length(max(w,0.0)) - RND;
}

float blobsLocal(vec3 p){
  float d = 1e5;
  for(int i=0;i<uBlobN;i++){
    vec4 b = uBlobs[i];
    if(b.w > 0.0005) d = smin(d, length(p-b.xyz)-b.w, 0.075);
  }
  return d;
}

float sceneLocal(vec3 p){
  float l = logoLocal(p);
  if(uBlobN == 0) return l;
  return smin(l, blobsLocal(p), uBlendK);
}

vec3 toLocal(vec3 pw){ return uLogoRotT * (pw - uLogoPos) / uLogoScale; }
float map(vec3 pw){ return sceneLocal(toLocal(pw)) * uLogoScale; }

vec3 calcNormal(vec3 p){
  const vec2 k = vec2(1.0,-1.0);
  float e = 0.0012 * uLogoScale;
  return normalize(k.xyy*map(p+k.xyy*e) + k.yyx*map(p+k.yyx*e) + k.yxy*map(p+k.yxy*e) + k.xxx*map(p+k.xxx*e));
}

vec2 sphIntersect(vec3 ro, vec3 rd, vec3 c, float r){
  vec3 oc = ro - c;
  float b = dot(oc, rd);
  float h = b*b - (dot(oc,oc) - r*r);
  if(h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b-h, -b+h);
}

// Sphere-traced march. On a miss, cov estimates silhouette coverage from the
// closest approach measured in pixel footprints (cone tracing) for clean alpha edges.
float march(vec3 ro, vec3 rd, int steps, float pa, out float cov, out float tc){
  cov = 0.0; tc = -1.0;
  vec2 bs = sphIntersect(ro, rd, uBound.xyz, uBound.w);
  if(bs.y < 0.0) return -1.0;
  float t = max(bs.x, 0.0);
  float best = 1e9;
  float d = 1.0;
  for(int i=0;i<steps;i++){
    d = map(ro + rd*t);
    float r = d / (pa * max(t, 1e-3));
    if(r < best){ best = r; tc = t; }
    if(d < 0.0004 + 0.0006*t){ cov = 1.0; return t; }
    t += d*0.9;
    if(t > bs.y) break;
  }
  if(t <= bs.y && d < 0.012){ cov = 1.0; return t; }
  cov = clamp(0.65 - 0.65*best, 0.0, 1.0);
  return -1.0;
}

// Procedural cyclorama for studio mode (display-referred colour).
vec3 studioBg(vec2 css){
  vec2 cssRes = uRes / uPxPerCss;
  vec2 uv = css / cssRes;
  vec3 c = mix(uBgTop, uBgBottom, smoothstep(0.0, 1.0, uv.y));
  vec2 g = (css - uLogoScreen) / uMarkPx;
  c += uBgGlow * exp(-dot(g*vec2(0.85, 1.15), g*vec2(0.85, 1.15)) * 1.5);
  float bx = abs(g.x) - 1.05;
  float bars = exp(-bx*bx*30.0) * smoothstep(0.95, 0.0, abs(g.y + 0.05));
  c += uEnvRim * 0.03 * bars;
  vec2 v = uv - 0.5;
  c *= 1.0 - dot(v, v) * 0.9;
  return c;
}

bool solidBehind(){ return uHasBackdrop == 1 || uStudio == 1; }

vec3 behind(vec2 css, float lod){
  if(uHasBackdrop == 1){
    vec2 uv = css * uBdXform.xy + uBdXform.zw;
    if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return uStudio == 1 ? studioBg(css) : vec3(0.0);
    return textureLod(uBackdrop, uv, lod).rgb;
  }
  return studioBg(css);
}

float isoline(float v, float w){ float g = abs(fract(v) - 0.5); return smoothstep(0.5 - w, 0.5, g); }

float caustic(vec2 q, float t){
  vec2 p = q * 7.0;
  float c = 0.0;
  for(int i=0;i<3;i++){
    p += vec2(sin(p.y*1.21 + t*0.9), cos(p.x*1.13 - t*0.7)) * 0.55;
    c += abs(sin(p.x) * sin(p.y));
  }
  return pow(clamp(1.0 - c/3.0*1.35, 0.0, 1.0), 5.0);
}

vec4 shadeObject(vec3 p, vec3 rd, vec3 n, vec2 cssPx, float wC, float wG, float wX){
  vec3 lp = toLocal(p);
  float cosI = clamp(dot(n, -rd), 0.0, 1.0);
  float fres = pow(1.0 - cosI, 5.0);
  vec3 r = reflect(rd, n);
  vec3 env = studio(r);
  float blend = 0.0;
  if(uBlobN > 0){
    float a = logoLocal(lp), b = blobsLocal(lp);
    blend = (1.0 - smoothstep(0.0, uBlendK*0.9, abs(a-b))) * step(min(a,b), 0.08);
  }
  vec4 res = vec4(0.0);
  if(wC > 0.0){
    float thick = 300.0 + 520.0*blend + 260.0*fres + 90.0*sin(lp.y*7.0 + lp.x*5.0 + uTime*0.35);
    vec3 film = thinFilm(cosI, thick);
    float iri = clamp((0.12 + 0.8*blend + 0.45*fres) * uSheen, 0.0, 1.0);
    vec3 spec = env * mix(vec3(0.93, 0.93, 0.95), vec3(1.0), fres);
    vec3 col = spec * mix(vec3(1.0), film*1.6, iri*0.55);
    res += vec4(tonemap(col), 1.0) * wC;
  }
  if(wG > 0.0){
    vec3 rin = refract(rd, n, 1.0/1.47);
    vec3 body = studio(rin)*0.16 + vec3(0.04, 0.05, 0.056) * (0.6 + 0.8*(1.0-cosI));
    vec3 film = mix(vec3(1.0), thinFilm(cosI, 380.0 + 300.0*blend), clamp((0.12 + 0.3*fres) * uSheen, 0.0, 1.0));
    if(solidBehind()){
      vec2 bend = (rin.xy - rd.xy) * vec2(1.0, -1.0) * uMarkPx * 0.2;
      vec2 mag = uLogoScreen + (cssPx - uLogoScreen) * 0.82;       // thick-lens magnification
      vec2 p0 = mag + bend;
      vec2 dp = bend * 0.22;                                        // chromatic split
      float lod = uFrost + 1.5*(1.0-cosI);
      vec3 refr = vec3(behind(p0, lod).r, behind(p0 + dp, lod).g, behind(p0 + dp*2.0, lod).b);
      refr = pow(refr, vec3(2.2));
      vec3 col = refr * uGlassTint * 1.25 + body * 0.38;
      col = mix(col, env, 0.05 + 0.9*fres);
      col += env * 0.16;
      col *= film;
      res += vec4(tonemap(col), 1.0) * wG;
    } else {
      // see-through glass over live DOM: body absorption + reflections only
      vec3 reflT = tonemap(env * (0.07 + 0.9*fres) * film);
      float ra = maxc(reflT);
      float ba = 0.12 + 0.55*pow(1.0 - cosI, 2.0);
      vec3 bodyT = tonemap(body*1.4 + uGlassTint*0.02);
      res += vec4(bodyT*ba*(1.0-ra) + reflT, ba*(1.0-ra) + ra) * wG;
    }
  }
  if(wX > 0.0){
    float rim = pow(1.0 - cosI, 1.6);
    float bands = isoline(lp.y*30.0 - uTime*0.25, 0.06) * 0.55 + isoline(lp.x*30.0, 0.05) * 0.25;
    bands *= 0.35 + 0.65*(1.0-cosI);
    vec3 tint = mix(uXrayTint, thinFilm(0.6, 330.0 + lp.y*600.0), 0.45*min(uSheen, 1.5));
    vec3 col = tint * (rim*1.25 + bands*0.9) + vec3(0.02, 0.025, 0.035);
    float a = clamp(rim*1.1 + bands*0.7 + 0.12, 0.0, 1.0);
    res += vec4(tonemap(col)*a, a) * wX;
  }
  return res;
}

float shadowAt(vec3 lro, vec3 lrd){
  if(abs(lrd.z) < 1e-4) return 0.0;
  float tp = (-0.2 - lro.z) / lrd.z;
  if(tp <= 0.0) return 0.0;
  vec2 q = (lro + lrd*tp).xy - uShadowOff;
  float d = logoSdf2(q);
  if(uBlobN > 0) d = smin(d, blobsLocal(vec3(q, 0.0)), uBlendK);
  return 1.0 - smoothstep(-0.03, 0.12, d);
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 cssPx = vec2(frag.x, uRes.y - frag.y) / uPxPerCss;
  vec2 ndc = (2.0*frag - uRes) / uRes.y;
  vec3 ro = uCamPos;
  vec3 rd = normalize(uCamRot * vec3(ndc, -uFocal));
  float pa = 2.0 / (uRes.y * uFocal);

  float m = uMode;
  float wC = clamp(1.0 - m, 0.0, 1.0);
  float wG = clamp(1.0 - abs(m - 1.0), 0.0, 1.0);
  float wX = clamp(m - 1.0, 0.0, 1.0);

  bool studioOn = uStudio == 1;
  vec4 acc = vec4(0.0);
  vec3 bg = studioOn ? studioBg(cssPx) : vec3(0.0);

  float cov, tc;
  float tHit = march(ro, rd, uSteps, pa, cov, tc);
  float tFloor = ((studioOn || uFloorAmt > 0.001) && rd.y < 0.0) ? (uFloorY - ro.y) / rd.y : -1.0;
  bool floorFirst = tFloor > 0.0 && (tHit < 0.0 || tFloor < tHit);

  // ---- studio floor: glossy black, reflects the mark, catches caustics
  if(floorFirst && uFloorAmt > 0.001){
    vec3 fp = ro + rd*tFloor;
    vec2 rel = (fp.xz - uLogoPos.xz) / uLogoScale;
    float near = exp(-dot(rel, rel) * 1.6);
    if(near > 0.01){
      vec3 rr = vec3(rd.x, -rd.y, rd.z);
      float graze = pow(1.0 - abs(rd.y), 3.0);
      vec3 col = vec3(0.0);
      float c2, t2;
      float tr = march(fp, rr, uSteps/2, pa, c2, t2);
      if(tr > 0.0){
        vec3 hp = fp + rr*tr;
        vec4 o = shadeObject(hp, rr, calcNormal(hp), cssPx, wC, wG*0.6, wX*0.5);
        col += o.rgb * (0.22 + 0.4*graze) * exp(-tr/uLogoScale*1.6);
      }
      vec2 ql = vec2(rel.x, rel.y*1.3) - vec2(0.0, 0.5);
      float sd = logoSdf2(ql);
      float edge = exp(-abs(sd)*55.0) + 0.6*smoothstep(0.02, -0.04, sd);
      float cst = caustic(ql, uTime*0.6) * (0.4 + 0.6*smoothstep(0.1, -0.05, sd));
      float lightAmt = (0.25*wC + 1.0*wG + 0.15*wX) * smoothstep(-0.05, 0.25, rel.y);
      col += mix(vec3(0.9, 0.95, 1.0), uGlassTint, 0.5) * (edge*0.08 + cst*0.5) * lightAmt;
      bg += col * near * uFloorAmt * uFade;
    }
  }

  vec3 lro = toLocal(ro);
  vec3 lrd = uLogoRotT * rd;

  // ---- soft drop shadow on an implicit plane behind the mark
  if(uShadow > 0.001){
    float s = shadowAt(lro, lrd) * uShadow * (1.0 - 0.75*wX) * uFade;
    if(studioOn) bg *= 1.0 - s*0.6;
    else acc = vec4(0.0, 0.0, 0.0, s*0.55);
  }

  // ---- x-ray: contour map of the distance field on the logo plane
  if(wX > 0.0 && uContours > 0.001 && abs(lrd.z) > 1e-4){
    float tp = -lro.z / lrd.z;
    if(tp > 0.0){
      vec2 q = (lro + lrd*tp).xy;
      float d = logoSdf2Exact(q);
      if(uBlobN > 0) d = smin(d, blobsLocal(vec3(q, 0.0)), uBlendK);
      float lines = isoline(d*28.0, 0.07);
      float fall = exp(-max(d, 0.0)*2.2) * smoothstep(-0.2, 0.0, d);
      float zero = exp(-abs(d)*260.0);
      vec3 tint = mix(uXrayTint, thinFilm(0.55, 320.0 + d*1400.0), 0.6*min(uSheen, 1.5));
      vec3 col = tint * (lines*0.38*fall + zero*0.9);
      float a = clamp(lines*0.3*fall + zero*0.6, 0.0, 1.0) * 0.6;
      vec4 xc = vec4(col, max(a, maxc(col))) * wX * uContours;
      acc = xc + acc*(1.0 - xc.a);
    }
  }

  // ---- the mark (hit, or anti-aliased silhouette from closest approach)
  if(!floorFirst){
    vec4 o = vec4(0.0);
    if(tHit > 0.0){
      vec3 p = ro + rd*tHit;
      o = shadeObject(p, rd, calcNormal(p), cssPx, wC, wG, wX);
    } else if(cov > 0.004 && tc > 0.0){
      vec3 p = ro + rd*tc;
      o = shadeObject(p, rd, calcNormal(p), cssPx, wC, wG, wX) * cov;
    }
    o *= uFade;
    acc = o + acc*(1.0 - o.a);
  }

  if(studioOn){
    acc.rgb += bg * (1.0 - acc.a);
    acc.a = 1.0;
  } else {
    acc.rgb += bg * (1.0 - acc.a); // transparent-mode reflection pool (bg is black otherwise)
    acc.a = clamp(max(acc.a, maxc(acc.rgb)), 0.0, 1.0);
  }
  acc.rgb += (hash12(frag + fract(uTime)*91.0) - 0.5) / 255.0 * acc.a;
  fragColor = acc;
}
`
}
