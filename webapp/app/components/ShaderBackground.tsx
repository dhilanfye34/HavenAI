"use client"

import { useEffect, useRef } from "react"

interface ShaderBackgroundProps {
  className?: string
}

export function ShaderBackground({ className = "" }: ShaderBackgroundProps) {
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
        precision highp float;
        uniform vec2 resolution;
        uniform float time;

        void main(void) {
          vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
          float t = time * 0.05;
          float lineWidth = 0.0015;

          float r = 0.0;
          float g = 0.0;
          float b = 0.0;

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
        uniforms.resolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio())
      }

      onResize()
      window.addEventListener("resize", onResize)

      let animId = 0
      const animate = () => {
        animId = requestAnimationFrame(animate)
        uniforms.time.value += 0.06
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
