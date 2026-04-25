import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CanvasStage, type CanvasStageHandle } from '@/components/CanvasStage'
import { ControlPanel } from '@/components/ControlPanel'
import { rasterizeFileToImageData, rasterizeUrlToImageData } from '@/lib/image-raster'
import { createSimulationController, type SimulationController } from '@/lib/simulation-controller'
import { convertImageDataToSnapshot } from '@/sim/image-to-material'
import { buildPresetScene } from '@/sim/presets'
import { GRID_SIZE, SIMULATION_FPS, type DemoScene, type PresetId, type SimulationSnapshot } from '@/sim/types'
import { usePixelMeltStore } from '@/store/use-pixelmelt-store'

const DEMOS: DemoScene[] = [
  {
    id: 'astral-sigil',
    name: 'Astral Sigil',
    description: 'Generated glass-and-stone mask tuned for sharp silhouettes, hot edges, and dramatic burn passes.',
    src: '/demo/astral-sigil.png',
  },
  {
    id: 'molten-echo',
    name: 'Molten Echo',
    description: 'A warm mask built for dramatic melt drips and ember seams.',
    src: '/demo/molten-echo.svg',
  },
  {
    id: 'tidal-idol',
    name: 'Tidal Idol',
    description: 'Stone-and-water sculpture with clear channels for the flood preset.',
    src: '/demo/tidal-idol.svg',
  },
  {
    id: 'ember-bloom',
    name: 'Ember Bloom',
    description: 'Layered petals and embers that break apart into smoke-rich burn passes.',
    src: '/demo/ember-bloom.svg',
  },
]

function buildSceneFromBase(
  controller: SimulationController | null,
  baseSnapshot: SimulationSnapshot | null,
  preset: PresetId,
  paused: boolean,
): void {
  if (!controller || !baseSnapshot) {
    return
  }

  controller.loadScene(buildPresetScene(baseSnapshot, preset))
  controller.setPaused(paused)
  controller.requestFrame()
}

export default function App() {
  const stageRef = useRef<CanvasStageHandle>(null)
  const controllerRef = useRef<SimulationController | null>(null)
  const baseSnapshotRef = useRef<SimulationSnapshot | null>(null)
  const [controller, setController] = useState<SimulationController | null>(null)
  const [hasLoadedDefaultDemo, setHasLoadedDefaultDemo] = useState(false)

  const activePreset = usePixelMeltStore((state) => state.activePreset)
  const activeTool = usePixelMeltStore((state) => state.activeTool)
  const brushSize = usePixelMeltStore((state) => state.brushSize)
  const brushIntensity = usePixelMeltStore((state) => state.brushIntensity)
  const paused = usePixelMeltStore((state) => state.paused)
  const sourceLabel = usePixelMeltStore((state) => state.sourceLabel)
  const selectedDemoId = usePixelMeltStore((state) => state.selectedDemoId)
  const sceneStatus = usePixelMeltStore((state) => state.sceneStatus)
  const lastError = usePixelMeltStore((state) => state.lastError)
  const recording = usePixelMeltStore((state) => state.recording)

  const setActivePreset = usePixelMeltStore((state) => state.setActivePreset)
  const setActiveTool = usePixelMeltStore((state) => state.setActiveTool)
  const setBrushSize = usePixelMeltStore((state) => state.setBrushSize)
  const setBrushIntensity = usePixelMeltStore((state) => state.setBrushIntensity)
  const setPaused = usePixelMeltStore((state) => state.setPaused)
  const setSourceLabel = usePixelMeltStore((state) => state.setSourceLabel)
  const setSelectedDemoId = usePixelMeltStore((state) => state.setSelectedDemoId)
  const setSceneStatus = usePixelMeltStore((state) => state.setSceneStatus)
  const setLastError = usePixelMeltStore((state) => state.setLastError)

  useEffect(() => {
    const nextController = createSimulationController()
    controllerRef.current = nextController
    setController(nextController)

    return () => {
      nextController.destroy()
      controllerRef.current = null
    }
  }, [])

  const loadImageData = useCallback(async (imageData: ImageData, label: string, demoId: string): Promise<void> => {
    setSceneStatus('loading')
    setLastError(null)

    try {
      const baseSnapshot = convertImageDataToSnapshot(imageData)
      baseSnapshotRef.current = baseSnapshot

      startTransition(() => {
        setSourceLabel(label)
        setSelectedDemoId(demoId)
        setSceneStatus('ready')
      })

      buildSceneFromBase(controllerRef.current, baseSnapshot, usePixelMeltStore.getState().activePreset, usePixelMeltStore.getState().paused)
    } catch (error) {
      baseSnapshotRef.current = null
      startTransition(() => {
        setSceneStatus('error')
        setLastError(error instanceof Error ? error.message : 'PixelMelt could not convert this image.')
      })
    }
  }, [setLastError, setSceneStatus, setSelectedDemoId, setSourceLabel])

  const handleDemoLoad = useCallback(async (demoId: string): Promise<void> => {
    const demo = DEMOS.find((entry) => entry.id === demoId) ?? DEMOS[0]
    const imageData = await rasterizeUrlToImageData(demo.src, GRID_SIZE)
    await loadImageData(imageData, demo.name, demo.id)
  }, [loadImageData])

  const handleUpload = useCallback(async (file: File): Promise<void> => {
    try {
      const imageData = await rasterizeFileToImageData(file, GRID_SIZE)
      await loadImageData(imageData, file.name.replace(/\.[^.]+$/, ''), '')
    } catch (error) {
      setSceneStatus('error')
      setLastError(error instanceof Error ? error.message : 'PixelMelt could not read that upload.')
    }
  }, [loadImageData, setLastError, setSceneStatus])

  useEffect(() => {
    if (!controller || hasLoadedDefaultDemo) {
      return
    }

    void (async () => {
      await handleDemoLoad(selectedDemoId || DEMOS[0].id)
      setHasLoadedDefaultDemo(true)
    })()
  }, [controller, handleDemoLoad, hasLoadedDefaultDemo, selectedDemoId])

  useEffect(() => {
    if (!controller) {
      return
    }
    controller.setPaused(paused)
    controller.requestFrame()
  }, [controller, paused])

  useEffect(() => {
    if (!controller) {
      return undefined
    }

    window.render_game_to_text = () => {
      const latest = controller.getLatestPayload()
      return JSON.stringify({
        source: usePixelMeltStore.getState().sourceLabel,
        sceneStatus: usePixelMeltStore.getState().sceneStatus,
        preset: usePixelMeltStore.getState().activePreset,
        tool: usePixelMeltStore.getState().activeTool,
        paused: usePixelMeltStore.getState().paused,
        recording: usePixelMeltStore.getState().recording.status,
        activeCells: latest?.metrics.activeCells ?? 0,
        waterCells: latest?.metrics.waterCells ?? 0,
        emberCells: latest?.metrics.emberCells ?? 0,
        smokeCells: latest?.metrics.smokeCells ?? 0,
        tick: latest?.metrics.tick ?? 0,
      })
    }

    window.advanceTime = async (ms: number) => {
      const frames = Math.max(1, Math.round(ms / (1000 / SIMULATION_FPS)))
      const previouslyPaused = usePixelMeltStore.getState().paused

      if (!previouslyPaused) {
        controller.setPaused(true)
        usePixelMeltStore.getState().setPaused(true)
      }

      await controller.stepBurst(frames)

      if (!previouslyPaused) {
        controller.setPaused(false)
        usePixelMeltStore.getState().setPaused(false)
      }
    }

    return () => {
      delete window.render_game_to_text
      delete window.advanceTime
    }
  }, [controller])

  const demoMap = useMemo(() => new Map(DEMOS.map((demo) => [demo.id, demo])), [])

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col gap-6 px-4 py-4 xl:flex-row xl:px-6 xl:py-6">
        <div className="xl:w-[372px] xl:shrink-0">
          <ControlPanel
            demos={DEMOS}
            selectedDemoId={selectedDemoId}
            sourceLabel={sourceLabel}
            sceneStatus={sceneStatus}
            lastError={lastError}
            activePreset={activePreset}
            activeTool={activeTool}
            brushSize={brushSize}
            brushIntensity={brushIntensity}
            paused={paused}
            recording={recording}
            onSelectDemo={(demoId) => {
              const demo = demoMap.get(demoId)
              if (!demo) {
                return
              }
              void handleDemoLoad(demo.id)
            }}
            onUpload={(file) => {
              void handleUpload(file)
            }}
            onPresetChange={(preset) => {
              setActivePreset(preset)
              buildSceneFromBase(controllerRef.current, baseSnapshotRef.current, preset, usePixelMeltStore.getState().paused)
            }}
            onToolChange={setActiveTool}
            onBrushSizeChange={setBrushSize}
            onBrushIntensityChange={setBrushIntensity}
            onPauseToggle={() => setPaused(!paused)}
            onReset={() => {
              buildSceneFromBase(controllerRef.current, baseSnapshotRef.current, activePreset, paused)
            }}
            onRecord={() => {
              void stageRef.current?.recordClip()
            }}
          />
        </div>

        <CanvasStage
          ref={stageRef}
          controller={controller}
          activeTool={activeTool}
          activePreset={activePreset}
          brushSize={brushSize}
          brushIntensity={brushIntensity}
          sourceLabel={sourceLabel}
          paused={paused}
          sceneStatus={sceneStatus}
        />
      </div>
    </div>
  )
}
