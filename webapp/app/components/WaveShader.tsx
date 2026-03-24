"use client"

import { useEffect, useRef } from "react"

interface WaveShaderProps {
  className?: string
}

export function WaveShader({ className = "" }: WaveShaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false
    const container = containerRef.current

    import("three").then((THREE) => {
      if (cancelled || !container) return

      const vertexShader = `
        attribute vec3 position;
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `

      const fragmentShader = `
        precision highp float;
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

          // Remap RGB channels into violet/cyan palette
          float energy = (r + g + b) / 3.0;
          float chromatic = r - b;

          vec3 violet = vec3(0.50, 0.22, 0.90);
          vec3 cyan   = vec3(0.12, 0.70, 0.88);
          vec3 deep   = vec3(0.02, 0.01, 0.04);

          float hue = clamp(chromatic * 0.5 + 0.5, 0.0, 1.0);
          vec3 glow = mix(violet, cyan, hue);
          vec3 color = deep + glow * energy * 0.45;

          // Subtle vignette
          float dist = length(p * 0.6);
          float vig = smoothstep(1.6, 0.2, dist);
          color *= vig;

          gl_FragColor = vec4(color, 1.0);
        }
      `

      const scene = new THREE.Scene()
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(new THREE.Color(0x05020a))

      const canvas = renderer.domElement
      canvas.style.display = "block"
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      container.appendChild(canvas)

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

      const uniforms = {
        resolution: { value: [container.clientWidth, container.clientHeight] },
        time: { value: 0.0 },
      }

      const position = new Float32Array([
        -1, -1, 0,  1, -1, 0,  -1, 1, 0,
         1, -1, 0, -1,  1, 0,   1, 1, 0,
      ])
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", new THREE.BufferAttribute(position, 3))

      const material = new THREE.RawShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        side: THREE.DoubleSide,
      })

      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      const onResize = () => {
        const width = container.clientWidth
        const height = container.clientHeight
        if (width === 0 || height === 0) return
        renderer.setSize(width, height, false)
        uniforms.resolution.value = [
          width * renderer.getPixelRatio(),
          height * renderer.getPixelRatio(),
        ]
      }

      onResize()
      window.addEventListener("resize", onResize)

      let animId = 0
      const animate = () => {
        animId = requestAnimationFrame(animate)
        uniforms.time.value += 0.01
        renderer.render(scene, camera)
      }
      animate()

      cleanupRef.current = () => {
        cancelAnimationFrame(animId)
        window.removeEventListener("resize", onResize)
        if (container.contains(canvas)) container.removeChild(canvas)
        renderer.dispose()
        geometry.dispose()
        material.dispose()
      }
    })

    return () => {
      cancelled = true
      cleanupRef.current?.()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${className}`}
      style={{ overflow: "hidden" }}
    />
  )
}
