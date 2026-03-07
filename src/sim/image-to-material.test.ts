import { describe, expect, it } from 'vitest'
import { convertImageDataToSnapshot } from '@/sim/image-to-material'
import { MATERIALS } from '@/sim/types'

function makeImageData(width: number, height: number, pixels: number[]): { width: number; height: number; data: Uint8ClampedArray } {
  return {
    width,
    height,
    data: new Uint8ClampedArray(pixels),
  }
}

describe('convertImageDataToSnapshot', () => {
  it('maps color families into the expected material buckets', () => {
    const imageData = makeImageData(4, 1, [
      90, 170, 255, 255,
      255, 136, 66, 255,
      220, 220, 220, 255,
      150, 145, 118, 255,
    ])

    const snapshot = convertImageDataToSnapshot(imageData)

    expect(Array.from(snapshot.materials)).toEqual([
      MATERIALS.WATER,
      MATERIALS.EMBER,
      MATERIALS.STONE,
      MATERIALS.SAND,
    ])
  })

  it('clears background-colored pixels while preserving the subject', () => {
    const background = [0, 0, 0, 255]
    const ember = [255, 110, 40, 255]
    const imageData = makeImageData(5, 5, [
      ...background, ...background, ...background, ...background, ...background,
      ...background, ...background, ...ember, ...background, ...background,
      ...background, ...ember, ...ember, ...ember, ...background,
      ...background, ...background, ...ember, ...background, ...background,
      ...background, ...background, ...background, ...background, ...background,
    ])

    const snapshot = convertImageDataToSnapshot(imageData)

    expect(snapshot.materials[12]).toBe(MATERIALS.EMBER)
    expect(Array.from(snapshot.materials).filter((material) => material !== MATERIALS.EMPTY)).toHaveLength(5)
  })

  it('treats transparent pixels as empty cells', () => {
    const imageData = makeImageData(2, 2, [
      255, 120, 60, 0, 255, 120, 60, 255,
      90, 170, 255, 255, 180, 180, 180, 255,
    ])

    const snapshot = convertImageDataToSnapshot(imageData)

    expect(snapshot.materials[0]).toBe(MATERIALS.EMPTY)
    expect(snapshot.materials[1]).toBe(MATERIALS.EMBER)
    expect(snapshot.materials[2]).toBe(MATERIALS.WATER)
    expect(snapshot.materials[3]).toBe(MATERIALS.STONE)
  })
})
