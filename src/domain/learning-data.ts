import { Preferences } from './preferences'
import type { PreferencesData } from './preferences'

export interface LearningDataData {
  preferences: PreferencesData
}

export class LearningData {
  private readonly data: LearningDataData

  private constructor(data: LearningDataData) {
    this.data = data
  }

  static createEmpty(): LearningData {
    return new LearningData({ preferences: Preferences.createEmpty().toData() })
  }

  static fromData(data: LearningDataData): LearningData {
    return new LearningData({
      ...data,
      preferences: Preferences.fromData(data.preferences).toData(),
    })
  }

  get preferences(): Preferences {
    return Preferences.fromData(this.data.preferences)
  }

  withPreferences(preferences: Preferences): LearningData {
    return new LearningData({ ...this.data, preferences: preferences.toData() })
  }

  toData(): LearningDataData {
    return {
      ...this.data,
      preferences: Preferences.fromData(this.data.preferences).toData(),
    }
  }
}

export function createEmptyLearningData(): LearningDataData {
  return LearningData.createEmpty().toData()
}
