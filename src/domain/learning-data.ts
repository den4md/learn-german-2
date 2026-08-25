import { Preferences } from './preferences'
import type { PreferencesData } from './preferences'
import { DailyStreakHistory, toUtcDate } from './learning-progress'
import type { DailyStreakHistoryData } from './learning-progress'
import { Session } from './session'
import type { SelfAssessment, SessionData, SessionEntryTransitionData } from './session'
import { VocabularyItem, VocabularyLearningRecord } from './vocabulary'
import type { VocabularyItemData, VocabularyLearningRecordData, WordState } from './vocabulary'
import type { VocabularyItemId } from './identifiers'
import { recallSelfAssessments } from './constants'

export interface LearningDataData {
  preferences: PreferencesData
  userAddedVocabularyItems: VocabularyItemData[]
  vocabularyLearningRecords: VocabularyLearningRecordData[]
  activeSession?: SessionData
  sessions: SessionData[]
  dailyStreakHistory: DailyStreakHistoryData
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
      dailyStreakHistory: DailyStreakHistory.createEmpty().toData(),
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
      dailyStreakHistory: DailyStreakHistory.fromData(
        data.dailyStreakHistory ?? DailyStreakHistory.createEmpty().toData(),
      ).toData(),
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

  get dailyStreakHistory(): DailyStreakHistory {
    return DailyStreakHistory.fromData(this.data.dailyStreakHistory)
  }

  get dailyStreakLength(): number {
    return this.dailyStreakHistory.currentLength
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

  showActiveSessionCandidate(vocabularyItemId: VocabularyItemId, shownAt: string): LearningData {
    const activeSession = this.requireActiveSession()
    const nextActiveSession = activeSession.showCandidate(vocabularyItemId, shownAt)

    return new LearningData({
      ...this.data,
      activeSession: nextActiveSession.toData(),
      vocabularyLearningRecords: this.withSessionEntryShown(vocabularyItemId),
    })
  }

  revealActiveSessionEntry(entryIndex: number, revealedAt: string): LearningData {
    const activeSession = this.requireActiveSession()
    return new LearningData({
      ...this.data,
      activeSession: activeSession.revealEntry(entryIndex, revealedAt).toData(),
    })
  }

  dropActiveSessionCandidate(vocabularyItemId: VocabularyItemId, droppedAt: string): LearningData {
    const activeSession = this.requireActiveSession()
    return new LearningData({
      ...this.data,
      activeSession: activeSession.dropCandidate(vocabularyItemId, droppedAt).toData(),
    })
  }

  selectNextActiveSessionCandidatePage(
    vocabularyItemIds: VocabularyItemId[],
    selectedAt: string,
  ): LearningData {
    const activeSession = this.requireActiveSession()
    const nextActiveSession = activeSession.selectNextCandidatePage(vocabularyItemIds, selectedAt)

    return nextActiveSession.isEnded
      ? new LearningData({
        ...this.data,
        activeSession: undefined,
        sessions: [...this.data.sessions, nextActiveSession.toData()],
      })
      : new LearningData({ ...this.data, activeSession: nextActiveSession.toData() })
  }

  assessActiveSessionEntry(
    entryIndex: number,
    selfAssessment: SelfAssessment,
    assessedAt: string,
  ): LearningData {
    const activeSession = this.requireActiveSession()
    const entry = activeSession.entryAt(entryIndex)
    const beforeRecord = this.findVocabularyLearningRecord(entry.vocabularyItemId) ?? VocabularyLearningRecord.createNew(entry.vocabularyItemId)
    const afterRecord = beforeRecord.withSessionSelfAssessment(activeSession.type, selfAssessment, entry.selfAssessment)
    const nextActiveSession = activeSession.assessEntry(entryIndex, selfAssessment, assessedAt, createSessionEntryTransition(beforeRecord, afterRecord))
    const records = this.replaceVocabularyLearningRecord(afterRecord)

    const learningData = !nextActiveSession.isComplete
      ? new LearningData({
        ...this.data,
        activeSession: nextActiveSession.toData(),
        vocabularyLearningRecords: records,
      })
      : new LearningData({
        ...this.data,
        activeSession: undefined,
        sessions: [...this.data.sessions, nextActiveSession.complete(assessedAt).toData()],
        vocabularyLearningRecords: records,
      })

    return learningData.updateDailyStreak(assessedAt)
  }

  endActiveSession(endedAt: string): LearningData {
    const completedSession = this.requireActiveSession().end(endedAt)
    return new LearningData({
      ...this.data,
      activeSession: undefined,
      sessions: [...this.data.sessions, completedSession.toData()],
    })
  }

  manuallySetActiveSessionEntryWordState(
    entryIndex: number,
    wordState: WordState,
    assessedAt: string,
  ): LearningData {
    const activeSession = this.requireActiveSession()
    const entry = activeSession.entryAt(entryIndex)
    const beforeRecord = this.findVocabularyLearningRecord(entry.vocabularyItemId) ?? VocabularyLearningRecord.createNew(entry.vocabularyItemId)
    const afterRecord = beforeRecord.withManualWordState(wordState, entry.selfAssessment)
    const nextActiveSession = activeSession.manuallySetEntryWordState(entryIndex, wordState, assessedAt, createSessionEntryTransition(beforeRecord, afterRecord))
    const records = this.replaceVocabularyLearningRecord(afterRecord)

    const learningData = !nextActiveSession.isComplete
      ? new LearningData({
        ...this.data,
        activeSession: nextActiveSession.toData(),
        vocabularyLearningRecords: records,
      })
      : new LearningData({
        ...this.data,
        activeSession: undefined,
        sessions: [...this.data.sessions, nextActiveSession.complete(assessedAt).toData()],
        vocabularyLearningRecords: records,
      })

    return learningData.updateDailyStreak(assessedAt)
  }

  withManualWordState(vocabularyItemId: VocabularyItemId, wordState: WordState): LearningData {
    const record = this.findVocabularyLearningRecord(vocabularyItemId)
    return this.withVocabularyLearningRecord(
      (record ?? VocabularyLearningRecord.createNew(vocabularyItemId)).withWordState(wordState),
    )
  }

  updateDailyStreak(currentTimestamp: string): LearningData {
    let dailyStreakHistory = this.dailyStreakHistory.withAutomaticStreakPauses(currentTimestamp)
    const currentUtcDate = toUtcDate(currentTimestamp)

    if (this.countCorrectSessionEntryAssessments(currentUtcDate) >= 5) {
      dailyStreakHistory = dailyStreakHistory.withValidDate(currentUtcDate)
    }

    return new LearningData({ ...this.data, dailyStreakHistory: dailyStreakHistory.toData() })
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
      dailyStreakHistory: DailyStreakHistory.fromData(this.data.dailyStreakHistory).toData(),
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

  private countCorrectSessionEntryAssessments(utcDate: string): number {
    const sessions = [
      ...this.data.sessions.map(Session.fromData),
      ...(this.data.activeSession === undefined ? [] : [Session.fromData(this.data.activeSession)]),
    ]

    return sessions.flatMap((session) => session.entries).filter(
      (entry) =>
        entry.selfAssessment === recallSelfAssessments.correct &&
        entry.selfAssessedAt !== undefined &&
        toUtcDate(entry.selfAssessedAt) === utcDate,
    ).length
  }
}

function createSessionEntryTransition(beforeRecord: VocabularyLearningRecord, afterRecord: VocabularyLearningRecord): SessionEntryTransitionData {
  return {
    beforeWordState: beforeRecord.wordState,
    beforeLearningScore: beforeRecord.learningScore,
    afterWordState: afterRecord.wordState,
    afterLearningScore: afterRecord.learningScore,
  }
}

export function createEmptyLearningData(): LearningDataData {
  return LearningData.createEmpty().toData()
}
