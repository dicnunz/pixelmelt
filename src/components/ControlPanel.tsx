import { useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { MATERIAL_INFO, PRESET_OPTIONS, TOOL_OPTIONS } from '@/sim/materials'
import type { DemoScene, PresetId, ToolId } from '@/sim/types'
import type { RecordingState, SceneStatus } from '@/store/use-pixelmelt-store'

interface ControlPanelProps {
  demos: DemoScene[]
  selectedDemoId: string
  sourceLabel: string
  sceneStatus: SceneStatus
  lastError: string | null
  activePreset: PresetId
  activeTool: ToolId
  brushSize: number
  brushIntensity: number
  paused: boolean
  recording: RecordingState
  onSelectDemo: (demoId: string) => void
  onUpload: (file: File) => void
  onPresetChange: (preset: PresetId) => void
  onToolChange: (tool: ToolId) => void
  onBrushSizeChange: (size: number) => void
  onBrushIntensityChange: (intensity: number) => void
  onPauseToggle: () => void
  onReset: () => void
  onRecord: () => void
}

export function ControlPanel({
  demos,
  selectedDemoId,
  sourceLabel,
  sceneStatus,
  lastError,
  activePreset,
  activeTool,
  brushSize,
  brushIntensity,
  paused,
  recording,
  onSelectDemo,
  onUpload,
  onPresetChange,
  onToolChange,
  onBrushSizeChange,
  onBrushIntensityChange,
  onPauseToggle,
  onReset,
  onRecord,
}: ControlPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const activeDemo = demos.find((demo) => demo.id === selectedDemoId) ?? null
  const usingCustomSource = activeDemo === null

  const recordLabel =
    recording.status === 'recording'
      ? `Recording ${Math.max(0, recording.remainingMs / 1000).toFixed(1)}s`
      : recording.status === 'saving'
        ? 'Saving clip…'
        : 'Record 8s clip'

  const interactionDisabled = sceneStatus === 'booting' || sceneStatus === 'loading'
  const runControlsDisabled = sceneStatus !== 'ready'
  const recordDisabled = runControlsDisabled || recording.status === 'recording' || recording.status === 'saving'

  return (
    <aside className="pm-panel pm-scrollbar flex h-full min-h-[calc(100vh-3rem)] flex-col overflow-y-auto rounded-[28px] p-6 text-sm text-white/90">
      <div className="mb-7">
        <div className="mb-2 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-white/45">
          <span className="h-2 w-2 rounded-full bg-[var(--pm-accent)] shadow-[0_0_16px_rgba(109,226,196,0.8)]" />
          PixelMelt
        </div>
        <h1 className="max-w-[12ch] text-4xl font-semibold tracking-[-0.05em] text-white">
          Turn still images into controlled chaos.
        </h1>
        <p className="mt-3 max-w-[32ch] leading-6 text-[var(--pm-text-muted)]">
          Local-only material sim for melting portraits, flooding silhouettes, and burning abstract shapes into shareable clips.
        </p>
      </div>

      <section className="mb-6 space-y-3 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Input</h2>
            <p className="text-xs text-[var(--pm-text-muted)]">Upload once, rebuild with presets, then sculpt and export from the same source.</p>
          </div>
          <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-white/55">
            {sceneStatus}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-white/60">
          {['pick source', 'rebuild preset', 'export clip'].map((step, index) => (
            <div key={step} className="rounded-[18px] border border-white/8 bg-black/10 px-3 py-2">
              <div className="font-mono text-[0.62rem] text-white/30">0{index + 1}</div>
              <div className="mt-1 leading-4">{step}</div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setIsDragging(false)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            const file = event.dataTransfer.files?.[0]
            if (file) {
              onUpload(file)
            }
          }}
          className={cn(
            'group w-full rounded-[24px] border border-dashed px-4 py-5 text-left transition',
            isDragging
              ? 'border-[var(--pm-accent)] bg-[rgba(109,226,196,0.08)]'
              : 'border-white/12 bg-[rgba(255,255,255,0.02)] hover:border-white/22 hover:bg-white/[0.04]',
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Drop an image or browse</div>
              <div className="mt-1 text-xs leading-5 text-[var(--pm-text-muted)]">
                PNG, JPG, or SVG. PixelMelt auto-rasterizes to a 168×168 material field.
              </div>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-2 font-mono text-[0.72rem] uppercase tracking-[0.22em] text-white/70">
              Upload
            </div>
          </div>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              onUpload(file)
            }
            event.currentTarget.value = ''
          }}
        />

        <div className="rounded-[22px] border border-white/8 bg-black/10 p-3">
          <div className="flex items-center justify-between text-[0.72rem] uppercase tracking-[0.2em] text-white/45">
            <span>Current source</span>
            <span className="font-mono">{usingCustomSource ? 'upload' : 'demo'}</span>
          </div>
          <div className="mt-2 text-sm font-semibold text-white">{sourceLabel}</div>
          <p className="mt-1 text-xs leading-5 text-[var(--pm-text-muted)]">
            {usingCustomSource
              ? 'Using your upload. Presets will keep rebuilding from this image until you swap the source.'
              : activeDemo.description}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-white/45">Seeded demos</span>
            <span className="font-mono text-[0.72rem] text-white/45">instant start</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {demos.map((demo) => (
              <button
                key={demo.id}
                type="button"
                onClick={() => onSelectDemo(demo.id)}
                className={cn(
                  'overflow-hidden rounded-[18px] border text-left transition',
                  demo.id === selectedDemoId
                    ? 'border-[var(--pm-accent)] bg-white/[0.05] shadow-[0_0_0_1px_rgba(109,226,196,0.22)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]',
                )}
              >
                <img src={demo.src} alt={demo.name} className="aspect-[4/5] w-full object-cover" />
                <div className="p-2">
                  <div className="text-[0.72rem] font-semibold text-white">{demo.name}</div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs leading-5 text-[var(--pm-text-muted)]">
            Faces, masks, logos, flowers, and bold silhouettes with clean negative space usually produce the strongest melts.
          </p>
        </div>

        {lastError && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
            {lastError}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-white">Presets</h2>
          <p className="text-xs text-[var(--pm-text-muted)]">Each preset rebuilds the scene from the source image.</p>
        </div>
        <div className="space-y-2">
          {PRESET_OPTIONS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={interactionDisabled}
              onClick={() => onPresetChange(preset.id)}
              className={cn(
                'w-full rounded-[20px] border px-4 py-3 text-left transition',
                preset.id === activePreset
                  ? 'border-white/0 bg-white text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.12)]'
                  : 'border-white/10 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.05]',
                interactionDisabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <div className="font-semibold">{preset.label}</div>
              <div className={cn('mt-1 text-xs leading-5', preset.id === activePreset ? 'text-slate-700' : 'text-[var(--pm-text-muted)]')}>
                {preset.hint}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-white">Tools</h2>
          <p className="text-xs text-[var(--pm-text-muted)]">Use the canvas directly. Drag to push, click to spark, brush to erase.</p>
        </div>

        <div className="space-y-2">
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onToolChange(tool.id)}
              className={cn(
                'w-full rounded-[18px] border px-4 py-3 text-left transition',
                tool.id === activeTool
                  ? 'border-[var(--pm-accent)] bg-[rgba(109,226,196,0.1)] text-white'
                  : 'border-white/10 bg-white/[0.02] text-white/85 hover:border-white/20 hover:bg-white/[0.05]',
              )}
            >
              <div className="font-semibold">{tool.label}</div>
              <div className="mt-1 text-xs leading-5 text-[var(--pm-text-muted)]">{tool.hint}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          <label className="block">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/45">
              <span>Brush size</span>
              <span className="font-mono text-white/65">{brushSize}px</span>
            </div>
            <input
              type="range"
              min={2}
              max={14}
              step={1}
              value={brushSize}
              onChange={(event) => onBrushSizeChange(Number(event.target.value))}
              className="w-full accent-[var(--pm-accent)]"
            />
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/45">
              <span>Force</span>
              <span className="font-mono text-white/65">{brushIntensity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.35}
              max={1}
              step={0.01}
              value={brushIntensity}
              onChange={(event) => onBrushIntensityChange(Number(event.target.value))}
              className="w-full accent-[var(--pm-warm)]"
            />
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-white">Run</h2>
          <p className="text-xs text-[var(--pm-text-muted)]">Pause to inspect, reset to re-seed, then export the exact stage you see as an 8-second WebM.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPauseToggle}
            disabled={runControlsDisabled}
            className={cn(
              'rounded-[18px] border border-white/12 bg-white/[0.05] px-4 py-3 font-semibold text-white transition',
              runControlsDisabled ? 'cursor-not-allowed opacity-50' : 'hover:border-white/22 hover:bg-white/[0.08]',
            )}
          >
            {paused ? 'Resume sim' : 'Pause sim'}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={runControlsDisabled}
            className={cn(
              'rounded-[18px] border border-white/12 bg-white/[0.05] px-4 py-3 font-semibold text-white transition',
              runControlsDisabled ? 'cursor-not-allowed opacity-50' : 'hover:border-white/22 hover:bg-white/[0.08]',
            )}
          >
            Reset scene
          </button>
          <button
            type="button"
            onClick={onRecord}
            disabled={recordDisabled}
            className={cn(
              'col-span-2 rounded-[18px] border px-4 py-3 font-semibold transition',
              recordDisabled
                ? recording.status === 'recording' || recording.status === 'saving'
                  ? 'cursor-progress border-amber-300/20 bg-amber-300/10 text-amber-100'
                  : 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/45'
                : 'border-[var(--pm-warm)] bg-[rgba(255,148,71,0.12)] text-white hover:bg-[rgba(255,148,71,0.2)]',
            )}
          >
            {recordLabel}
          </button>
        </div>
        {recording.message && (
          <p className="mt-3 text-xs leading-5 text-[var(--pm-text-muted)]">{recording.message}</p>
        )}
      </section>

      <section className="mt-auto rounded-3xl border border-white/8 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Materials</h2>
          <span className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-white/45">local-only</span>
        </div>
        <div className="space-y-2.5">
          {Object.values(MATERIAL_INFO).map((material) => (
            <div key={material.id} className="flex items-start gap-3">
              <span className="mt-1 h-3.5 w-3.5 rounded-full" style={{ backgroundColor: material.swatch }} />
              <div>
                <div className="font-semibold text-white">{material.label}</div>
                <div className="text-xs leading-5 text-[var(--pm-text-muted)]">{material.hint}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  )
}
