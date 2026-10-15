/**
 * Tiny WebGL2 helper for the Mercury design: every effect here is a single
 * fullscreen triangle running one fragment shader, so three.js would only add
 * weight. Handles program compilation, uniform caching, textures, DPR-aware
 * resizing with an adaptive render scale, and disposal.
 */

const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`

export type UniformValue = number | number[] | Float32Array | Int32Array

export class FullscreenPass {
  readonly gl: WebGL2RenderingContext
  readonly canvas: HTMLCanvasElement
  private program: WebGLProgram
  private vao: WebGLVertexArrayObject
  private buffer: WebGLBuffer
  private locs = new Map<string, WebGLUniformLocation | null>()
  private textures = new Set<WebGLTexture>()
  private lost = false
  /** Multiplier on min(devicePixelRatio, 2). Rendering below 1 is upsampled by CSS. */
  scale = 1
  width = 1
  height = 1
  /** Drawing-buffer pixels per CSS pixel. */
  pxPerCss = 1

  constructor(canvas: HTMLCanvasElement, frag: string, opts: WebGLContextAttributes = {}) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      ...opts,
    })
    if (!gl) throw new Error('WebGL2 unavailable')
    this.gl = gl
    this.program = this.compile(frag)
    this.vao = gl.createVertexArray()!
    this.buffer = gl.createBuffer()!
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(this.program, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)
    canvas.addEventListener('webglcontextlost', this.onLost)
  }

  private onLost = (e: Event) => {
    e.preventDefault()
    this.lost = true
  }

  get isLost() {
    return this.lost || this.gl.isContextLost()
  }

  private compile(frag: string) {
    const gl = this.gl
    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s)
        gl.deleteShader(s)
        throw new Error('Shader compile failed: ' + log)
      }
      return s
    }
    const vs = mk(gl.VERTEX_SHADER, VERT)
    const fs = mk(gl.FRAGMENT_SHADER, frag)
    const p = gl.createProgram()!
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link failed: ' + gl.getProgramInfoLog(p))
    return p
  }

  private loc(name: string) {
    let l = this.locs.get(name)
    if (l === undefined) {
      l = this.gl.getUniformLocation(this.program, name)
      this.locs.set(name, l)
    }
    return l
  }

  use() {
    this.gl.useProgram(this.program)
  }

  set1f(n: string, v: number) {
    const l = this.loc(n)
    if (l) this.gl.uniform1f(l, v)
  }
  set1i(n: string, v: number) {
    const l = this.loc(n)
    if (l) this.gl.uniform1i(l, v)
  }
  set2f(n: string, x: number, y: number) {
    const l = this.loc(n)
    if (l) this.gl.uniform2f(l, x, y)
  }
  set3f(n: string, x: number, y: number, z: number) {
    const l = this.loc(n)
    if (l) this.gl.uniform3f(l, x, y, z)
  }
  set4f(n: string, x: number, y: number, z: number, w: number) {
    const l = this.loc(n)
    if (l) this.gl.uniform4f(l, x, y, z, w)
  }
  set4fv(n: string, v: Float32Array) {
    const l = this.loc(n)
    if (l) this.gl.uniform4fv(l, v)
  }
  setMat3(n: string, v: Float32Array) {
    const l = this.loc(n)
    if (l) this.gl.uniformMatrix3fv(l, false, v)
  }
  setTex(n: string, unit: number, tex: WebGLTexture | null) {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    this.set1i(n, unit)
  }

  /** Resize the drawing buffer to the canvas' CSS size × dpr × scale. Returns true if changed. */
  resize(cssW = this.canvas.clientWidth, cssH = this.canvas.clientHeight) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.scale
    const w = Math.max(1, Math.round(cssW * dpr))
    const h = Math.max(1, Math.round(cssH * dpr))
    this.pxPerCss = w / Math.max(1, cssW)
    if (w === this.width && h === this.height && this.canvas.width === w) return false
    this.width = this.canvas.width = w
    this.height = this.canvas.height = h
    return true
  }

  draw() {
    if (this.isLost) return
    const gl = this.gl
    gl.viewport(0, 0, this.width, this.height)
    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindVertexArray(null)
  }

  clear() {
    const gl = this.gl
    gl.viewport(0, 0, this.width, this.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  createTexture(source?: TexImageSource, mipmaps = false) {
    const gl = this.gl
    const t = gl.createTexture()!
    this.textures.add(t)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR)
    if (source) this.uploadTexture(t, source, mipmaps)
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]))
    return t
  }

  uploadTexture(t: WebGLTexture, source: TexImageSource, mipmaps = false) {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D)
  }

  deleteTexture(t: WebGLTexture) {
    this.gl.deleteTexture(t)
    this.textures.delete(t)
  }

  dispose() {
    const gl = this.gl
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    for (const t of this.textures) gl.deleteTexture(t)
    this.textures.clear()
    gl.deleteBuffer(this.buffer)
    gl.deleteVertexArray(this.vao)
    gl.deleteProgram(this.program)
    // Release the context eagerly so route changes don't pile up contexts.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

/** Shared image cache (HTMLImageElement decode promises), so textures are cheap to recreate. */
const imageCache = new Map<string, Promise<HTMLImageElement>>()
export function loadImage(url: string): Promise<HTMLImageElement> {
  let p = imageCache.get(url)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => resolve(img)
      img.onerror = () => {
        imageCache.delete(url)
        reject(new Error('image failed ' + url))
      }
      img.src = url
    })
    imageCache.set(url, p)
  }
  return p
}

/**
 * Frame-time governor with hysteresis: drops a quality tier when the average
 * frame time stays above ~52 fps, raises it after a long stretch of headroom,
 * and gives up raising after a few flip-flops.
 */
export class QualityGovernor {
  tier: number
  private acc = 0
  private n = 0
  private good = 0
  private flips = 0
  private readonly max: number
  private readonly onChange: (tier: number) => void

  constructor(start: number, max: number, onChange: (tier: number) => void) {
    this.tier = start
    this.max = max
    this.onChange = onChange
  }

  sample(dtMs: number) {
    if (dtMs > 250) return // tab switch / hitch, ignore
    this.acc += dtMs
    this.n++
    if (this.n < 40) return
    const avg = this.acc / this.n
    this.acc = 0
    this.n = 0
    if (avg > 19.5 && this.tier > 0) {
      this.tier--
      this.good = 0
      this.flips++
      this.onChange(this.tier)
    } else if (avg < 12.5 && this.tier < this.max && this.flips < 4) {
      if (++this.good >= 4) {
        this.good = 0
        this.tier++
        this.onChange(this.tier)
      }
    } else this.good = 0
  }
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
