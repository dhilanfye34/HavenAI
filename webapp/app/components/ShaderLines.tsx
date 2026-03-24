"use client"

import { useEffect, useRef } from "react"

interface ShaderLinesProps {
  className?: string
}

export function ShaderLines({ className = "" }: ShaderLinesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false
    const container = containerRef.current

    import("three").then((THREE) => {
      if (cancelled || !container) return

      const vertexShader = `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `

      const fragmentShader = `
        #define TWO_PI 6.2831853072
        #define PI 3.14159265359

        precision highp float;
        uniform vec2 resolution;
        uniform float time;

        float random(in float x) {
          return fract(sin(x) * 1e4);
        }

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main(void) {
          vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);

          vec2 fMosaicScal = vec2(4.0, 2.0);
          vec2 vScreenSize = vec2(256.0, 256.0);
          uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
          uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);

          float t = time * 0.06 + random(uv.x) * 0.4;
          float lineWidth = 0.0007;

          vec3 rawColor = vec3(0.0);
          for (int j = 0; j < 3; j++) {
            for (int i = 0; i < 5; i++) {
              rawColor[j] += lineWidth * float(i * i)
                / abs(fract(t - 0.01 * float(j) + float(i) * 0.01) * 1.0 - length(uv));
            }
          }

          float energy = (rawColor.x + rawColor.y + rawColor.z) / 3.0;
          float spread = rawColor.z - rawColor.x;

          vec3 violet = vec3(0.55, 0.25, 0.95);
          vec3 cyan   = vec3(0.15, 0.75, 0.92);
          vec3 deep   = vec3(0.03, 0.01, 0.06);

          float hue = sin(energy * 4.0 + spread * 2.0) * 0.5 + 0.5;
          vec3 glow = mix(violet, cyan, hue);
          vec3 color = deep + glow * energy * 0.55;

          color += vec3(0.2, 0.1, 0.35) * pow(energy, 3.0) * 0.5;

          // Vignette
          float dist = length(uv);
          float vig = smoothstep(2.0, 0.2, dist);
          color *= vig;

          gl_FragColor = vec4(color, 1.0);
        }
      `

      const camera = new THREE.Camera()
      camera.position.z = 1

      const scene = new THREE.Scene()
      const geometry = new THREE.PlaneGeometry(2, 2)

      const uniforms = {
        time: { value: 1.0 },
        resolution: { value: new THREE.Vector2() },
      }

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
      })

      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      const canvas = renderer.domElement
      canvas.style.display = "block"
      canvas.style.width = "100%"
      canvas.style.height = "100%"
      container.appendChild(canvas)

      const onResize = () => {
        const width = container.clientWidth
        const height = container.clientHeight
        if (width === 0 || height === 0) return
        renderer.setSize(width, height, false)
        uniforms.resolution.value.set(
          width * renderer.getPixelRatio(),
          height * renderer.getPixelRatio()
        )
      }

      onResize()
      window.addEventListener("resize", onResize)

      let animId = 0
      const animate = () => {
        animId = requestAnimationFrame(animate)
        uniforms.time.value += 0.04
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
