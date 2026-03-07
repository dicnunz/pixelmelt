import { MATERIALS, type SimulationSnapshot } from '@/sim/types'
import { cloneSnapshot, hasNeighborMaterial, inBounds, indexFor } from '@/sim/scene'
import { pickSign, random01 } from '@/sim/random'

function swap(snapshot: SimulationSnapshot, sourceIndex: number, targetIndex: number): void {
  const material = snapshot.materials[sourceIndex]
  const charge = snapshot.charge[sourceIndex]
  snapshot.materials[sourceIndex] = snapshot.materials[targetIndex]
  snapshot.charge[sourceIndex] = snapshot.charge[targetIndex]
  snapshot.materials[targetIndex] = material
  snapshot.charge[targetIndex] = charge
}

function moveInto(snapshot: SimulationSnapshot, sourceIndex: number, targetIndex: number): void {
  snapshot.materials[targetIndex] = snapshot.materials[sourceIndex]
  snapshot.charge[targetIndex] = snapshot.charge[sourceIndex]
  snapshot.materials[sourceIndex] = MATERIALS.EMPTY
  snapshot.charge[sourceIndex] = 0
}

function moveCell(
  snapshot: SimulationSnapshot,
  updated: Uint8Array,
  x: number,
  y: number,
  targets: Array<[number, number]>,
  accepts: (material: number) => boolean,
): boolean {
  const sourceIndex = indexFor(snapshot, x, y)
  if (updated[sourceIndex]) {
    return false
  }

  for (const [targetX, targetY] of targets) {
    if (!inBounds(snapshot, targetX, targetY)) {
      continue
    }

    const targetIndex = indexFor(snapshot, targetX, targetY)
    if (updated[targetIndex]) {
      continue
    }

    const targetMaterial = snapshot.materials[targetIndex]
    if (!accepts(targetMaterial)) {
      continue
    }

    if (targetMaterial === MATERIALS.EMPTY) {
      moveInto(snapshot, sourceIndex, targetIndex)
    } else {
      swap(snapshot, sourceIndex, targetIndex)
    }

    updated[sourceIndex] = 1
    updated[targetIndex] = 1
    return true
  }

  return false
}

function canSandDisplace(material: number): boolean {
  return material === MATERIALS.EMPTY || material === MATERIALS.WATER || material === MATERIALS.SMOKE
}

function canWaterDisplace(material: number): boolean {
  return material === MATERIALS.EMPTY || material === MATERIALS.SMOKE
}

function canGasDisplace(material: number): boolean {
  return material === MATERIALS.EMPTY
}

function processSand(snapshot: SimulationSnapshot, updated: Uint8Array, x: number, y: number): void {
  const direction = pickSign(snapshot.seed, x, y, snapshot.tick, 1)
  if (
    moveCell(snapshot, updated, x, y, [
      [x, y + 1],
      [x + direction, y + 1],
      [x - direction, y + 1],
    ], canSandDisplace)
  ) {
    return
  }

  const index = indexFor(snapshot, x, y)
  if (snapshot.charge[index] > 56) {
    moveCell(snapshot, updated, x, y, [[x + direction, y], [x - direction, y]], (material) => material === MATERIALS.EMPTY)
  }
}

function processWater(snapshot: SimulationSnapshot, updated: Uint8Array, x: number, y: number): void {
  const direction = pickSign(snapshot.seed, x, y, snapshot.tick, 2)
  moveCell(snapshot, updated, x, y, [
    [x, y + 1],
    [x + direction, y + 1],
    [x - direction, y + 1],
    [x + direction, y],
    [x - direction, y],
  ], canWaterDisplace)
}

function processSmoke(snapshot: SimulationSnapshot, updated: Uint8Array, x: number, y: number): void {
  const direction = pickSign(snapshot.seed, x, y, snapshot.tick, 3)
  moveCell(snapshot, updated, x, y, [
    [x, y - 1],
    [x + direction, y - 1],
    [x - direction, y - 1],
    [x + direction, y],
    [x - direction, y],
  ], canGasDisplace)
}

function processEmber(snapshot: SimulationSnapshot, updated: Uint8Array, x: number, y: number): void {
  const direction = pickSign(snapshot.seed, x, y, snapshot.tick, 4)
  const index = indexFor(snapshot, x, y)
  const isHot = snapshot.charge[index] > 124
  const primaryTargets: Array<[number, number]> = isHot
    ? [
        [x, y - 1],
        [x + direction, y - 1],
        [x - direction, y - 1],
        [x + direction, y],
        [x - direction, y],
        [x, y + 1],
      ]
    : [
        [x, y + 1],
        [x + direction, y + 1],
        [x - direction, y + 1],
        [x + direction, y],
        [x - direction, y],
        [x, y - 1],
      ]

  moveCell(snapshot, updated, x, y, primaryTargets, (material) => material === MATERIALS.EMPTY || material === MATERIALS.SMOKE)
}

export function stepSimulation(input: SimulationSnapshot): SimulationSnapshot {
  const snapshot = cloneSnapshot(input)
  const updated = new Uint8Array(snapshot.materials.length)

  for (let y = snapshot.height - 1; y >= 0; y -= 1) {
    const direction = pickSign(snapshot.seed, y, snapshot.tick, 5, 0)
    const startX = direction === 1 ? 0 : snapshot.width - 1
    for (let offset = 0; offset < snapshot.width; offset += 1) {
      const x = startX + (offset * direction)
      const index = indexFor(snapshot, x, y)
      if (updated[index]) {
        continue
      }

      const material = snapshot.materials[index]
      if (material === MATERIALS.SAND) {
        processSand(snapshot, updated, x, y)
      } else if (material === MATERIALS.WATER) {
        processWater(snapshot, updated, x, y)
      }
    }
  }

  for (let y = 0; y < snapshot.height; y += 1) {
    const direction = pickSign(snapshot.seed, y, snapshot.tick, 6, 0)
    const startX = direction === 1 ? 0 : snapshot.width - 1
    for (let offset = 0; offset < snapshot.width; offset += 1) {
      const x = startX + (offset * direction)
      const index = indexFor(snapshot, x, y)
      if (updated[index]) {
        continue
      }

      const material = snapshot.materials[index]
      if (material === MATERIALS.SMOKE) {
        processSmoke(snapshot, updated, x, y)
      } else if (material === MATERIALS.EMBER) {
        processEmber(snapshot, updated, x, y)
      }
    }
  }

  for (let y = 0; y < snapshot.height; y += 1) {
    for (let x = 0; x < snapshot.width; x += 1) {
      const index = indexFor(snapshot, x, y)
      const material = snapshot.materials[index]

      switch (material) {
        case MATERIALS.SAND:
          snapshot.charge[index] = Math.max(0, snapshot.charge[index] - 1)
          if (
            hasNeighborMaterial(snapshot, x, y, MATERIALS.EMBER) &&
            random01(snapshot.seed, x, y, snapshot.tick, 7) < 0.008
          ) {
            snapshot.materials[index] = MATERIALS.EMBER
            snapshot.charge[index] = 168
          }
          break

        case MATERIALS.WATER:
          snapshot.charge[index] = Math.max(140, snapshot.charge[index] - 1)
          if (
            hasNeighborMaterial(snapshot, x, y, MATERIALS.EMBER) &&
            random01(snapshot.seed, x, y, snapshot.tick, 8) < 0.12
          ) {
            snapshot.charge[index] = 116
          }
          break

        case MATERIALS.EMBER: {
          if (hasNeighborMaterial(snapshot, x, y, MATERIALS.WATER)) {
            snapshot.materials[index] = MATERIALS.SMOKE
            snapshot.charge[index] = 104
            break
          }

          const cooledCharge = Math.max(0, snapshot.charge[index] - 2 - (random01(snapshot.seed, x, y, snapshot.tick, 9) > 0.5 ? 1 : 0))
          snapshot.charge[index] = cooledCharge
          if (cooledCharge <= 14) {
            snapshot.materials[index] = MATERIALS.SMOKE
            snapshot.charge[index] = 82
            break
          }

          if (y > 0) {
            const aboveIndex = indexFor(snapshot, x, y - 1)
            if (
              snapshot.materials[aboveIndex] === MATERIALS.EMPTY &&
              random01(snapshot.seed, x, y, snapshot.tick, 10) < Math.min(0.24, cooledCharge / 850)
            ) {
              snapshot.materials[aboveIndex] = MATERIALS.SMOKE
              snapshot.charge[aboveIndex] = 92
            }
          }
          break
        }

        case MATERIALS.SMOKE: {
          const nextCharge = snapshot.charge[index] > 3 ? snapshot.charge[index] - 3 : 0
          snapshot.charge[index] = nextCharge
          if (nextCharge === 0 || y === 0) {
            snapshot.materials[index] = MATERIALS.EMPTY
            snapshot.charge[index] = 0
          }
          break
        }

        case MATERIALS.STONE:
          snapshot.charge[index] = Math.max(0, snapshot.charge[index] - 1)
          break

        default:
          break
      }
    }
  }

  snapshot.tick = input.tick + 1
  return snapshot
}
