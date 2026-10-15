import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Uniform } from 'three'

/**
 * Tunnel "speed" pass: radial zoom blur toward the vanishing point plus RGB split,
 * both proportional to camera speed. Static frames pass through untouched.
 */
const frag = /* glsl */ `
uniform float uStrength;
uniform float uGrain;
uniform float uTime;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 dir = uv - vec2(0.5);
  float d = length(dir);
  vec3 col = inputColor.rgb;
  if (uStrength > 0.002) {
    vec3 acc = vec3(0.0);
    float k = uStrength * 0.16 * smoothstep(0.05, 0.7, d);
    float jitter = hash12(uv * 913.0 + uTime);
    for (int i = 0; i < 10; i++) {
      float t = (float(i) + jitter) / 10.0;
      float s = 1.0 - k * t;
      vec2 base = vec2(0.5) + dir * s;
      float ca = uStrength * 0.006 * d;
      acc.r += texture2D(inputBuffer, vec2(0.5) + dir * (s + ca)).r;
      acc.g += texture2D(inputBuffer, base).g;
      acc.b += texture2D(inputBuffer, vec2(0.5) + dir * (s - ca)).b;
    }
    col = acc / 10.0;
  }
  // fine film grain keeps the dark gradients from banding
  col += (hash12(uv * 1777.0 + fract(uTime) * 61.0) - 0.5) * uGrain;
  outputColor = vec4(col, inputColor.a);
}
`

export class WarpEffect extends Effect {
  constructor() {
    super('WarpEffect', frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uStrength', new Uniform(0)],
        ['uGrain', new Uniform(0.022)],
        ['uTime', new Uniform(0)],
      ]),
    })
  }
  set strength(v: number) {
    this.uniforms.get('uStrength')!.value = v
  }
  set time(v: number) {
    this.uniforms.get('uTime')!.value = v
  }
}

/** Scrubs NaN/Inf before bloom so one bad pixel can never black out the frame. */
export class SanitizeEffect extends Effect {
  constructor() {
    super(
      'SanitizeEffect',
      /* glsl */ `
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = inputColor.rgb;
        bool bad = any(isnan(c)) || any(isinf(c));
        outputColor = vec4(bad ? vec3(0.0) : clamp(c, 0.0, 48.0), inputColor.a);
      }`,
      { blendFunction: BlendFunction.NORMAL },
    )
  }
}
