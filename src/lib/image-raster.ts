import { GRID_SIZE } from '@/sim/types'

interface LoadedDrawable {
  drawable: CanvasImageSource
  width: number
  height: number
  dispose: () => void
}

async function loadDrawableFromBlob(blob: Blob): Promise<LoadedDrawable> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(blob)
      return {
        drawable: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      }
    } catch {
      // Fall through to HTMLImageElement.
    }
  }

  const objectUrl = URL.createObjectURL(blob)
  const image = new Image()
  image.decoding = 'async'
  image.src = objectUrl
  await image.decode()

  return {
    drawable: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => URL.revokeObjectURL(objectUrl),
  }
}

function rasterizeDrawable(drawable: LoadedDrawable, size: number): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('PixelMelt could not create a rasterization context.')
  }

  context.clearRect(0, 0, size, size)
  context.imageSmoothingEnabled = true

  const scale = Math.min(size / drawable.width, size / drawable.height)
  const drawWidth = drawable.width * scale
  const drawHeight = drawable.height * scale
  const drawX = (size - drawWidth) / 2
  const drawY = (size - drawHeight) / 2

  context.drawImage(drawable.drawable, drawX, drawY, drawWidth, drawHeight)
  return context.getImageData(0, 0, size, size)
}

export async function rasterizeFileToImageData(file: File, size = GRID_SIZE): Promise<ImageData> {
  const drawable = await loadDrawableFromBlob(file)
  try {
    return rasterizeDrawable(drawable, size)
  } finally {
    drawable.dispose()
  }
}

export async function rasterizeUrlToImageData(url: string, size = GRID_SIZE): Promise<ImageData> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`PixelMelt could not load ${url}.`)
  }

  const blob = await response.blob()
  const drawable = await loadDrawableFromBlob(blob)
  try {
    return rasterizeDrawable(drawable, size)
  } finally {
    drawable.dispose()
  }
}
