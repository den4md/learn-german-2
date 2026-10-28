import type { PronunciationRates } from '../domain/preferences'

export interface SpeechPlayback {
  readonly available: boolean
  subscribe(listener: () => void): () => void
  speak(text: string, rate: number, started: () => void, finished: () => void): void
  cancel(): void
}

export class Pronunciation {
  private lastText = ''
  private nextIsSlow = false
  private request = 0
  private readonly speech: SpeechPlayback
  private readonly onPlaying: (text: string | undefined) => void

  constructor(speech: SpeechPlayback, onPlaying: (text: string | undefined) => void) {
    this.speech = speech
    this.onPlaying = onPlaying
  }

  play(text: string, rates: PronunciationRates): void {
    text = text.trim().replace(/\s+/g, ' ')
    if (!text || !this.speech.available) return
    if (text !== this.lastText) {
      this.lastText = text
      this.nextIsSlow = false
    }
    this.stop()
    const request = this.request
    const isSlow = this.nextIsSlow
    this.speech.speak(text, isSlow ? rates.slow : rates.normal, () => {
      if (request !== this.request) return
      this.nextIsSlow = !isSlow
      this.onPlaying(text)
    }, () => {
      if (request === this.request) this.onPlaying(undefined)
    })
  }

  stop(): void {
    this.request += 1
    this.speech.cancel()
    this.onPlaying(undefined)
  }

  reset(): void {
    this.stop()
    this.lastText = ''
    this.nextIsSlow = false
  }
}
