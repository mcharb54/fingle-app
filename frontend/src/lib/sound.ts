// Tiny synthesized reveal sounds — no audio files. Off unless the player turns them on.
const KEY = 'fingle_sounds'

export function soundsEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

export function setSoundsEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, String(on))
  } catch {
    /* private mode */
  }
}

let ctx: AudioContext | null = null

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'triangle', gain = 0.18) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, ctx.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(ctx.currentTime + start)
  osc.stop(ctx.currentTime + start + dur + 0.02)
}

export function playReveal(kind: 'perfect' | 'score' | 'miss' | 'badge'): void {
  if (!soundsEnabled()) return
  try {
    ctx ??= new AudioContext()
    if (kind === 'perfect') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.28))
    else if (kind === 'score') [523, 784].forEach((f, i) => tone(f, i * 0.1, 0.25))
    else if (kind === 'badge') [880, 1175].forEach((f, i) => tone(f, i * 0.12, 0.35, 'sine', 0.15))
    else tone(196, 0, 0.35, 'sawtooth', 0.08)
  } catch {
    /* audio blocked */
  }
}
