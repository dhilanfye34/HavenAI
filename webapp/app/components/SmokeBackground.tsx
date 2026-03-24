"use client"

import { useRef, useEffect } from "react"

const VERTEX_SRC = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

const FRAGMENT_SRC = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define R resolution
#define T time

float hash(vec2 p) {
  float h = dot(p, vec2(127.1, 311.7));
  return fract(sin(h) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = rot * p * 2.0 + vec2(100.0);
    a *= 0.5;
  }
  return v;
}

float smoke(vec2 uv, float t) {
  vec2 q = vec2(
    fbm(uv + vec2(0.0, 0.0) + t * 0.15),
    fbm(uv + vec2(5.2, 1.3) + t * 0.12)
  );
  vec2 r = vec2(
    fbm(uv + 4.0 * q + vec2(1.7, 9.2) + t * 0.1),
    fbm(uv + 4.0 * q + vec2(8.3, 2.8) + t * 0.08)
  );
  return fbm(uv + 4.0 * r);
}

void main(void) {
  vec2 uv = gl_FragCoord.xy / R;
  vec2 p = (gl_FragCoord.xy * 2.0 - R) / min(R.x, R.y);

  float s1 = smoke(p * 1.5, T * 0.4);
  float s2 = smoke(p * 2.0 + vec2(3.0), T * 0.3 + 10.0);
  float s3 = smoke(p * 0.8 - vec2(2.0), T * 0.25 + 20.0);

  // Violet / purple palette
  vec3 deepBg   = vec3(0.02, 0.01, 0.04);
  vec3 violet    = vec3(0.28, 0.08, 0.48);
  vec3 purple    = vec3(0.40, 0.10, 0.55);
  vec3 magenta   = vec3(0.50, 0.05, 0.35);

  vec3 col = deepBg;
  col = mix(col, violet,  s1 * 0.6);
  col = mix(col, purple,  s2 * 0.35);
  col = mix(col, magenta, s3 * 0.2);

  // Brighten peaks
  float peak = max(s1, max(s2, s3));
  col += vec3(0.15, 0.04, 0.25) * pow(peak, 3.0);

  // Vignette to darken edges
  float vig = 1.0 - 0.4 * length(p * 0.5);
  col *= max(vig, 0.0);

  // Fade top and bottom to pure black for seamless blending
  float fadeTop = smoothstep(0.0, 0.15, uv.y);
  float fadeBot = smoothstep(1.0, 0.85, uv.y);
  col *= fadeTop * fadeBot;

  O = vec4(col, 1.0);
}`

interface SmokeBackgroundProps {
  className?: string
}

export function SmokeBackground({ className = "" }: SmokeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2")
    if (!gl) return

    const dpr = Math.max(1, 0.5 * window.devicePixelRatio)

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s))
      }
      return s
    }

    const vs = compile(gl.VERTEX_SHADER, VERTEX_SRC)
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC)

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

    const loop = (now: number) => {
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, now * 1e-3)
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
      style={{ background: "#0a0a0f" }}
    />
  )
}
