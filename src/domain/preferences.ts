import { interfaceLanguages } from './constants'
import type { InterfaceLanguage } from './constants'

export type { InterfaceLanguage } from './constants'

export const sessionFinishDelays = [0, 2, 5, 10] as const
export type SessionFinishDelaySeconds = typeof sessionFinishDelays[number]
export const learningScoreThresholds = Array.from({ length: 20 }, (_, index) => index + 1)
export const defaultLearningScoreThreshold = 4
export const pronunciationRateValues = Array.from({ length: 16 }, (_, index) => (index + 5) / 10)
export interface PronunciationRates { normal: number; slow: number }
export const defaultPronunciationRates: PronunciationRates = { normal: 1, slow: 0.8 }

export interface PreferencesData {
  interfaceLanguage: InterfaceLanguage
  sessionFinishDelaySeconds?: SessionFinishDelaySeconds
  learningScoreThreshold?: number
  pronunciationRates?: PronunciationRates
}

export class Preferences {
  private readonly data: PreferencesData

  private constructor(data: PreferencesData) {
    this.data = data
  }

  static createEmpty(): Preferences {
    return new Preferences({ interfaceLanguage: interfaceLanguages.english, sessionFinishDelaySeconds: 5, learningScoreThreshold: defaultLearningScoreThreshold })
  }

  static fromData(data: PreferencesData): Preferences {
    const seconds = data.sessionFinishDelaySeconds ?? 5
    const threshold = data.learningScoreThreshold ?? defaultLearningScoreThreshold
    return new Preferences({ ...data, sessionFinishDelaySeconds: sessionFinishDelays.includes(seconds) ? seconds : 5, learningScoreThreshold: learningScoreThresholds.includes(threshold) ? threshold : defaultLearningScoreThreshold, pronunciationRates: { ...(isValidPronunciationRates(data.pronunciationRates) ? data.pronunciationRates : defaultPronunciationRates) } })
  }

  get interfaceLanguage(): InterfaceLanguage {
    return this.data.interfaceLanguage
  }

  withInterfaceLanguage(interfaceLanguage: InterfaceLanguage): Preferences {
    return new Preferences({ ...this.data, interfaceLanguage })
  }

  get sessionFinishDelaySeconds(): SessionFinishDelaySeconds {
    return this.data.sessionFinishDelaySeconds ?? 5
  }

  withSessionFinishDelaySeconds(seconds: SessionFinishDelaySeconds): Preferences {
    if (!sessionFinishDelays.includes(seconds)) throw new Error('Choose a supported Session finishing delay.')
    return new Preferences({ ...this.data, sessionFinishDelaySeconds: seconds })
  }

  get learningScoreThreshold(): number {
    return this.data.learningScoreThreshold ?? defaultLearningScoreThreshold
  }

  withLearningScoreThreshold(threshold: number): Preferences {
    if (!learningScoreThresholds.includes(threshold)) throw new Error('Choose a whole-number Learning-score threshold from 1 to 20.')
    return new Preferences({ ...this.data, learningScoreThreshold: threshold })
  }

  toData(): PreferencesData {
    return { ...this.data, pronunciationRates: this.pronunciationRates }
  }

  get pronunciationRates(): PronunciationRates {
    return { ...(this.data.pronunciationRates ?? defaultPronunciationRates) }
  }

  withPronunciationRates(rates: PronunciationRates): Preferences {
    if (!isValidPronunciationRates(rates)) throw new Error('Choose pronunciation rates from 0.5 to 2.0 in steps of 0.1, with slow below normal.')
    return new Preferences({ ...this.data, pronunciationRates: { ...rates } })
  }
}

function isValidPronunciationRates(rates: PronunciationRates | undefined): rates is PronunciationRates {
  return rates != null && pronunciationRateValues.includes(rates.normal) && pronunciationRateValues.includes(rates.slow) && rates.slow < rates.normal
}
