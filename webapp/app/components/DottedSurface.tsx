"use client"

import { useRef, useEffect } from "react"

const VERTEX = `#version 300 es
precision highp float;
in vec2 position;
uniform float time;
uniform vec2 resolution;
out float vAlpha;

void main() {
  float ix = position.x;
  float iy = position.y;

  float x = (ix - 20.0) * 150.0;
  float z = (iy - 30.0) * 150.0;
  float y = sin((ix + time * 0.07) * 0.3) * 50.0
          + sin((iy + time * 0.07) * 0.5) * 50.0;

  // Simple perspective projection
  float fov = 60.0;
  float near = 1.0;
  float aspect = resolution.x / resolution.y;
  float f = 1.0 / tan(radians(fov) * 0.5);

  // Camera at (0, 355, 1220) looking at origin
  float cx = x;
  float cy = y - 355.0;
  float cz = z - 1220.0;

  float clipX = f / aspect * cx / (-cz);
  float clipY = f * cy / (-cz);

  gl_Position = vec4(clipX, clipY, 0.0, 1.0);

  // Size attenuation + fog
  float dist = length(vec3(cx, cy, cz));
  gl_PointSize = max(1.0, 800.0 / dist);

  // Fog: fade from 2000 to 10000
  float fog = 1.0 - smoothstep(2000.0, 10000.0, dist);
  vAlpha = 0.6 * fog;
}`

const FRAGMENT = `#version 300 es
precision highp float;
in float vAlpha;
out vec4 O;

void main() {
  // Round point
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  O = vec4(0.55, 0.36, 0.96, vAlpha);
}`

interface DottedSurfaceProps {
  className?: string
}

export function DottedSurface({ className = "" }: DottedSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2", { alpha: true })
    if (!gl) return

    const dpr = Math.min(1.5, window.devicePixelRatio)

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s))
      }
      return s
    }

    const vs = compile(gl.VERTEX_SHADER, VERTEX)
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT)

    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)

    // Generate grid of points
    const AMOUNTX = 40
    const AMOUNTY = 60
    const positions = new Float32Array(AMOUNTX * AMOUNTY * 2)
    let idx = 0
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions[idx++] = ix
        positions[idx++] = iy
      }
    }

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    const posLoc = gl.getAttribLocation(prog, "position")
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, "time")
    const uRes = gl.getUniformLocation(prog, "resolution")

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    resize()
    window.addEventListener("resize", resize)

    let t = 0
    const numPoints = AMOUNTX * AMOUNTY

    const loop = () => {
      t += 1
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.uniform1f(uTime, t)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.drawArrays(gl.POINTS, 0, numPoints)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("resize", resize)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none fixed inset-0 h-full w-full ${className}`}
    />
  )
}
