import { hydrateSnapshot, serializeSnapshot } from '@/sim/scene'
import type { BrushEvent, SimulationMetrics, SimulationSnapshot, WorkerRequest, WorkerResponse } from '@/sim/types'

export interface FramePayload {
  snapshot: SimulationSnapshot
  metrics: SimulationMetrics
  requestId?: number
}

export interface SimulationController {
  loadScene: (snapshot: SimulationSnapshot) => void
  setPaused: (paused: boolean) => void
  applyBrush: (brush: BrushEvent) => void
  requestFrame: () => void
  stepBurst: (frames: number) => Promise<FramePayload>
  subscribeFrame: (listener: (payload: FramePayload) => void) => () => void
  getLatestPayload: () => FramePayload | null
  destroy: () => void
}

export function createSimulationController(): SimulationController {
  const worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), { type: 'module' })
  const listeners = new Set<(payload: FramePayload) => void>()
  const pending = new Map<number, (payload: FramePayload) => void>()
  let requestId = 0
  let latestPayload: FramePayload | null = null

  worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const message = event.data
    if (message.type !== 'frame') {
      return
    }

    const payload: FramePayload = {
      snapshot: hydrateSnapshot(message.snapshot),
      metrics: message.metrics,
      requestId: message.requestId,
    }

    latestPayload = payload
    listeners.forEach((listener) => listener(payload))

    if (message.requestId !== undefined) {
      const resolve = pending.get(message.requestId)
      if (resolve) {
        resolve(payload)
        pending.delete(message.requestId)
      }
    }
  })

  function post(message: WorkerRequest, transfer: Transferable[] = []): void {
    worker.postMessage(message, transfer)
  }

  return {
    loadScene(snapshot) {
      const serialized = serializeSnapshot(snapshot)
      post({ type: 'load-scene', snapshot: serialized }, [serialized.materials, serialized.charge])
    },
    setPaused(paused) {
      post({ type: 'set-paused', paused })
    },
    applyBrush(brush) {
      post({ type: 'apply-brush', brush })
    },
    requestFrame() {
      post({ type: 'request-frame' })
    },
    stepBurst(frames) {
      return new Promise((resolve) => {
        requestId += 1
        pending.set(requestId, resolve)
        post({ type: 'step-burst', frames, requestId })
      })
    },
    subscribeFrame(listener) {
      listeners.add(listener)
      if (latestPayload) {
        listener(latestPayload)
      }
      return () => listeners.delete(listener)
    },
    getLatestPayload() {
      return latestPayload
    },
    destroy() {
      pending.clear()
      listeners.clear()
      worker.terminate()
    },
  }
}
