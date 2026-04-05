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

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

  float d = length(p) * 0.05;

  float rx = p.x * (1.0 + d);
  float gx = p.x;
  float bx = p.x * (1.0 - d);

  float r = 0.05 / abs(p.y + sin((rx + time) * 1.0) * 0.5);
  float g = 0.05 / abs(p.y + sin((gx + time) * 1.0) * 0.5);
  float b = 0.05 / abs(p.y + sin((bx + time) * 1.0) * 0.5);

  float energy = (r + g + b) / 3.0;
  float chromatic = r - b;

  vec3 violet = vec3(0.50, 0.22, 0.90);
  vec3 cyan   = vec3(0.12, 0.70, 0.88);
  vec3 deep   = vec3(0.02, 0.01, 0.04);

  float hue = clamp(chromatic * 0.5 + 0.5, 0.0, 1.0);
  vec3 glow = mix(violet, cyan, hue);
  vec3 color = deep + glow * energy * 0.45;

  float dist = length(p * 0.6);
  float vig = smoothstep(1.6, 0.2, dist);
  color *= vig;

  O = vec4(color, 1.0);
}`

interface WaveShaderProps {
  className?: string
}

export function WaveShader({ className = "" }: WaveShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2")
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

    let t = 0
    const loop = () => {
      t += 0.01
      gl.clearColor(0.02, 0.008, 0.016, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, t)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
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
      className={`absolute inset-0 h-full w-full ${className}`}
      style={{ background: "#05020a" }}
    />
  )
}
