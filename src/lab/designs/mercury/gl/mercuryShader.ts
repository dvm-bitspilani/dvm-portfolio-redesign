import { COMMON } from './chunks'
import { logoGlsl } from './logoSdf'

export const MAX_BLOBS = 12
export const MAX_RIPPLES = 4
export const HALF_DEPTH = 0.075
export const ROUND = 0.024

/**
 * Fullscreen raymarcher: the logo's exact 2D polygon SDF extruded with rounded
 * edges (opExtrusion), smooth-unioned with metaball droplets that live in the
 * logo's local frame. Three materials blended by uMode: 0 liquid chrome with
 * thin-film iridescence, 1 frosted refractive glass (samples a texture of the
 * page's backdrop typography), 2 x-ray: rim light, isolines on the surface and
 * a contour map of the distance field itself on the logo plane.
 * Output is premultiplied alpha over the DOM.
 */
export function buildMercuryShader(opts: { logo: boolean }) {
  return /* glsl */ `#version 300 es
precision highp float;
precision highp int;
out vec4 fragColor;

uniform vec2 uRes;
uniform float uTime;
uniform float uMode;
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform float uFocal;
uniform vec3 uLogoPos;
uniform mat3 uLogoRotT;     // world -> local rotation
uniform float uLogoScale;
uniform vec4 uBlobs[${MAX_BLOBS}];
uniform int uBlobN;
uniform vec4 uRipples[${MAX_RIPPLES}];
uniform int uRippleN;
uniform float uBlendK;
uniform vec4 uBound;        // world bounding sphere of everything marchable
uniform int uSteps;
uniform sampler2D uBackdrop;
uniform vec4 uDoc;          // doc width css, doc height css, scrollY css, px per css
uniform vec2 uLogoScreen;   // logo centre in css px (for glass magnification)
uniform float uFloorY;
uniform float uFloorAmt;
uniform float uFade;
uniform float uFrost;

${COMMON}
${opts.logo ? logoGlsl() : 'float logoSdf2(vec2 p){ return 1e5; }\nfloat logoSdf2Exact(vec2 p){ return 1e5; }'}

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
  ${opts.logo ? '' : 'return 1e5;'}
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

float march(vec3 ro, vec3 rd, int steps){
  vec2 bs = sphIntersect(ro, rd, uBound.xyz, uBound.w);
  if(bs.y < 0.0) return -1.0;
  float t = max(bs.x, 0.0);
  float d = 1.0;
  for(int i=0;i<steps;i++){
    d = map(ro + rd*t);
    if(d < 0.0004 + 0.0006*t) return t;
    t += d*0.9;
    if(t > bs.y) return -1.0;
  }
  // out of steps while grazing a wall: accept near-misses instead of punching holes
  return d < 0.012 ? t : -1.0;
}

vec2 backdropUV(vec2 css){ return vec2(css.x/uDoc.x, (css.y + uDoc.z)/uDoc.y); }
vec3 backdrop(vec2 uv, float lod){
  if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec3(0.0);
  return textureLod(uBackdrop, uv, lod).rgb;
}

float isoline(float v, float w){ float g = abs(fract(v) - 0.5); return smoothstep(0.5 - w, 0.5, g); }

// Projected caustic: light from behind-above through the mark, focused on the floor.
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
    float iri = clamp(0.12 + 0.8*blend + 0.45*fres, 0.0, 1.0);
    vec3 spec = env * mix(vec3(0.93, 0.93, 0.95), vec3(1.0), fres);
    vec3 col = spec * mix(vec3(1.0), film*1.6, iri*0.55);
    res += vec4(tonemap(col), 1.0) * wC;
  }
  if(wG > 0.0){
    vec3 rin = refract(rd, n, 1.0/1.47);
    vec2 bend = (rin.xy - rd.xy) * vec2(1.0, -1.0) * 110.0;
    vec2 mag = uLogoScreen + (cssPx - uLogoScreen) * 0.82;      // thick-lens magnification
    vec2 uv = backdropUV(mag + bend);
    vec2 duv = bend / uDoc.xy * 0.22;
    float lod = uFrost + 1.5*(1.0-cosI);
    vec3 refr = vec3(backdrop(uv, lod).r, backdrop(uv + duv, lod).g, backdrop(uv + duv*2.0, lod).b);
    vec3 body = studio(rin)*0.16 + vec3(0.045, 0.047, 0.055) * (0.6 + 0.8*(1.0-cosI));
    vec3 col = refr*vec3(0.9, 0.93, 0.98)*1.1 + body;
    col = mix(col, env, 0.05 + 0.9*fres);
    col += env * 0.12;
    col *= mix(vec3(1.0), thinFilm(cosI, 380.0 + 300.0*blend), 0.12 + 0.3*fres);
    res += vec4(tonemap(col), 1.0) * wG;
  }
  if(wX > 0.0){
    float rim = pow(1.0 - cosI, 1.6);
    float bands = isoline(lp.y*30.0 - uTime*0.25, 0.06) * 0.55 + isoline(lp.x*30.0, 0.05) * 0.25;
    bands *= 0.35 + 0.65*(1.0-cosI);
    vec3 tint = mix(vec3(0.78, 0.84, 1.0), thinFilm(0.6, 330.0 + lp.y*600.0), 0.45);
    vec3 col = tint * (rim*1.25 + bands*0.9) + vec3(0.02, 0.025, 0.035);
    float a = clamp(rim*1.1 + bands*0.7 + 0.12, 0.0, 1.0);
    res += vec4(tonemap(col)*a, a) * wX;
  }
  return res;
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 cssPx = vec2(frag.x, uRes.y - frag.y) / uDoc.w;
  vec2 ndc = (2.0*frag - uRes) / uRes.y;
  vec3 ro = uCamPos;
  vec3 rd = normalize(uCamRot * vec3(ndc, -uFocal));

  float m = uMode;
  float wC = clamp(1.0 - m, 0.0, 1.0);
  float wG = clamp(1.0 - abs(m - 1.0), 0.0, 1.0);
  float wX = clamp(m - 1.0, 0.0, 1.0);

  vec4 acc = vec4(0.0);

  float tHit = march(ro, rd, uSteps);
  float tFloor = rd.y < 0.0 ? (uFloorY - ro.y) / rd.y : -1.0;
  bool floorFirst = tFloor > 0.0 && (tHit < 0.0 || tFloor < tHit);

  // ---- floor: glossy black, reflects the metal, catches caustics
  if(floorFirst && uFloorAmt > 0.001){
    vec3 fp = ro + rd*tFloor;
    vec2 rel = fp.xz - uLogoPos.xz;
    float near = exp(-dot(rel, rel) * 1.6);
    if(near > 0.01){
      vec3 rr = vec3(rd.x, -rd.y, rd.z);
      float graze = pow(1.0 - abs(rd.y), 3.0);
      vec3 col = vec3(0.0);
      float a = 0.0;
      float tr = march(fp, rr, uSteps/2);
      if(tr > 0.0){
        vec3 hp = fp + rr*tr;
        vec3 hn = calcNormal(hp);
        vec4 o = shadeObject(hp, rr, hn, cssPx, wC, wG*0.6, wX*0.5);
        float k = (0.22 + 0.4*graze) * exp(-tr*1.6);
        col += o.rgb * k;
        a += o.a * k * 0.6;
      }
      // projected logo caustic (bright edges + rippling cells), strongest for glass
      vec2 ql = vec2(rel.x, rel.y*1.3) / uLogoScale - vec2(0.0, 0.5);
      float sd = logoSdf2(ql);
      float edge = exp(-abs(sd)*55.0) + 0.6*smoothstep(0.02, -0.04, sd);
      float cst = caustic(ql, uTime*0.6) * (0.4 + 0.6*smoothstep(0.1, -0.05, sd));
      float lightAmt = (0.25*wC + 1.0*wG + 0.15*wX) * smoothstep(-0.05, 0.25, rel.y);
      col += vec3(0.9, 0.95, 1.0) * (edge*0.08 + cst*0.5) * lightAmt;
      col *= near * uFloorAmt;
      a *= near * uFloorAmt;
      acc = vec4(col, a);
    }
  }

  // ---- x-ray: contour map of the distance field on the logo plane
  if(wX > 0.0){
    vec3 lro = toLocal(ro);
    vec3 lrd = uLogoRotT * rd;
    if(abs(lrd.z) > 1e-4){
      float tp = -lro.z / lrd.z;
      if(tp > 0.0){
        vec2 q = (lro + lrd*tp).xy;
        float d = logoSdf2Exact(q);
        if(uBlobN > 0) d = smin(d, blobsLocal(vec3(q, 0.0)), uBlendK);
        float lines = isoline(d*28.0, 0.07);
        float fall = exp(-max(d, 0.0)*2.2) * smoothstep(-0.2, 0.0, d);
        float zero = exp(-abs(d)*260.0);
        vec3 tint = mix(vec3(0.7, 0.76, 0.9), thinFilm(0.55, 320.0 + d*1400.0), 0.6);
        vec3 col = tint * (lines*0.38*fall + zero*0.9);
        float a = clamp(lines*0.3*fall + zero*0.6, 0.0, 1.0);
        acc += vec4(col, a*0.6) * wX;
      }
    }
  }

  if(tHit > 0.0 && !floorFirst){
    vec3 p = ro + rd*tHit;
    vec3 n = calcNormal(p);
    vec4 o = shadeObject(p, rd, n, cssPx, wC, wG, wX);
    acc = o + acc*(1.0 - o.a);
  }

  acc *= uFade;
  acc.rgb += (hash12(frag + fract(uTime)*91.0) - 0.5) / 255.0 * acc.a;
  fragColor = acc;
}
`
}
