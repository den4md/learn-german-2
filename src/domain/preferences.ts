import { interfaceLanguages } from './constants'
import type { InterfaceLanguage } from './constants'

export type { InterfaceLanguage } from './constants'

export interface PreferencesData {
  interfaceLanguage: InterfaceLanguage
}

export class Preferences {
  private readonly data: PreferencesData

  private constructor(data: PreferencesData) {
    this.data = data
  }

  static createEmpty(): Preferences {
    return new Preferences({ interfaceLanguage: interfaceLanguages.english })
  }

  static fromData(data: PreferencesData): Preferences {
    return new Preferences({ ...data })
  }

  get interfaceLanguage(): InterfaceLanguage {
    return this.data.interfaceLanguage
  }

  withInterfaceLanguage(interfaceLanguage: InterfaceLanguage): Preferences {
    return new Preferences({ ...this.data, interfaceLanguage })
  }

  toData(): PreferencesData {
    return { ...this.data }
  }
}
