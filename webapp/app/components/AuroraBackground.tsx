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
#define PI 3.14159265

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1,0)), f.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 7; i++) {
    v += a * noise(p);
    p = rot * p * 2.0 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

float warp(vec2 p, float t) {
  vec2 q = vec2(
    fbm(p + vec2(0.0, 0.0) + t * 0.12),
    fbm(p + vec2(5.2, 1.3) + t * 0.10)
  );
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.08),
    fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.06)
  );
  return fbm(p + 4.0 * r);
}

void main(void) {
  vec2 uv = gl_FragCoord.xy / R;
  vec2 p = (gl_FragCoord.xy * 2.0 - R) / min(R.x, R.y);

  float t = T * 0.3;

  // Domain-warped nebula layers
  float w1 = warp(p * 1.2, t);
  float w2 = warp(p * 0.8 + vec2(3.0, -2.0), t * 0.7 + 20.0);
  float w3 = warp(p * 1.5 - vec2(1.0, 3.0), t * 0.5 + 40.0);

  // Plasma ribbons — sinusoidal energy bands
  float ribbon1 = smoothstep(0.0, 0.08, abs(sin(p.y * 3.0 + w1 * 6.0 + t * 0.8) * 0.15 - 0.05));
  float ribbon2 = smoothstep(0.0, 0.06, abs(sin(p.x * 2.5 + w2 * 5.0 - t * 0.6) * 0.12 - 0.03));
  float energy1 = (1.0 - ribbon1) * 0.7;
  float energy2 = (1.0 - ribbon2) * 0.5;

  // Color mixing — vivid violet/cyan/magenta
  vec3 deepViolet = vec3(0.20, 0.02, 0.45);
  vec3 brightViolet = vec3(0.55, 0.20, 0.90);
  vec3 cyan = vec3(0.05, 0.70, 0.85);
  vec3 magenta = vec3(0.75, 0.10, 0.55);
  vec3 electric = vec3(0.40, 0.60, 1.00);

  vec3 col = vec3(0.015, 0.005, 0.03);

  // Nebula clouds
  col += deepViolet * pow(w1, 1.5) * 2.0;
  col += brightViolet * pow(w2, 2.0) * 1.5;
  col += magenta * pow(w3, 2.5) * 0.8;

  // Color shifts based on warped coordinates
  float hueShift = sin(w1 * 4.0 + t * 0.3) * 0.5 + 0.5;
  col += mix(cyan, electric, hueShift) * (energy1 + energy2) * 0.6;

  // Bright energy peaks
  float peak = max(w1, max(w2, w3));
  col += vec3(0.5, 0.3, 0.9) * pow(peak, 4.0) * 1.5;

  // Glowing core hotspots
  float hotspot1 = exp(-3.0 * length(p - vec2(sin(t * 0.2) * 0.5, cos(t * 0.15) * 0.3)));
  float hotspot2 = exp(-4.0 * length(p - vec2(cos(t * 0.18) * 0.6, sin(t * 0.22) * -0.4)));
  col += brightViolet * hotspot1 * 0.4;
  col += cyan * hotspot2 * 0.3;

  // Star sparkles
  float stars = pow(hash(floor(gl_FragCoord.xy * 0.4)), 24.0);
  float twinkle = sin(T * 2.0 + hash(floor(gl_FragCoord.xy * 0.4)) * 50.0) * 0.5 + 0.5;
  col += vec3(0.7, 0.8, 1.0) * stars * twinkle * 0.6;

  // Soft vignette
  float vig = 1.0 - 0.25 * length(p * 0.5);
  col *= max(vig, 0.0);

  // Tone mapping — keep it rich but not blown out
  col = col / (col + 0.8);

  O = vec4(col, 1.0);
}`

interface AuroraBackgroundProps {
  className?: string
}

export function AuroraBackground({ className = "" }: AuroraBackgroundProps) {
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
      className={`h-full w-full ${className}`}
      style={{ background: "#0a0a0f" }}
    />
  )
}
