/// <reference types="vite/client" />

interface Window {
  render_game_to_text?: () => string | null
  advanceTime?: (ms: number) => Promise<void>
}
