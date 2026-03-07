import { MATERIALS, type PresetId, type SimulationSnapshot } from '@/sim/types'
import { hash32, random01 } from '@/sim/random'
import { cloneSnapshot, countExposedNeighbors, indexFor } from '@/sim/scene'

const PRESET_SALTS: Record<PresetId, number> = {
  melt: 0x17c3a5b,
  flood: 0x1c0ffee,
  burn: 0x0b16b00b,
}

function warmCharge(y: number, height: number): number {
  return 28 + Math.round((y / Math.max(1, height - 1)) * 44)
}

export function buildPresetScene(baseSnapshot: SimulationSnapshot, preset: PresetId): SimulationSnapshot {
  const snapshot = cloneSnapshot(baseSnapshot)
  const { width, height } = snapshot
  snapshot.tick = 0
  snapshot.seed = hash32(baseSnapshot.seed, PRESET_SALTS[preset], width, height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = indexFor(snapshot, x, y)
      const material = snapshot.materials[index]

      switch (material) {
        case MATERIALS.WATER:
          snapshot.charge[index] = 198
          break
        case MATERIALS.EMBER:
          snapshot.charge[index] = 220
          break
        case MATERIALS.STONE:
          snapshot.charge[index] = 32
          break
        case MATERIALS.SAND:
          snapshot.charge[index] = warmCharge(y, height)
          break
        default:
          snapshot.charge[index] = 0
      }
    }
  }

  if (preset === 'melt') {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = indexFor(snapshot, x, y)
        const material = snapshot.materials[index]
        const exposure = countExposedNeighbors(snapshot, x, y)
        const noise = random01(snapshot.seed, x, y, 1, snapshot.tick)

        if (material === MATERIALS.STONE && exposure >= 2 && noise < 0.36) {
          snapshot.materials[index] = MATERIALS.SAND
          snapshot.charge[index] = warmCharge(y, height) + 18
          continue
        }

        if (material !== MATERIALS.EMPTY && y >= Math.floor(height * 0.72) && exposure >= 1 && noise < 0.08) {
          snapshot.materials[index] = MATERIALS.EMBER
          snapshot.charge[index] = 232
          continue
        }

        if (
          material === MATERIALS.EMPTY &&
          y >= Math.floor(height * 0.7) &&
          y < height - 3 &&
          snapshot.materials[indexFor(snapshot, x, y + 1)] !== MATERIALS.EMPTY &&
          noise < 0.03
        ) {
          snapshot.materials[index] = MATERIALS.EMBER
          snapshot.charge[index] = 208
        }
      }
    }
  }

  if (preset === 'flood') {
    const crest = Math.max(8, Math.floor(height * 0.18))

    for (let x = 0; x < width; x += 1) {
      const waveHeight = crest + Math.floor(Math.sin(x * 0.18) * 4) + Math.floor(random01(snapshot.seed, x, 0, 2, 0) * 4)
      for (let y = 0; y < Math.min(height, waveHeight); y += 1) {
        const index = indexFor(snapshot, x, y)
        if (snapshot.materials[index] === MATERIALS.EMPTY || snapshot.materials[index] === MATERIALS.SMOKE) {
          snapshot.materials[index] = MATERIALS.WATER
          snapshot.charge[index] = 210
        }
      }
    }

    const spillWidth = Math.max(6, Math.floor(width * 0.08))
    for (let x = 0; x < spillWidth; x += 1) {
      for (let y = 0; y < height; y += 1) {
        const index = indexFor(snapshot, x, y)
        if (snapshot.materials[index] === MATERIALS.EMPTY && random01(snapshot.seed, x, y, 3, 0) < 0.88 - (x / spillWidth) * 0.4) {
          snapshot.materials[index] = MATERIALS.WATER
          snapshot.charge[index] = 198
        }
      }
    }

    for (let index = 0; index < snapshot.materials.length; index += 1) {
      if (snapshot.materials[index] === MATERIALS.EMBER) {
        snapshot.materials[index] = MATERIALS.SAND
        snapshot.charge[index] = 28
      }
    }
  }

  if (preset === 'burn') {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = indexFor(snapshot, x, y)
        const material = snapshot.materials[index]
        if (material === MATERIALS.EMPTY || material === MATERIALS.WATER) {
          continue
        }

        const exposure = countExposedNeighbors(snapshot, x, y)
        const emberChance = 0.05 + (exposure * 0.035)
        if (random01(snapshot.seed, x, y, 4, 0) < emberChance) {
          snapshot.materials[index] = MATERIALS.EMBER
          snapshot.charge[index] = 236
          continue
        }

        if (material === MATERIALS.SAND) {
          snapshot.charge[index] = 54
        }
      }
    }

    for (let y = 1; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = indexFor(snapshot, x, y)
        const aboveIndex = indexFor(snapshot, x, y - 1)
        if (
          snapshot.materials[index] === MATERIALS.EMBER &&
          snapshot.materials[aboveIndex] === MATERIALS.EMPTY &&
          random01(snapshot.seed, x, y, 5, 0) < 0.22
        ) {
          snapshot.materials[aboveIndex] = MATERIALS.SMOKE
          snapshot.charge[aboveIndex] = 118
        }
      }
    }
  }

  return snapshot
}
