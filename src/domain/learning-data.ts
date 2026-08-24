import { Preferences } from './preferences'
import type { PreferencesData } from './preferences'
import { Session } from './session'
import type { SelfAssessment, SessionData } from './session'
import { VocabularyItem, VocabularyLearningRecord } from './vocabulary'
import type { VocabularyItemData, VocabularyLearningRecordData, WordState } from './vocabulary'
import type { VocabularyItemId } from './identifiers'

export interface LearningDataData {
  preferences: PreferencesData
  userAddedVocabularyItems: VocabularyItemData[]
  vocabularyLearningRecords: VocabularyLearningRecordData[]
  activeSession?: SessionData
  sessions: SessionData[]
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
      sessions: [],
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
      activeSession: data.activeSession === undefined ? undefined : Session.fromData(data.activeSession).toData(),
      sessions: (data.sessions ?? []).map((session) => Session.fromData(session).toData()),
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

  get activeSession(): Session | undefined {
    return this.data.activeSession === undefined ? undefined : Session.fromData(this.data.activeSession)
  }

  get sessions(): Session[] {
    return this.data.sessions.map(Session.fromData)
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

  startSession(session: Session): LearningData {
    if (this.data.activeSession !== undefined) {
      throw new Error('End the Active session before starting another Session.')
    }
    return new LearningData({ ...this.data, activeSession: session.toData() })
  }

  showActiveSessionEntry(entryIndex: number, shownAt: string): LearningData {
    const activeSession = this.requireActiveSession()
    const entry = activeSession.entryAt(entryIndex)
    const nextActiveSession = activeSession.showEntry(entryIndex, shownAt)
    const records =
      entry.shownAt === undefined
        ? this.withSessionEntryShown(entry.vocabularyItemId)
        : this.data.vocabularyLearningRecords

    return new LearningData({
      ...this.data,
      activeSession: nextActiveSession.toData(),
      vocabularyLearningRecords: records,
    })
  }

  assessActiveSessionEntry(
    entryIndex: number,
    selfAssessment: SelfAssessment,
    assessedAt: string,
  ): LearningData {
    const activeSession = this.requireActiveSession()
    const entry = activeSession.entryAt(entryIndex)
    const nextActiveSession = activeSession.assessEntry(entryIndex, selfAssessment, assessedAt)
    const records = this.withSessionSelfAssessment(
      entry.vocabularyItemId,
      activeSession.type,
      selfAssessment,
      entry.selfAssessment,
    )

    if (!nextActiveSession.isComplete) {
      return new LearningData({
        ...this.data,
        activeSession: nextActiveSession.toData(),
        vocabularyLearningRecords: records,
      })
    }

    const completedSession = nextActiveSession.end(assessedAt)
    return new LearningData({
      ...this.data,
      activeSession: undefined,
      sessions: [...this.data.sessions, completedSession.toData()],
      vocabularyLearningRecords: records,
    })
  }

  endActiveSession(endedAt: string): LearningData {
    const completedSession = this.requireActiveSession().end(endedAt)
    return new LearningData({
      ...this.data,
      activeSession: undefined,
      sessions: [...this.data.sessions, completedSession.toData()],
    })
  }

  withManualWordState(vocabularyItemId: VocabularyItemId, wordState: WordState): LearningData {
    const record = this.findVocabularyLearningRecord(vocabularyItemId)
    return this.withVocabularyLearningRecord(
      (record ?? VocabularyLearningRecord.createNew(vocabularyItemId)).withWordState(wordState),
    )
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
      activeSession:
        this.data.activeSession === undefined ? undefined : Session.fromData(this.data.activeSession).toData(),
      sessions: this.data.sessions.map((session) => Session.fromData(session).toData()),
    }
  }

  private requireActiveSession(): Session {
    if (this.data.activeSession === undefined) {
      throw new Error('There is no Active session.')
    }
    return Session.fromData(this.data.activeSession)
  }

  private findVocabularyLearningRecord(
    vocabularyItemId: VocabularyItemId,
  ): VocabularyLearningRecord | undefined {
    const data = this.data.vocabularyLearningRecords.find(
      (record) => record.vocabularyItemId === vocabularyItemId,
    )
    return data === undefined ? undefined : VocabularyLearningRecord.fromData(data)
  }

  private withSessionEntryShown(vocabularyItemId: VocabularyItemId): VocabularyLearningRecordData[] {
    return this.replaceVocabularyLearningRecord(
      (this.findVocabularyLearningRecord(vocabularyItemId) ?? VocabularyLearningRecord.createNew(vocabularyItemId))
        .withSessionEntryShown(),
    )
  }

  private withSessionSelfAssessment(
    vocabularyItemId: VocabularyItemId,
    sessionType: Session['type'],
    selfAssessment: SelfAssessment,
    replacedSelfAssessment: SelfAssessment | undefined,
  ): VocabularyLearningRecordData[] {
    return this.replaceVocabularyLearningRecord(
      (this.findVocabularyLearningRecord(vocabularyItemId) ?? VocabularyLearningRecord.createNew(vocabularyItemId))
        .withSessionSelfAssessment(sessionType, selfAssessment, replacedSelfAssessment),
    )
  }

  private replaceVocabularyLearningRecord(
    vocabularyLearningRecord: VocabularyLearningRecord,
  ): VocabularyLearningRecordData[] {
    return [
      ...this.data.vocabularyLearningRecords.filter(
        (record) => record.vocabularyItemId !== vocabularyLearningRecord.vocabularyItemId,
      ),
      vocabularyLearningRecord.toData(),
    ]
  }
}

export function createEmptyLearningData(): LearningDataData {
  return LearningData.createEmpty().toData()
}
