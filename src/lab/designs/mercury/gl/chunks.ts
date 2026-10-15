/** Shared GLSL snippets: procedural studio light, thin-film interference, smooth-min, noise. */

export const COMMON = /* glsl */ `
#define PI 3.14159265
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }

// Polynomial smooth-min (quadratic). k = blend radius.
float smin(float a, float b, float k){ float h = max(k-abs(a-b), 0.0)/k; return min(a,b) - h*h*k*0.25; }

// Soft-box studio, computed analytically from a direction. Strip lights and a big
// overhead box give liquid chrome its long, crisp highlights; one low violet card
// echoes the DVM brand colour in reflections only.
uniform float uEnvSpin;
vec3 studio(vec3 d){
  d = normalize(d);
  float cs = cos(uEnvSpin), sn = sin(uEnvSpin);
  d.xz = mat2(cs, -sn, sn, cs) * d.xz;
  float az = atan(d.x, d.z);          // 0 = toward the viewer (+z)
  float y = d.y;
  vec3 c = vec3(0.006, 0.006, 0.008);
  c += vec3(0.05, 0.05, 0.056) * exp(-abs(y - 0.02) * 10.0);       // horizon haze
  c += vec3(0.020) * smoothstep(-0.1, 0.9, y);                      // ceiling falloff
  // overhead soft box (rect projected on y=1)
  if (y > 0.05) {
    vec2 q = d.xz / y;
    float box = smoothstep(0.62, 0.5, abs(q.x)) * smoothstep(0.9, 0.75, abs(q.y - 0.35));
    c += vec3(2.4, 2.38, 2.34) * box;
    c += vec3(0.25) * smoothstep(1.4, 0.0, length(q - vec2(0.0, 0.35)));
  }
  // key strip, front-left (tall, thin)
  float k1 = smoothstep(0.16, 0.04, abs(az + 0.85)) * smoothstep(0.75, 0.55, abs(y - 0.1));
  c += vec3(2.6, 2.55, 2.45) * k1;
  // rim strip, right-back
  float k2 = smoothstep(0.13, 0.03, abs(az - 1.95)) * smoothstep(0.85, 0.6, abs(y - 0.05));
  c += vec3(1.7, 1.8, 2.05) * k2;
  // second strip, front-right, softer
  float k3 = smoothstep(0.16, 0.07, abs(az - 0.62)) * smoothstep(0.5, 0.3, abs(y - 0.18));
  c += vec3(0.9) * k3;
  // violet card, low back-left (DVM brand violet, only ever seen in reflections)
  float k4 = smoothstep(0.26, 0.1, abs(az + 2.2)) * smoothstep(0.16, 0.04, abs(y + 0.02));
  c += vec3(0.30, 0.10, 0.85) * 0.45 * k4;
  // large graded panel behind the viewer so faces at rest read as polished metal
  float fp = smoothstep(0.9, 0.5, abs(az)) * smoothstep(-0.25, 0.05, y) * smoothstep(0.75, 0.45, y);
  c += vec3(0.55, 0.56, 0.6) * fp * (0.25 + 0.75*smoothstep(-0.3, 0.5, y + 0.12*sin(az*3.0)));
  c += vec3(0.08) * smoothstep(1.2, 0.0, abs(az)) * smoothstep(-0.6, 0.0, y);
  // floor bounce
  c += vec3(0.012) * smoothstep(0.0, -0.4, y);
  return c;
}

// Thin-film interference (oil slick): film of index n, thickness in nm.
vec3 thinFilm(float cosI, float thickness){
  float n = 1.38;
  float sinT2 = (1.0 - cosI*cosI) / (n*n);
  float cosT = sqrt(max(0.0, 1.0 - sinT2));
  float opd = 2.0 * n * thickness * cosT;
  vec3 lambda = vec3(650.0, 532.0, 450.0);
  return 0.5 + 0.5 * cos(2.0 * PI * opd / lambda + vec3(0.0, 0.4, 0.9));
}

vec3 tonemap(vec3 c){
  c = max(c, 0.0);
  // ACES-ish filmic fit (Narkowicz)
  c = (c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0/2.2));
}
`
