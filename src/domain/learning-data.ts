import { Preferences } from './preferences'
import type { PreferencesData } from './preferences'
import { VocabularyItem, VocabularyLearningRecord } from './vocabulary'
import type { VocabularyItemData, VocabularyLearningRecordData } from './vocabulary'

export interface LearningDataData {
  preferences: PreferencesData
  userAddedVocabularyItems: VocabularyItemData[]
  vocabularyLearningRecords: VocabularyLearningRecordData[]
}

export class LearningData {
  private readonly data: LearningDataData

  private constructor(data: LearningDataData) {
    this.data = data
  }

  static createEmpty(): LearningData {
    return new LearningData({
      preferences: Preferences.createEmpty().toData(),
      userAddedVocabularyItems: [],
      vocabularyLearningRecords: [],
    })
  }

  static fromData(data: LearningDataData): LearningData {
    return new LearningData({
      ...data,
      preferences: Preferences.fromData(data.preferences).toData(),
      userAddedVocabularyItems: (data.userAddedVocabularyItems ?? []).map((item) =>
        VocabularyItem.fromData(item).toData(),
      ),
      vocabularyLearningRecords: (data.vocabularyLearningRecords ?? []).map((record) =>
        VocabularyLearningRecord.fromData(record).toData(),
      ),
    })
  }

  get preferences(): Preferences {
    return Preferences.fromData(this.data.preferences)
  }

  withPreferences(preferences: Preferences): LearningData {
    return new LearningData({ ...this.data, preferences: preferences.toData() })
  }

  get userAddedVocabularyItems(): VocabularyItem[] {
    return this.data.userAddedVocabularyItems.map(VocabularyItem.fromData)
  }

  get vocabularyLearningRecords(): VocabularyLearningRecord[] {
    return this.data.vocabularyLearningRecords.map(VocabularyLearningRecord.fromData)
  }

  withUserAddedVocabularyItem(vocabularyItem: VocabularyItem): LearningData {
    const items = this.data.userAddedVocabularyItems.filter((item) => item.id !== vocabularyItem.id)
    return new LearningData({ ...this.data, userAddedVocabularyItems: [...items, vocabularyItem.toData()] })
  }

  withVocabularyLearningRecord(vocabularyLearningRecord: VocabularyLearningRecord): LearningData {
    const records = this.data.vocabularyLearningRecords.filter(
      (record) => record.vocabularyItemId !== vocabularyLearningRecord.vocabularyItemId,
    )
    return new LearningData({
      ...this.data,
      vocabularyLearningRecords: [...records, vocabularyLearningRecord.toData()],
    })
  }

  toData(): LearningDataData {
    return {
      ...this.data,
      preferences: Preferences.fromData(this.data.preferences).toData(),
      userAddedVocabularyItems: this.data.userAddedVocabularyItems.map((item) =>
        VocabularyItem.fromData(item).toData(),
      ),
      vocabularyLearningRecords: this.data.vocabularyLearningRecords.map((record) =>
        VocabularyLearningRecord.fromData(record).toData(),
      ),
    }
  }
}

export function createEmptyLearningData(): LearningDataData {
  return LearningData.createEmpty().toData()
}
