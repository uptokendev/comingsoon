import { useEffect, useRef, useState } from 'react'

interface Particle {
  color: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseRadius: number
  alpha: number
  alphaDir: 1 | -1
  alphaSpeed: number
}

interface SpaceBackgroundProps {
  particleCount?: number
  particleColor?: string // override
  backgroundColor?: string
  className?: string
}

// --- Utility: parse RGB/hex colors ---
function parseRGB(cssColor: string) {
  if (!cssColor) return null
  cssColor = cssColor.trim()

  // hex
  if (cssColor[0] === '#') {
    let hex = cssColor.slice(1)
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return [r, g, b]
  }

  // rgb/rgba
  const m = cssColor.match(/rgba?\(([^)]+)\)/)
  if (m) {
    const parts = m[1].split(',').map((s) => parseFloat(s.trim()))
    return [parts[0], parts[1], parts[2]]
  }

  return null
}

function luminanceFromRgb([r, g, b]: number[]) {
  const srgb = [r / 255, g / 255, b / 255].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

/**
 * Canvas particle background ("sparkles") ported from your app's LoadingScreen.
 * - Fixed behind the UI
 * - Pointer events disabled
 */
export function SpaceBackground({
  particleCount = 450,
  particleColor = 'blue',
  backgroundColor = 'transparent',
  className = '',
}: SpaceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const [resolvedColor, setResolvedColor] = useState<string | undefined>(undefined)

  // --- Detect effective background color ---
  const detectBackgroundColor = () => {
    if (backgroundColor && backgroundColor !== 'transparent') return backgroundColor

    const candidates = [document.body, document.documentElement]
    for (const el of candidates) {
      if (!el) continue
      const cs = getComputedStyle(el)
      const bg = cs.backgroundColor || (cs as any).background
      if (!bg) continue
      const rgb = parseRGB(bg)
      if (!rgb) continue

      if (/rgba/.test(bg)) {
        const alpha = parseFloat(bg.split(',').pop() || '1')
        if (isNaN(alpha) || alpha === 0) continue
      }
      return bg
    }

    const media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
    return media && media.matches ? 'black' : 'white'
  }

  // --- Compute high contrast particle color ---
  useEffect(() => {
    if (particleColor) {
      setResolvedColor(particleColor)
      return
    }

    const setContrast = () => {
      let bg = detectBackgroundColor()
      if (!bg || bg === 'transparent') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        bg = isDark ? 'black' : 'white'
      }

      const rgb = parseRGB(bg)
      if (rgb) {
        const lum = luminanceFromRgb(rgb)
        if (lum < 0.5) {
          setResolvedColor('rgba(255,255,255,0.85)') // dark background → bright stars
        } else {
          setResolvedColor('rgba(0,0,0,0.85)') // light background → visible dark stars
        }
      } else {
        const media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
        setResolvedColor(media && media.matches ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)')
      }
    }

    setContrast()

    const media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
    const onMedia = () => setContrast()
    if (media && media.addEventListener) media.addEventListener('change', onMedia)

    const mo = new MutationObserver(() => setTimeout(setContrast, 10))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] })
    mo.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] })

    return () => {
      if (media && media.removeEventListener) media.removeEventListener('change', onMedia)
      mo.disconnect()
    }
  }, [particleColor, backgroundColor])

  // --- Draw / animate ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (!resolvedColor) return

    // Paint particles in screen-space (0..width, 0..height), so they drift across the full viewport.
    const baseRgb = parseRGB(resolvedColor)
    const baseFill = baseRgb ? `rgb(${baseRgb[0]}, ${baseRgb[1]}, ${baseRgb[2]})` : resolvedColor

    const state = {
      particles: [] as Particle[],
      counter: 0,
      w: window.innerWidth,
      h: window.innerHeight,
      dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    }

    const setupCanvas = () => {
      state.w = window.innerWidth
      state.h = window.innerHeight
      state.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
      canvas.width = Math.floor(state.w * state.dpr)
      canvas.height = Math.floor(state.h * state.dpr)
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0)
    }
    setupCanvas()

    const spawnParticle = (p?: Particle) => {
      const radius = Math.random() * 2.6 + 0.4
      const speed = (Math.random() * 0.55 + 0.15) * (state.h < 500 ? 0.75 : 1)
      const a = Math.random() * Math.PI * 2
      const alpha = Math.random() * 0.55 + 0.15

      const target = p ?? ({} as Particle)
      target.color = baseFill
      target.baseRadius = radius
      target.radius = radius
      target.x = Math.random() * state.w
      target.y = Math.random() * state.h
      target.vx = Math.cos(a) * speed
      target.vy = Math.sin(a) * speed
      target.alpha = alpha
      target.alphaDir = Math.random() > 0.5 ? 1 : -1
      target.alphaSpeed = Math.random() * 0.006 + 0.0025
      return target
    }

    for (let i = 0; i < particleCount; i++) state.particles.push(spawnParticle())

    const moveParticle = (p: Particle) => {
      p.x += p.vx
      p.y += p.vy

      // Wrap at edges (keeps motion continuous)
      const m = 24
      if (p.x < -m) p.x = state.w + m
      else if (p.x > state.w + m) p.x = -m
      if (p.y < -m) p.y = state.h + m
      else if (p.y > state.h + m) p.y = -m

      // Gentle twinkle
      p.alpha += p.alphaSpeed * p.alphaDir
      if (p.alpha > 0.85) {
        p.alpha = 0.85
        p.alphaDir = -1
      } else if (p.alpha < 0.08) {
        p.alpha = 0.08
        p.alphaDir = 1
      }
    }

    const draw = (p: Particle) => {
      ctx.beginPath()
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.alpha
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    const loop = () => {
      ctx.clearRect(0, 0, state.w, state.h)
      if (state.counter < state.particles.length) state.counter++

      for (let i = 0; i < state.counter; i++) {
        const p = state.particles[i]
        moveParticle(p)
        draw(p)
      }

      ctx.globalAlpha = 1
      animationRef.current = requestAnimationFrame(loop)
    }

    animationRef.current = requestAnimationFrame(loop)

    const handleResize = () => {
      const prevW = state.w
      const prevH = state.h
      setupCanvas()

      // Keep particles in roughly the same relative positions.
      if (prevW > 0 && prevH > 0) {
        for (const p of state.particles) {
          p.x = (p.x / prevW) * state.w
          p.y = (p.y / prevH) * state.h
        }
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [particleCount, resolvedColor])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 0,
        display: 'block',
        width: '100%',
        height: '100%',
        background: backgroundColor,
        pointerEvents: 'none',
      }}
    />
  )
}
