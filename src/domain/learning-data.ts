import { Preferences } from './preferences'
import type { PreferencesData } from './preferences'
import { DailyStreakHistory, toUtcDate } from './learning-progress'
import type { DailyStreakHistoryData } from './learning-progress'
import { Session } from './session'
import type { SelfAssessment, SessionData, SessionEntryTransitionData } from './session'
import { VocabularyItem, VocabularyLearningRecord } from './vocabulary'
import type { LearningStatisticsData, VocabularyItemData, VocabularyItemTextData, VocabularyLearningRecordData, WordState } from './vocabulary'
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
    const learningData = new LearningData({
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

    const activeSession = learningData.data.activeSession
    if (activeSession === undefined || (activeSession.deferredOutcomes === true && activeSession.entries.every((entry) => entry.transition === undefined))) {
      return learningData
    }

    // Older Active sessions already applied their outcomes. Undo only a still-matching
    // state/score; their immediate statistics stay, and unavailable snapshots stay unknown.
    const entriesById = new Map(activeSession.entries.map((entry) => [entry.vocabularyItemId, entry]))
    return new LearningData({
      ...learningData.data,
      activeSession: {
        ...activeSession,
        deferredOutcomes: true,
        entries: activeSession.entries.map((entry) => ({
          ...entry,
          baseline: entry.baseline ?? (entry.transition === undefined ? undefined : {
            wordState: entry.transition.beforeWordState,
            learningScore: entry.transition.beforeLearningScore,
            learningStatistics: entry.transition.beforeLearningStatistics,
          }),
          transition: undefined,
        })),
      },
      vocabularyLearningRecords: learningData.data.vocabularyLearningRecords.map((record) => {
        const transition = entriesById.get(record.vocabularyItemId)?.transition
        return activeSession.deferredOutcomes === true || transition === undefined || record.wordState !== transition.afterWordState || record.learningScore !== transition.afterLearningScore
          ? record
          : { ...record, wordState: transition.beforeWordState, learningScore: transition.beforeLearningScore }
      }),
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
    if (session.isEnded) {
      throw new Error('An ended Session cannot become the Active session.')
    }
    return new LearningData({ ...this.data, activeSession: session.toData() })
  }

  showActiveSessionEntry(entryIndex: number, shownAt: string): LearningData {
    const activeSession = this.requireActiveSession()
    const entry = activeSession.entryAt(entryIndex)
    const beforeRecord = this.findVocabularyLearningRecord(entry.vocabularyItemId) ?? VocabularyLearningRecord.createNew(entry.vocabularyItemId)
    const afterRecord = beforeRecord.withSessionEntryShown()
    const nextActiveSession = activeSession.showEntry(entryIndex, shownAt, { wordState: beforeRecord.wordState, learningScore: beforeRecord.learningScore, learningStatistics: beforeRecord.learningStatistics })
    const records =
      entry.shownAt === undefined
        ? this.replaceVocabularyLearningRecord(afterRecord)
        : this.data.vocabularyLearningRecords

    return new LearningData({
      ...this.data,
      activeSession: nextActiveSession.toData(),
      vocabularyLearningRecords: records,
    })
  }

  showActiveSessionCandidate(vocabularyItemId: VocabularyItemId, shownAt: string): LearningData {
    const activeSession = this.requireActiveSession()
    const beforeRecord = this.findVocabularyLearningRecord(vocabularyItemId) ?? VocabularyLearningRecord.createNew(vocabularyItemId)
    const afterRecord = beforeRecord.withSessionEntryShown()
    const nextActiveSession = activeSession.showCandidate(vocabularyItemId, shownAt, { wordState: beforeRecord.wordState, learningScore: beforeRecord.learningScore, learningStatistics: beforeRecord.learningStatistics })

    return new LearningData({
      ...this.data,
      activeSession: nextActiveSession.toData(),
      vocabularyLearningRecords: this.replaceVocabularyLearningRecord(afterRecord),
    })
  }

  revealActiveSessionEntry(entryIndex: number, revealedAt: string): LearningData {
    const activeSession = this.requireActiveSession()
    return new LearningData({
      ...this.data,
      activeSession: activeSession.revealEntry(entryIndex, revealedAt).toData(),
    })
  }

  selectNextActiveSessionCandidatePage(
    vocabularyItemIds: VocabularyItemId[],
    selectedAt: string,
  ): LearningData {
    const activeSession = this.requireActiveSession()
    const nextActiveSession = activeSession.selectNextCandidatePage(vocabularyItemIds, selectedAt)

    return nextActiveSession.isEnded
      ? this.finishSession(nextActiveSession)
      : new LearningData({ ...this.data, activeSession: nextActiveSession.toData() })
  }

  assessActiveSessionEntry(
    entryIndex: number,
    selfAssessment: SelfAssessment,
    assessedAt: string,
  ): LearningData {
    const activeSession = this.requireActiveSession()
    const entry = activeSession.entryAt(entryIndex)
    const currentRecord = this.findVocabularyLearningRecord(entry.vocabularyItemId) ?? VocabularyLearningRecord.createNew(entry.vocabularyItemId)
    const nextActiveSession = activeSession.assessEntry(entryIndex, selfAssessment, assessedAt)
    const afterRecord = currentRecord.withSessionAssessmentStatistics(selfAssessment, entry.selfAssessment, assessedAt)
    const learningData = new LearningData({
      ...this.data,
      activeSession: nextActiveSession.toData(),
      vocabularyLearningRecords: this.replaceVocabularyLearningRecord(afterRecord),
    })

    return learningData.updateDailyStreak(assessedAt)
  }

  endActiveSession(endedAt: string): LearningData {
    return this.finishSession(this.requireActiveSession().end(endedAt))
  }

  completeActiveSession(endedAt: string): LearningData {
    const activeSession = this.requireActiveSession()
    if (activeSession.isUnlimited) {
      throw new Error('An Unlimited session completes when no next Candidate page can be selected.')
    }
    return this.finishSession(activeSession.complete(endedAt))
  }

  selectActiveSessionFinishingPosition(selectedAt: string): LearningData {
    return new LearningData({ ...this.data, activeSession: this.requireActiveSession().selectFinishingPosition(selectedAt).toData() })
  }

  manuallySetActiveSessionEntryWordState(
    entryIndex: number,
    wordState: WordState,
    assessedAt: string,
  ): LearningData {
    const activeSession = this.requireActiveSession()
    const entry = activeSession.entryAt(entryIndex)
    const currentRecord = this.findVocabularyLearningRecord(entry.vocabularyItemId) ?? VocabularyLearningRecord.createNew(entry.vocabularyItemId)
    const nextActiveSession = activeSession.manuallySetEntryWordState(entryIndex, wordState, assessedAt)
    const afterRecord = currentRecord.withSessionAssessmentStatistics(undefined, entry.selfAssessment, assessedAt)
    const learningData = new LearningData({
      ...this.data,
      activeSession: nextActiveSession.toData(),
      vocabularyLearningRecords: this.replaceVocabularyLearningRecord(afterRecord),
    })

    return learningData.updateDailyStreak(assessedAt)
  }

  isVocabularyItemWordStateLocked(vocabularyItemId: VocabularyItemId): boolean {
    const session = this.data.activeSession
    return session !== undefined && (session.entries.some((entry) => entry.vocabularyItemId === vocabularyItemId)
      || (session.candidateVocabularyItemIds ?? []).includes(vocabularyItemId))
  }

  withManualWordState(vocabularyItemId: VocabularyItemId, wordState: WordState): LearningData {
    const record = this.findVocabularyLearningRecord(vocabularyItemId)
    if (this.isVocabularyItemWordStateLocked(vocabularyItemId)) {
      if (wordState !== (record ?? VocabularyLearningRecord.createNew(vocabularyItemId)).wordState) {
        throw new Error('The Word state is locked until the Active session ends.')
      }
      return this
    }
    return this.withVocabularyLearningRecord(
      (record ?? VocabularyLearningRecord.createNew(vocabularyItemId)).withWordState(wordState),
    )
  }

  withVocabularyItemFavouriteStatus(vocabularyItemId: VocabularyItemId, isFavourite: boolean): LearningData {
    const record = this.findVocabularyLearningRecord(vocabularyItemId)
    return this.withVocabularyLearningRecord(
      (record ?? VocabularyLearningRecord.createNew(vocabularyItemId)).withFavouriteStatus(isFavourite),
    )
  }

  withVocabularyItemGermanText(
    vocabularyItemId: VocabularyItemId,
    germanText: VocabularyItemTextData | undefined,
  ): LearningData {
    const record = this.findVocabularyLearningRecord(vocabularyItemId)
    return this.withVocabularyLearningRecord(
      (record ?? VocabularyLearningRecord.createNew(vocabularyItemId)).withGermanText(germanText),
    )
  }

  withVocabularyItemTranslations(
    vocabularyItemId: VocabularyItemId,
    translations: string[] | undefined,
  ): LearningData {
    const record = this.findVocabularyLearningRecord(vocabularyItemId)
    return this.withVocabularyLearningRecord(
      (record ?? VocabularyLearningRecord.createNew(vocabularyItemId)).withTranslations(translations),
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

  private finishSession(session: Session): LearningData {
    const recordsById = new Map(this.data.vocabularyLearningRecords.map((record) => [record.vocabularyItemId, record]))
    const sessionData = session.toData()
    for (const entry of sessionData.entries) {
      const recordData = recordsById.get(entry.vocabularyItemId)
      const beforeRecord = recordData === undefined ? VocabularyLearningRecord.createNew(entry.vocabularyItemId) : VocabularyLearningRecord.fromData(recordData)
      // Only the last choice is applied. Statistics already reflect that choice.
      const afterRecord = entry.manualWordState !== undefined
        ? beforeRecord.withWordState(entry.manualWordState, entry.selfAssessedAt)
        : entry.selfAssessment !== undefined
          ? beforeRecord.withSessionOutcome(session.type, entry.selfAssessment, this.preferences.learningScoreThreshold)
          : beforeRecord
      entry.transition = createSessionEntryTransition(beforeRecord, afterRecord, entry.baseline?.learningStatistics)
      entry.baseline = undefined
      recordsById.set(entry.vocabularyItemId, afterRecord.toData())
    }
    return new LearningData({
      ...this.data,
      vocabularyLearningRecords: [...recordsById.values()],
      activeSession: undefined,
      sessions: [...this.data.sessions, sessionData],
    })
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

function createSessionEntryTransition(beforeRecord: VocabularyLearningRecord, afterRecord: VocabularyLearningRecord, beforeLearningStatistics: LearningStatisticsData | undefined): SessionEntryTransitionData {
  return {
    beforeWordState: beforeRecord.wordState,
    beforeLearningScore: beforeRecord.learningScore,
    beforeLearningStatistics,
    afterWordState: afterRecord.wordState,
    afterLearningScore: afterRecord.learningScore,
    afterLearningStatistics: beforeLearningStatistics === undefined ? undefined : afterRecord.learningStatistics,
  }
}

export function createEmptyLearningData(): LearningDataData {
  return LearningData.createEmpty().toData()
}
