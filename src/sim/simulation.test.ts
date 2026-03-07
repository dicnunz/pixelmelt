import { describe, expect, it } from 'vitest'
import { stepSimulation } from '@/sim/simulation'
import { applyBrush } from '@/sim/tools'
import { createEmptySnapshot, setCell } from '@/sim/scene'
import { MATERIALS } from '@/sim/types'

describe('stepSimulation', () => {
  it('drops sand straight down into empty space', () => {
    const snapshot = createEmptySnapshot(5, 5, 7)
    setCell(snapshot, 2, 1, MATERIALS.SAND, 40)

    const next = stepSimulation(snapshot)

    expect(next.materials[2 + (2 * next.width)]).toBe(MATERIALS.SAND)
    expect(next.materials[2 + next.width]).toBe(MATERIALS.EMPTY)
  })

  it('lets water find a path around an obstacle', () => {
    const snapshot = createEmptySnapshot(5, 5, 7)
    setCell(snapshot, 2, 1, MATERIALS.WATER, 192)
    setCell(snapshot, 2, 2, MATERIALS.STONE, 20)

    const next = stepSimulation(snapshot)
    const waterPositions = Array.from(next.materials.entries()).filter(([, material]) => material === MATERIALS.WATER)

    expect(waterPositions).toHaveLength(1)
    expect(waterPositions[0]?.[0]).not.toBe(2 + next.width)
    expect(waterPositions[0]?.[0]).not.toBe(2 + (2 * next.width))
  })

  it('turns trapped ember into smoke when touching water', () => {
    const snapshot = createEmptySnapshot(5, 5, 11)
    setCell(snapshot, 2, 2, MATERIALS.EMBER, 220)
    setCell(snapshot, 1, 2, MATERIALS.WATER, 180)
    setCell(snapshot, 1, 1, MATERIALS.STONE, 30)
    setCell(snapshot, 1, 3, MATERIALS.STONE, 30)
    setCell(snapshot, 0, 2, MATERIALS.STONE, 30)
    setCell(snapshot, 0, 3, MATERIALS.STONE, 30)
    setCell(snapshot, 2, 1, MATERIALS.STONE, 30)
    setCell(snapshot, 3, 1, MATERIALS.STONE, 30)
    setCell(snapshot, 3, 2, MATERIALS.STONE, 30)
    setCell(snapshot, 2, 3, MATERIALS.STONE, 30)
    setCell(snapshot, 3, 3, MATERIALS.STONE, 30)

    const next = stepSimulation(snapshot)

    expect(next.materials[2 + (2 * next.width)]).toBe(MATERIALS.SMOKE)
  })

  it('dissipates smoke after repeated updates', () => {
    let snapshot = createEmptySnapshot(4, 4, 9)
    setCell(snapshot, 2, 2, MATERIALS.SMOKE, 6)

    for (let index = 0; index < 5; index += 1) {
      snapshot = stepSimulation(snapshot)
    }

    expect(Array.from(snapshot.materials).includes(MATERIALS.SMOKE)).toBe(false)
  })
})

describe('applyBrush', () => {
  it('pushes loose material in the drag direction', () => {
    const snapshot = createEmptySnapshot(6, 4, 4)
    setCell(snapshot, 2, 1, MATERIALS.SAND, 36)

    const pushed = applyBrush(snapshot, {
      tool: 'push',
      x: 2,
      y: 1,
      dx: 1,
      dy: 0,
      radius: 2,
      intensity: 0.8,
    })

    const pushedIndex = Array.from(pushed.materials.entries()).find(([, material]) => material === MATERIALS.SAND)?.[0]

    expect(pushedIndex).toBeDefined()
    expect((pushedIndex ?? 0) % pushed.width).toBeGreaterThan(2)
  })
})
