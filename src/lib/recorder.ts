import { RECORDING_DURATION_MS } from '@/sim/types'

function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? ''
}

export function supportsCanvasRecording(): boolean {
  return typeof MediaRecorder !== 'undefined'
}

export async function recordCanvasClip(
  canvas: HTMLCanvasElement,
  onProgress: (remainingMs: number) => void,
  durationMs = RECORDING_DURATION_MS,
): Promise<Blob> {
  if (!supportsCanvasRecording()) {
    throw new Error('This browser does not support WebM capture.')
  }

  const stream = canvas.captureStream(30)
  const mimeType = pickMimeType()
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
  const chunks: Blob[] = []
  const startedAt = performance.now()

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  })

  const intervalId = window.setInterval(() => {
    const elapsed = performance.now() - startedAt
    onProgress(Math.max(0, durationMs - elapsed))
  }, 120)

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.addEventListener('stop', () => {
      window.clearInterval(intervalId)
      stream.getTracks().forEach((track) => track.stop())
      resolve(new Blob(chunks, { type: mimeType || 'video/webm' }))
    })
    recorder.addEventListener('error', () => {
      window.clearInterval(intervalId)
      stream.getTracks().forEach((track) => track.stop())
      reject(new Error('MediaRecorder failed during capture.'))
    })
  })

  recorder.start(250)
  onProgress(durationMs)

  window.setTimeout(() => {
    if (recorder.state !== 'inactive') {
      recorder.stop()
    }
  }, durationMs)

  return finished
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
