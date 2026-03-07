import { MATERIALS } from '@/sim/types'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function rgbaForCell(material: number, charge: number): [number, number, number, number] {
  switch (material) {
    case MATERIALS.SAND: {
      const warmth = clamp(charge * 0.22, 0, 42)
      return [214 + warmth, 183 + warmth * 0.4, 120, 255]
    }
    case MATERIALS.WATER: {
      const shimmer = clamp(charge * 0.14, 0, 28)
      return [76, 144 + shimmer * 0.35, 240 + shimmer * 0.25, 255]
    }
    case MATERIALS.STONE: {
      const glow = clamp(charge * 0.12, 0, 20)
      return [126 + glow * 0.25, 136 + glow * 0.15, 162 + glow * 0.35, 255]
    }
    case MATERIALS.EMBER: {
      const intensity = clamp(charge / 255, 0, 1)
      return [255, 120 + Math.round(90 * intensity), 32 + Math.round(26 * intensity), 255]
    }
    case MATERIALS.SMOKE: {
      const density = clamp(charge / 255, 0, 1)
      const base = 128 + Math.round(48 * density)
      return [base, base + 6, base + 18, Math.round(48 + (175 * density))]
    }
    default:
      return [0, 0, 0, 0]
  }
}
