import { MATERIALS, type MaterialId, type SimulationSnapshot } from '@/sim/types'
import { fnv1a } from '@/sim/random'
import { createEmptySnapshot, indexFor, summarizeSnapshot } from '@/sim/scene'

interface ImageDataLike {
  width: number
  height: number
  data: Uint8ClampedArray | Uint8Array
}

function luminance(red: number, green: number, blue: number): number {
  return ((red * 0.2126) + (green * 0.7152) + (blue * 0.0722)) / 255
}

function saturation(red: number, green: number, blue: number): number {
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  return maximum === 0 ? 0 : (maximum - minimum) / maximum
}

function colorDistance(red: number, green: number, blue: number, background: [number, number, number]): number {
  const deltaRed = red - background[0]
  const deltaGreen = green - background[1]
  const deltaBlue = blue - background[2]
  return Math.sqrt((deltaRed ** 2) + (deltaGreen ** 2) + (deltaBlue ** 2)) / 441.67295593
}

function sampleBackground(imageData: ImageDataLike): [number, number, number] {
  const samplePoints = [
    [0, 0],
    [imageData.width - 1, 0],
    [0, imageData.height - 1],
    [imageData.width - 1, imageData.height - 1],
    [Math.floor(imageData.width / 2), 0],
    [Math.floor(imageData.width / 2), imageData.height - 1],
  ]

  let totalRed = 0
  let totalGreen = 0
  let totalBlue = 0
  let totalWeight = 0

  for (const [x, y] of samplePoints) {
    const offset = ((y * imageData.width) + x) * 4
    const alpha = (imageData.data[offset + 3] ?? 0) / 255
    const weight = alpha > 0 ? alpha : 1
    totalRed += (imageData.data[offset] ?? 0) * weight
    totalGreen += (imageData.data[offset + 1] ?? 0) * weight
    totalBlue += (imageData.data[offset + 2] ?? 0) * weight
    totalWeight += weight
  }

  if (totalWeight === 0) {
    return [0, 0, 0]
  }

  return [
    Math.round(totalRed / totalWeight),
    Math.round(totalGreen / totalWeight),
    Math.round(totalBlue / totalWeight),
  ]
}

function defaultCharge(material: MaterialId, brightness: number): number {
  switch (material) {
    case MATERIALS.WATER:
      return 192
    case MATERIALS.EMBER:
      return 180 + Math.round(brightness * 64)
    case MATERIALS.STONE:
      return 18 + Math.round(brightness * 36)
    case MATERIALS.SAND:
      return 20 + Math.round(brightness * 52)
    case MATERIALS.SMOKE:
      return 112
    default:
      return 0
  }
}

function classifyMaterial(
  red: number,
  green: number,
  blue: number,
  brightness: number,
  chroma: number,
): MaterialId {
  const warmth = (red - blue + ((red - green) * 0.35)) / 255
  const coolness = (blue - red + ((blue - green) * 0.2)) / 255

  if (coolness > 0.12 && chroma > 0.16 && brightness > 0.16) {
    return MATERIALS.WATER
  }

  if (warmth > 0.18 && chroma > 0.2 && brightness > 0.15) {
    return MATERIALS.EMBER
  }

  if (brightness < 0.18 || brightness > 0.72 || chroma < 0.11) {
    return MATERIALS.STONE
  }

  return MATERIALS.SAND
}

function buildSnapshot(imageData: ImageDataLike, useBackgroundMask: boolean): SimulationSnapshot {
  const seed = fnv1a(imageData.data)
  const snapshot = createEmptySnapshot(imageData.width, imageData.height, seed)
  const background = sampleBackground(imageData)

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const pixelOffset = ((y * imageData.width) + x) * 4
      const alpha = imageData.data[pixelOffset + 3] ?? 0
      if (alpha < 24) {
        continue
      }

      const red = imageData.data[pixelOffset] ?? 0
      const green = imageData.data[pixelOffset + 1] ?? 0
      const blue = imageData.data[pixelOffset + 2] ?? 0

      const brightness = luminance(red, green, blue)
      const chroma = saturation(red, green, blue)
      const backdropDistance = colorDistance(red, green, blue, background)
      const alphaWeight = alpha / 255

      const shouldDiscard =
        useBackgroundMask &&
        ((backdropDistance < 0.06 && chroma < 0.22 && brightness < 0.58) ||
          (backdropDistance < 0.045 && chroma < 0.16) ||
          alphaWeight < 0.16)

      if (shouldDiscard) {
        continue
      }

      const material = classifyMaterial(red, green, blue, brightness, chroma)
      const index = indexFor(snapshot, x, y)
      snapshot.materials[index] = material
      snapshot.charge[index] = defaultCharge(material, brightness)
    }
  }

  return snapshot
}

function denoiseSnapshot(snapshot: SimulationSnapshot): SimulationSnapshot {
  const materials = snapshot.materials.slice()
  const charge = snapshot.charge.slice()
  const { width, height } = snapshot

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = indexFor(snapshot, x, y)
      const current = snapshot.materials[index]
      if (current === MATERIALS.EMPTY) {
        continue
      }

      let occupiedNeighbors = 0
      const counts = new Uint8Array(6)

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) {
            continue
          }
          const neighbor = snapshot.materials[indexFor(snapshot, x + offsetX, y + offsetY)]
          if (neighbor !== MATERIALS.EMPTY) {
            occupiedNeighbors += 1
            counts[neighbor] += 1
          }
        }
      }

      if (occupiedNeighbors <= 1) {
        materials[index] = MATERIALS.EMPTY
        charge[index] = 0
        continue
      }

      let dominant = current
      let dominantCount = 0
      for (let material = MATERIALS.SAND; material <= MATERIALS.SMOKE; material += 1) {
        if (counts[material] > dominantCount) {
          dominant = material
          dominantCount = counts[material]
        }
      }

      if (dominant !== current && dominantCount >= 4) {
        materials[index] = dominant
      }
    }
  }

  snapshot.materials = materials
  snapshot.charge = charge
  return snapshot
}

export function convertImageDataToSnapshot(imageData: ImageDataLike): SimulationSnapshot {
  let snapshot = buildSnapshot(imageData, true)

  if (summarizeSnapshot(snapshot).activeCells < Math.floor(imageData.width * imageData.height * 0.08)) {
    snapshot = buildSnapshot(imageData, false)
  }

  return denoiseSnapshot(snapshot)
}
