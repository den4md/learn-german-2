import { interfaceLanguages } from './constants'
import type { InterfaceLanguage } from './constants'

export type { InterfaceLanguage } from './constants'

export const sessionFinishDelays = [0, 2, 5, 10] as const
export type SessionFinishDelaySeconds = typeof sessionFinishDelays[number]

export interface PreferencesData {
  interfaceLanguage: InterfaceLanguage
  sessionFinishDelaySeconds?: SessionFinishDelaySeconds
}

export class Preferences {
  private readonly data: PreferencesData

  private constructor(data: PreferencesData) {
    this.data = data
  }

  static createEmpty(): Preferences {
    return new Preferences({ interfaceLanguage: interfaceLanguages.english, sessionFinishDelaySeconds: 5 })
  }

  static fromData(data: PreferencesData): Preferences {
    const seconds = data.sessionFinishDelaySeconds ?? 5
    return new Preferences({ ...data, sessionFinishDelaySeconds: sessionFinishDelays.includes(seconds) ? seconds : 5 })
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

  toData(): PreferencesData {
    return { ...this.data }
  }
}
