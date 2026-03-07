import { MATERIALS, type BrushEvent, type SimulationSnapshot } from '@/sim/types'
import { cloneSnapshot, inBounds, indexFor } from '@/sim/scene'
import { random01 } from '@/sim/random'

function brushCells(snapshot: SimulationSnapshot, centerX: number, centerY: number, radius: number) {
  const cells: Array<{ x: number; y: number; distance: number }> = []
  const radiusSquared = radius * radius

  for (let y = Math.max(0, centerY - radius); y <= Math.min(snapshot.height - 1, centerY + radius); y += 1) {
    for (let x = Math.max(0, centerX - radius); x <= Math.min(snapshot.width - 1, centerX + radius); x += 1) {
      const distanceSquared = ((x - centerX) ** 2) + ((y - centerY) ** 2)
      if (distanceSquared <= radiusSquared) {
        cells.push({ x, y, distance: Math.sqrt(distanceSquared) })
      }
    }
  }

  return cells
}

function pushDirection(deltaX: number, deltaY: number): [number, number] {
  const directionX = Math.abs(deltaX) > 0.25 ? Math.sign(deltaX) : 0
  const directionY = Math.abs(deltaY) > 0.25 ? Math.sign(deltaY) : 0
  if (directionX === 0 && directionY === 0) {
    return [0, 1]
  }
  return [directionX, directionY]
}

export function applyBrush(snapshot: SimulationSnapshot, brush: BrushEvent): SimulationSnapshot {
  const next = cloneSnapshot(snapshot)
  const cells = brushCells(next, brush.x, brush.y, Math.max(1, Math.round(brush.radius)))

  if (brush.tool === 'erase') {
    for (const cell of cells) {
      const index = indexFor(next, cell.x, cell.y)
      next.materials[index] = MATERIALS.EMPTY
      next.charge[index] = 0
    }
    return next
  }

  if (brush.tool === 'spark') {
    for (const cell of cells) {
      const index = indexFor(next, cell.x, cell.y)
      const falloff = 1 - (cell.distance / Math.max(1, brush.radius))
      if (random01(next.seed, cell.x, cell.y, next.tick, 6) > falloff * (0.7 + brush.intensity * 0.3)) {
        continue
      }

      if (next.materials[index] !== MATERIALS.WATER) {
        next.materials[index] = MATERIALS.EMBER
        next.charge[index] = 188 + Math.round(falloff * 67)
      }

      if (cell.y > 0) {
        const aboveIndex = indexFor(next, cell.x, cell.y - 1)
        if (next.materials[aboveIndex] === MATERIALS.EMPTY) {
          next.materials[aboveIndex] = MATERIALS.SMOKE
          next.charge[aboveIndex] = 112
        }
      }
    }
    return next
  }

  const [directionX, directionY] = pushDirection(brush.dx, brush.dy)
  const pushDistance = Math.max(1, Math.round((brush.intensity * 3) + Math.max(Math.abs(brush.dx), Math.abs(brush.dy))))

  cells.sort((left, right) => ((right.x * directionX) + (right.y * directionY)) - ((left.x * directionX) + (left.y * directionY)))

  for (const cell of cells) {
    let currentX = cell.x
    let currentY = cell.y
    let currentIndex = indexFor(next, currentX, currentY)
    const material = next.materials[currentIndex]

    if (material === MATERIALS.EMPTY || material === MATERIALS.STONE) {
      continue
    }

    for (let step = 0; step < pushDistance; step += 1) {
      const targetX = currentX + directionX
      const targetY = currentY + directionY
      if (!inBounds(next, targetX, targetY)) {
        break
      }

      const targetIndex = indexFor(next, targetX, targetY)
      const targetMaterial = next.materials[targetIndex]
      const canDisplace =
        targetMaterial === MATERIALS.EMPTY ||
        targetMaterial === MATERIALS.SMOKE ||
        (material === MATERIALS.SAND && targetMaterial === MATERIALS.WATER)

      if (!canDisplace) {
        break
      }

      const displacedMaterial = next.materials[targetIndex]
      const displacedCharge = next.charge[targetIndex]

      next.materials[targetIndex] = next.materials[currentIndex]
      next.charge[targetIndex] = next.charge[currentIndex]
      next.materials[currentIndex] = displacedMaterial === MATERIALS.EMPTY ? MATERIALS.EMPTY : displacedMaterial
      next.charge[currentIndex] = displacedMaterial === MATERIALS.EMPTY ? 0 : displacedCharge

      currentX = targetX
      currentY = targetY
      currentIndex = targetIndex
    }
  }

  return next
}
