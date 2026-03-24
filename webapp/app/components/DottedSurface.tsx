"use client"

import { useEffect, useRef } from "react"

interface DottedSurfaceProps {
  className?: string
}

export function DottedSurface({ className = "" }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false
    const container = containerRef.current

    import("three").then((THREE) => {
      if (cancelled || !container) return

      const SEPARATION = 150
      const AMOUNTX = 40
      const AMOUNTY = 60

      const scene = new THREE.Scene()
      scene.fog = new THREE.Fog(0x0a0a0f, 2000, 10000)

      const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        1,
        10000
      )
      camera.position.set(0, 355, 1220)

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setClearColor(0x0a0a0f, 0)

      container.appendChild(renderer.domElement)

      const positions: number[] = []
      const colors: number[] = []
      const geometry = new THREE.BufferGeometry()

      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2
          const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2
          positions.push(x, 0, z)
          colors.push(0.55, 0.36, 0.96)
        }
      }

      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))

      const material = new THREE.PointsMaterial({
        size: 6,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
      })

      const points = new THREE.Points(geometry, material)
      scene.add(points)

      let count = 0
      let animId = 0

      const animate = () => {
        animId = requestAnimationFrame(animate)

        const posArr = geometry.attributes.position.array as Float32Array
        let i = 0
        for (let ix = 0; ix < AMOUNTX; ix++) {
          for (let iy = 0; iy < AMOUNTY; iy++) {
            posArr[i * 3 + 1] =
              Math.sin((ix + count) * 0.3) * 50 +
              Math.sin((iy + count) * 0.5) * 50
            i++
          }
        }
        geometry.attributes.position.needsUpdate = true

        renderer.render(scene, camera)
        count += 0.07
      }

      const handleResize = () => {
        const w = container.clientWidth
        const h = container.clientHeight
        if (w === 0 || h === 0) return
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }

      window.addEventListener("resize", handleResize)
      animate()

      cleanupRef.current = () => {
        cancelAnimationFrame(animId)
        window.removeEventListener("resize", handleResize)
        scene.traverse((obj) => {
          if (obj instanceof THREE.Points) {
            obj.geometry.dispose()
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose())
            } else {
              obj.material.dispose()
            }
          }
        })
        renderer.dispose()
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement)
        }
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
      className={`pointer-events-none fixed inset-0 ${className}`}
    />
  )
}
