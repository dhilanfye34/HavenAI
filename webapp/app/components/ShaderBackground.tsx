"use client"

import { useRef, useEffect } from "react"

const VERTEX = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

const FRAGMENT = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;

void main(void) {
  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
  float t = time * 0.05;
  float lineWidth = 0.0015;

  float r = 0.0, g = 0.0, b = 0.0;

  for(int j = 0; j < 3; j++){
    float ch = 0.0;
    for(int i = 0; i < 5; i++){
      ch += lineWidth * float(i*i) / abs(
        fract(t - 0.01 * float(j) + float(i) * 0.01) * 5.0
        - length(uv) + mod(uv.x + uv.y, 0.2)
      );
    }
    if(j == 0) r = ch;
    if(j == 1) g = ch;
    if(j == 2) b = ch;
  }

  vec3 violet = vec3(0.545, 0.361, 0.965);
  vec3 cyan   = vec3(0.133, 0.827, 0.933);
  vec3 deep   = vec3(0.04, 0.04, 0.06);

  float energy = (r + g + b) / 3.0;
  float hueShift = sin(time * 0.02 + length(uv) * 1.5) * 0.5 + 0.5;
  vec3 glow = mix(violet, cyan, hueShift);

  vec3 color = deep + glow * energy * 1.2;

  float dist = length(uv);
  float vignette = smoothstep(1.8, 0.4, dist);
  color *= vignette;

  O = vec4(color, 1.0);
}`

interface ShaderBackgroundProps {
  className?: string
}

export function ShaderBackground({ className = "" }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2")
    if (!gl) return

    // Lower DPR on mobile for big perf win
    const isMobile = window.matchMedia("(max-width: 768px)").matches
    const dpr = isMobile ? 1 : Math.min(1.5, window.devicePixelRatio)

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

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

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog))
    }

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,1,1,-1]), gl.STATIC_DRAW)

    const pos = gl.getAttribLocation(prog, "position")
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, "resolution")
    const uTime = gl.getUniformLocation(prog, "time")

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    resize()
    window.addEventListener("resize", resize)

    // Pause rendering when the canvas is off-screen
    let visible = true
    const io = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting },
      { threshold: 0 }
    )
    io.observe(canvas)

    // Throttle to ~30fps
    const targetInterval = 1000 / 30
    let lastTime = 0
    let t = 1.0

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (!visible) return
      const delta = now - lastTime
      if (delta < targetInterval) return
      lastTime = now - (delta % targetInterval)

      t += prefersReducedMotion ? 0 : 0.12
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, t)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      io.disconnect()
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
      className={`absolute inset-0 h-full w-full ${className}`}
      style={{ background: "#0a0a0f" }}
    />
  )
}
