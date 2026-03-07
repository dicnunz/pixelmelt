import { MATERIALS, type MaterialId, type PresetId, type ToolId } from '@/sim/types'

interface MaterialInfo {
  id: MaterialId
  label: string
  hint: string
  swatch: string
}

export const MATERIAL_INFO: Record<Exclude<MaterialId, 0>, MaterialInfo> = {
  [MATERIALS.SAND]: {
    id: MATERIALS.SAND,
    label: 'Sand',
    hint: 'Heavy grains that slump and pile.',
    swatch: '#d7bb7d',
  },
  [MATERIALS.WATER]: {
    id: MATERIALS.WATER,
    label: 'Water',
    hint: 'Fast liquid that floods cavities.',
    swatch: '#5faeff',
  },
  [MATERIALS.STONE]: {
    id: MATERIALS.STONE,
    label: 'Stone',
    hint: 'Static support that anchors the scene.',
    swatch: '#8892a9',
  },
  [MATERIALS.EMBER]: {
    id: MATERIALS.EMBER,
    label: 'Ember',
    hint: 'Hot sparks that shed smoke and heat.',
    swatch: '#ff8e42',
  },
  [MATERIALS.SMOKE]: {
    id: MATERIALS.SMOKE,
    label: 'Smoke',
    hint: 'Light plumes that drift upward and fade.',
    swatch: '#c0cada',
  },
}

export const PRESET_OPTIONS: Array<{ id: PresetId; label: string; hint: string }> = [
  { id: 'melt', label: 'Melt', hint: 'Collapse the silhouette into hot sand and glowing drips.' },
  { id: 'flood', label: 'Flood', hint: 'Drive a wave through the composition and fill pockets.' },
  { id: 'burn', label: 'Burn', hint: 'Ignite the outline with ember seams and rising smoke.' },
]

export const TOOL_OPTIONS: Array<{ id: ToolId; label: string; hint: string }> = [
  { id: 'push', label: 'Push', hint: 'Drag material with directional force.' },
  { id: 'spark', label: 'Spark', hint: 'Inject hot ember bursts into the scene.' },
  { id: 'erase', label: 'Erase', hint: 'Clear cells to carve or vent the sim.' },
]
