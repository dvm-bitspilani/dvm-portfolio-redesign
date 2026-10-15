import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

/**
 * Stencil portal plumbing (single scene, single render):
 *  renderOrder 0   outside world, opaque (no stencil)
 *  renderOrder 1   portal mask A: writes stencil = ref where the opening is visible
 *  renderOrder 2   portal mask B: inside the stencil, paints the world backdrop and resets depth to far
 *  renderOrder 3+  world content: drawn only where stencil == ref
 *  transparent outside FX test stencil == 0 so they never bleed into an opening.
 * When the camera is inside a world, fullscreen variants of A/B write the ref everywhere.
 */
export const RO = { outside: 0, maskA: 1, maskB: 2, world: 3, worldFx: 4 } as const

export function stencilTest<M extends THREE.Material>(m: M, ref: number): M {
  m.stencilWrite = true
  m.stencilRef = ref
  m.stencilFunc = THREE.EqualStencilFunc
  m.stencilFail = THREE.KeepStencilOp
  m.stencilZFail = THREE.KeepStencilOp
  m.stencilZPass = THREE.KeepStencilOp
  return m
}

export function maskAMaterial(ref: number, fullscreen = false) {
  const m = new THREE.ShaderMaterial({
    vertexShader: fullscreen
      ? 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }'
      : 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.0); }',
    colorWrite: false,
    depthWrite: false,
    depthTest: !fullscreen,
    side: THREE.DoubleSide,
  })
  m.stencilWrite = true
  m.stencilRef = ref
  m.stencilFunc = THREE.AlwaysStencilFunc
  m.stencilZPass = THREE.ReplaceStencilOp
  return m
}

/** Paints the world's backdrop gradient inside the stencil and pushes depth to the far plane. */
export function maskBMaterial(ref: number, top: string, bottom: string, fullscreen = false) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(top) },
      uBottom: { value: new THREE.Color(bottom) },
    },
    vertexShader: `
      varying vec2 vNdc;
      void main(){
        vec4 p = ${fullscreen ? 'vec4(position.xy, 0.0, 1.0)' : 'projectionMatrix * modelViewMatrix * vec4(position, 1.0)'};
        vNdc = p.xy / p.w;
        p.z = p.w; // far plane
        gl_Position = p;
      }`,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uBottom; varying vec2 vNdc;
      void main(){
        float t = smoothstep(-1.0, 1.2, vNdc.y);
        vec3 c = mix(uBottom, uTop, t);
        c += uTop * 0.35 * exp(-dot(vNdc, vNdc) * 2.2);
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthWrite: true,
    depthTest: true,
    depthFunc: THREE.AlwaysDepth,
    side: THREE.DoubleSide,
  })
  return stencilTest(m, ref)
}

/** Fat line segments (pixel width) from a flat [ax,ay,az,bx,by,bz,...] list. */
export function makeLines(segments: number[], color: THREE.ColorRepresentation, width: number, intensity = 1, opacity = 1) {
  const g = new LineSegmentsGeometry()
  g.setPositions(segments)
  const mat = new LineMaterial({
    color: new THREE.Color(color).multiplyScalar(intensity),
    linewidth: width,
    transparent: opacity < 1,
    opacity,
    toneMapped: false,
    worldUnits: false,
  })
  const l = new LineSegments2(g, mat)
  l.computeLineDistances()
  return l
}

/** Closed polyline -> segment list. */
export function loopSegments(pts: THREE.Vector2[], z = 0): number[] {
  const out: number[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    out.push(a.x, a.y, z, b.x, b.y, z)
  }
  return out
}

/** Edges of a geometry as a segment list. */
export function edgeSegments(geo: THREE.BufferGeometry, thresholdDeg = 20): number[] {
  const e = new THREE.EdgesGeometry(geo, thresholdDeg)
  const arr = Array.from(e.attributes.position.array as Float32Array)
  e.dispose()
  return arr
}

/** ShaderMaterial helper that participates in scene fog. */
export function fogShader(opts: {
  uniforms?: Record<string, THREE.IUniform>
  vertex: string
  fragment: string
  transparent?: boolean
  additive?: boolean
  depthWrite?: boolean
  side?: THREE.Side
}) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, opts.uniforms ?? {}]),
    vertexShader: opts.vertex,
    fragmentShader: opts.fragment,
    fog: true,
    transparent: opts.transparent ?? false,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: opts.depthWrite ?? !opts.transparent,
    side: opts.side ?? THREE.FrontSide,
  })
}
