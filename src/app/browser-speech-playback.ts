import type { SpeechPlayback } from './pronunciation'

// TODO: Add a better pronunciation source if browser-provided German voices are unsatisfactory.
export class BrowserSpeechPlayback implements SpeechPlayback {
  private utterance: SpeechSynthesisUtterance | undefined
  private readonly synthesis: SpeechSynthesis | undefined
  private readonly createUtterance: (text: string) => SpeechSynthesisUtterance

  constructor(
    synthesis: SpeechSynthesis | undefined,
    createUtterance = (text: string) => new SpeechSynthesisUtterance(text),
  ) {
    this.synthesis = synthesis
    this.createUtterance = createUtterance
  }

  private get voice(): SpeechSynthesisVoice | undefined {
    const voices = this.synthesis?.getVoices() ?? []
    return voices.find((voice) => voice.lang.toLowerCase() === 'de-de' && voice.default)
      ?? voices.find((voice) => voice.lang.toLowerCase() === 'de-de')
      ?? voices.find((voice) => /^de(?:-|$)/i.test(voice.lang))
  }

  get available(): boolean {
    return this.voice !== undefined
  }

  subscribe(listener: () => void): () => void {
    this.synthesis?.addEventListener('voiceschanged', listener)
    return () => this.synthesis?.removeEventListener('voiceschanged', listener)
  }

  speak(text: string, rate: number, started: () => void, finished: () => void): void {
    const voice = this.voice
    if (voice === undefined || this.synthesis === undefined) return
    try {
      const utterance = this.createUtterance(text)
      this.utterance = utterance
      utterance.lang = voice.lang
      utterance.voice = voice
      utterance.rate = rate
      utterance.onstart = () => { if (this.utterance === utterance) started() }
      const finish = () => {
        if (this.utterance !== utterance) return
        this.utterance = undefined
        finished()
      }
      utterance.onend = finish
      utterance.onerror = (event) => {
        if (this.utterance !== utterance) return
        if (event.error !== 'canceled' && event.error !== 'interrupted') console.error('German pronunciation failed.', event.error)
        finish()
      }
      this.synthesis.speak(utterance)
    } catch (error) {
      this.utterance = undefined
      console.error('German pronunciation failed.', error)
      finished()
    }
  }

  cancel(): void {
    if (this.utterance === undefined) return
    this.utterance = undefined
    this.synthesis?.cancel()
  }
}
