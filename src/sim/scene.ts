import { MATERIALS, type MaterialId, type SimulationMetrics, type SimulationSnapshot, type TransferableSnapshot } from '@/sim/types'

export function createEmptySnapshot(width: number, height: number, seed = 1): SimulationSnapshot {
  return {
    width,
    height,
    materials: new Uint8Array(width * height),
    charge: new Uint8Array(width * height),
    tick: 0,
    seed: seed >>> 0 || 1,
  }
}

export function cloneSnapshot(snapshot: SimulationSnapshot): SimulationSnapshot {
  return {
    width: snapshot.width,
    height: snapshot.height,
    materials: snapshot.materials.slice(),
    charge: snapshot.charge.slice(),
    tick: snapshot.tick,
    seed: snapshot.seed,
  }
}

export function indexFor(snapshot: Pick<SimulationSnapshot, 'width'>, x: number, y: number): number {
  return (y * snapshot.width) + x
}

export function inBounds(snapshot: Pick<SimulationSnapshot, 'width' | 'height'>, x: number, y: number): boolean {
  return x >= 0 && x < snapshot.width && y >= 0 && y < snapshot.height
}

export function setCell(
  snapshot: SimulationSnapshot,
  x: number,
  y: number,
  material: MaterialId,
  charge = 0,
): void {
  const index = indexFor(snapshot, x, y)
  snapshot.materials[index] = material
  snapshot.charge[index] = charge
}

export function countExposedNeighbors(snapshot: SimulationSnapshot, x: number, y: number): number {
  let exposure = 0
  const offsets = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]
  for (const [offsetX, offsetY] of offsets) {
    const nextX = x + offsetX
    const nextY = y + offsetY
    if (!inBounds(snapshot, nextX, nextY)) {
      exposure += 1
      continue
    }
    const material = snapshot.materials[indexFor(snapshot, nextX, nextY)]
    if (material === MATERIALS.EMPTY || material === MATERIALS.SMOKE) {
      exposure += 1
    }
  }
  return exposure
}

export function hasNeighborMaterial(
  snapshot: SimulationSnapshot,
  x: number,
  y: number,
  material: MaterialId,
): boolean {
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue
      }
      const nextX = x + offsetX
      const nextY = y + offsetY
      if (!inBounds(snapshot, nextX, nextY)) {
        continue
      }
      if (snapshot.materials[indexFor(snapshot, nextX, nextY)] === material) {
        return true
      }
    }
  }
  return false
}

export function summarizeSnapshot(snapshot: SimulationSnapshot): SimulationMetrics {
  let sandCells = 0
  let waterCells = 0
  let stoneCells = 0
  let emberCells = 0
  let smokeCells = 0

  for (const material of snapshot.materials) {
    switch (material) {
      case MATERIALS.SAND:
        sandCells += 1
        break
      case MATERIALS.WATER:
        waterCells += 1
        break
      case MATERIALS.STONE:
        stoneCells += 1
        break
      case MATERIALS.EMBER:
        emberCells += 1
        break
      case MATERIALS.SMOKE:
        smokeCells += 1
        break
      default:
        break
    }
  }

  return {
    activeCells: sandCells + waterCells + stoneCells + emberCells + smokeCells,
    sandCells,
    waterCells,
    stoneCells,
    emberCells,
    smokeCells,
    tick: snapshot.tick,
  }
}

export function serializeSnapshot(snapshot: SimulationSnapshot): TransferableSnapshot {
  const materials = snapshot.materials.slice()
  const charge = snapshot.charge.slice()
  return {
    width: snapshot.width,
    height: snapshot.height,
    materials: materials.buffer,
    charge: charge.buffer,
    tick: snapshot.tick,
    seed: snapshot.seed,
  }
}

export function hydrateSnapshot(snapshot: TransferableSnapshot): SimulationSnapshot {
  return {
    width: snapshot.width,
    height: snapshot.height,
    materials: new Uint8Array(snapshot.materials),
    charge: new Uint8Array(snapshot.charge),
    tick: snapshot.tick,
    seed: snapshot.seed,
  }
}
