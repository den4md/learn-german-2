import assert from 'node:assert/strict'
import { dailyStreakDayStatuses, recallSelfAssessments, sessionEndReasons, sessionTypes, wordStates } from '../src/domain/constants'
import type { SelfAssessment, SessionType, WordState } from '../src/domain/constants'
import { createEmptyDataDocument, normalizeDataDocument } from '../src/domain/data-document'
import { documentId, sessionId, vocabularyItemId } from '../src/domain/identifiers'
import { LearningData } from '../src/domain/learning-data'
import { Preferences } from '../src/domain/preferences'
import { Session, SessionSettings } from '../src/domain/session'
import { VocabularyLearningRecord } from '../src/domain/vocabulary'

const now = '2026-10-26T12:00:00.000Z'
const later = '2026-10-26T12:01:00.000Z'
const ids = [1, 2, 3, 4, 5].map(vocabularyItemId)
const baselineStatistics = { cardShows: 7, correctAssessments: 4, incorrectAssessments: 2 }
const baselineRecord = VocabularyLearningRecord.fromData({
  ...VocabularyLearningRecord.createNew(ids[0]!).toData(),
  wordState: wordStates.learning,
  learningScore: 9,
  learningStatistics: baselineStatistics,
})

function start(itemLimit: number | undefined = 1, type: SessionType = sessionTypes.learning): LearningData {
  const settings = SessionSettings.fromData({ ...SessionSettings.createDefault().toData(), itemLimit })
  return LearningData.createEmpty().withVocabularyLearningRecord(baselineRecord)
    .startSession(Session.start(sessionId('verification'), type, settings, ids, now))
}

function showAndReveal(data: LearningData, index = 0): LearningData {
  return data.showActiveSessionEntry(index, now).revealActiveSessionEntry(index, now)
}

function record(data: LearningData, index = 0) {
  return data.vocabularyLearningRecords.find((item) => item.vocabularyItemId === ids[index])!.toData()
}

function refresh(data: LearningData): LearningData {
  const document = { ...createEmptyDataDocument(documentId('verification'), now), learningData: data.toData() }
  return LearningData.fromData(normalizeDataDocument(JSON.parse(JSON.stringify(document))).learningData)
}

// Answers store a choice and immediate statistics, never a calculated future outcome.
let data = showAndReveal(start())
const snapshot = data.activeSession!.entryAt(0).baseline!
assert.deepEqual(snapshot.learningStatistics, baselineStatistics)
snapshot.learningStatistics!.cardShows = 999
data.activeSession!.toData().entries[0]!.baseline!.learningStatistics!.cardShows = 999
assert.equal(data.activeSession!.entryAt(0).baseline!.learningStatistics!.cardShows, 7)
assert.equal(record(data).learningStatistics.cardShows, 8)
data = data.assessActiveSessionEntry(0, recallSelfAssessments.correct, now)
assert.equal(record(data).wordState, wordStates.learning)
assert.equal(record(data).learningScore, 9)
assert.equal(record(data).learningStatistics.correctAssessments, 5)
assert.equal(data.activeSession!.isComplete, true)
assert.equal(data.sessions.length, 0)
assert.equal(data.activeSession!.entryAt(0).selfAssessment, recallSelfAssessments.correct)
assert.equal(data.activeSession!.entryAt(0).transition, undefined)
for (let repetition = 0; repetition < 2; repetition += 1) {
  data = data.assessActiveSessionEntry(0, recallSelfAssessments.incorrect, later)
}
assert.deepEqual(record(data).learningStatistics, { cardShows: 8, correctAssessments: 4, incorrectAssessments: 3 })
assert.equal(data.activeSession!.entryAt(0).baseline!.learningScore, 9)
assert.equal(data.activeSession!.entryAt(0).selfAssessment, recallSelfAssessments.incorrect)
assert.equal(data.activeSession!.entryAt(0).transition, undefined)

// Assessment/manual replacements always start at the original score, in either order.
for (const state of [wordStates.known, wordStates.new, wordStates.learning, wordStates.excluded]) {
  data = data.manuallySetActiveSessionEntryWordState(0, state, later)
  assert.deepEqual(record(data).learningStatistics, { ...baselineStatistics, cardShows: 8 })
  assert.equal(record(data).wordState, wordStates.learning)
  assert.equal(record(data).learningScore, 9)
  assert.equal(data.activeSession!.entryAt(0).manualWordState, state)
  assert.equal(data.activeSession!.entryAt(0).transition, undefined)
  data = data.assessActiveSessionEntry(0, recallSelfAssessments.correct, later)
  assert.equal(data.activeSession!.entryAt(0).manualWordState, undefined)
  assert.equal(record(data).learningStatistics.correctAssessments, 5)
}
data = data.assessActiveSessionEntry(0, recallSelfAssessments.incorrect, later)
data = data.withVocabularyItemFavouriteStatus(ids[0]!, true)
  .withVocabularyItemTranslations(ids[0]!, ['изменено'])
  .withVocabularyItemGermanText(ids[0]!, { wordType: 'adjective', positive: 'geändert' })
const persisted = refresh(data).showActiveSessionEntry(0, later)
assert.equal(record(persisted).learningStatistics.cardShows, 8)
assert.equal(persisted.activeSession!.entryAt(0).revealedAt, now)

for (const finish of [(value: LearningData) => value.completeActiveSession(later), (value: LearningData) => value.endActiveSession(later)]) {
  const ended = refresh(finish(persisted))
  assert.equal(ended.activeSession, undefined)
  assert.equal(record(ended).wordState, wordStates.learning)
  assert.equal(record(ended).learningScore, 0)
  assert.deepEqual(record(ended).learningStatistics, { cardShows: 8, correctAssessments: 4, incorrectAssessments: 3 })
  assert.equal(record(ended).isFavourite, true)
  assert.deepEqual(record(ended).translations, ['изменено'])
  assert.deepEqual(record(ended).germanText, { wordType: 'adjective', positive: 'geändert' })
  assert.equal(record(ended).lastUpdatedAt, later)
  const historical = ended.sessions[0]!.entryAt(0).transition!
  assert.deepEqual(historical.beforeLearningStatistics, baselineStatistics)
  assert.deepEqual(historical.afterLearningStatistics, record(ended).learningStatistics)
  assert.throws(() => ended.endActiveSession(later), /no Active session/)
  assert.throws(() => ended.completeActiveSession(later), /no Active session/)
  assert.throws(() => ended.startSession(ended.sessions[0]!), /ended Session/)
  assert.throws(() => ended.sessions[0]!.assessEntry(0, recallSelfAssessments.correct, later), /read-only/)
  const changed = ended.withManualWordState(ids[0]!, wordStates.known)
  assert.deepEqual(changed.sessions[0]!.entryAt(0).transition, historical)
}

// All original assessment rules still produce their outcomes, without committing early.
const assessments: Array<[SessionType, WordState, number, SelfAssessment, WordState, number]> = [
  [sessionTypes.knowledgeCheck, wordStates.new, 0, wordStates.known, wordStates.known, 0],
  [sessionTypes.knowledgeCheck, wordStates.new, 0, wordStates.learning, wordStates.learning, 1],
  [sessionTypes.knowledgeCheck, wordStates.new, 0, wordStates.new, wordStates.learning, 0],
  [sessionTypes.learning, wordStates.learning, 9, recallSelfAssessments.correct, wordStates.known, 10],
  [sessionTypes.learning, wordStates.learning, 9, recallSelfAssessments.incorrect, wordStates.learning, 0],
  [sessionTypes.repetition, wordStates.known, 10, recallSelfAssessments.correct, wordStates.known, 10],
  [sessionTypes.repetition, wordStates.known, 10, recallSelfAssessments.incorrect, wordStates.learning, 0],
  [sessionTypes.learning, wordStates.learning, 9, wordStates.excluded, wordStates.excluded, 9],
]
for (const [type, beforeWordState, beforeScore, assessment, afterWordState, afterScore] of assessments) {
  const initial = start(1, type).withVocabularyLearningRecord(VocabularyLearningRecord.fromData({
    ...baselineRecord.toData(), wordState: beforeWordState, learningScore: beforeScore,
  }))
  const answered = showAndReveal(initial).assessActiveSessionEntry(0, assessment, now)
  assert.equal(record(answered).wordState, beforeWordState)
  assert.equal(record(answered).learningScore, beforeScore)
  const ended = answered.completeActiveSession(later)
  assert.equal(record(ended).wordState, afterWordState)
  assert.equal(record(ended).learningScore, afterScore)
}

// Manual end keeps presented unanswered entries and the original Limited total.
assert.throws(() => start(3).completeActiveSession(later), /Complete every/)
assert.throws(() => start().revealActiveSessionEntry(0, now), /Show the Session entry/)
assert.throws(() => start().manuallySetActiveSessionEntryWordState(0, wordStates.known, now), /Reveal/)
const emptyEnd = start(3).endActiveSession(later)
assert.equal(emptyEnd.sessions[0]!.entries.length, 0)
assert.equal(emptyEnd.sessions[0]!.toData().selectedItemCount, 3)
data = showAndReveal(start(3)).assessActiveSessionEntry(0, recallSelfAssessments.correct, now)
data = data.showActiveSessionEntry(1, now)
const partialEnd = refresh(data).endActiveSession(later)
assert.deepEqual(partialEnd.sessions[0]!.entries.map((entry) => entry.vocabularyItemId), ids.slice(0, 2))
assert.equal(partialEnd.sessions[0]!.toData().selectedItemCount, 3)
assert.equal(partialEnd.sessions[0]!.toData().endReason, sessionEndReasons.userEnded)
assert.equal(partialEnd.sessions[0]!.entryAt(1).isCompleted, false)
assert.deepEqual(partialEnd.sessions[0]!.entryAt(1).transition, {
  beforeWordState: wordStates.new, beforeLearningScore: 0,
  beforeLearningStatistics: { cardShows: 0, correctAssessments: 0, incorrectAssessments: 0 },
  afterWordState: wordStates.new, afterLearningScore: 0,
  afterLearningStatistics: { cardShows: 1, correctAssessments: 0, incorrectAssessments: 0 },
})
assert.equal(record(partialEnd, 1).wordState, wordStates.new)
assert.equal(record(partialEnd).learningScore, 10)
assert.equal(record(partialEnd).wordState, wordStates.known)

// Unlimited exhaustion and replacement by another Session share the same commit path.
const unlimitedSettings = SessionSettings.createDefault()
data = LearningData.createEmpty().withVocabularyLearningRecord(baselineRecord)
  .startSession(Session.start(sessionId('unlimited'), sessionTypes.learning, unlimitedSettings, ids.slice(0, 2), now))
data = data.showActiveSessionCandidate(ids[0]!, now).revealActiveSessionEntry(0, now)
  .assessActiveSessionEntry(0, recallSelfAssessments.correct, now)
assert.throws(() => data.selectNextActiveSessionCandidatePage([], later), /Complete the current/)
data = data.showActiveSessionCandidate(ids[1]!, now)
const unlimitedPartial = refresh(data).endActiveSession(later)
assert.equal(unlimitedPartial.sessions[0]!.entries.length, 2)
assert.equal(unlimitedPartial.sessions[0]!.entryAt(1).isCompleted, false)
assert.deepEqual(unlimitedPartial.sessions[0]!.candidateVocabularyItemIds, [])
assert.equal(record(unlimitedPartial).wordState, wordStates.known)
data = data.revealActiveSessionEntry(1, now).assessActiveSessionEntry(1, recallSelfAssessments.incorrect, now)
assert.throws(() => data.completeActiveSession(later), /Unlimited session/)
assert.throws(() => data.selectNextActiveSessionCandidatePage([ids[0]!], later), /already presented/)
let nextPage = refresh(data.selectNextActiveSessionCandidatePage([ids[2]!], later))
assert.equal(record(nextPage).learningScore, 9)
assert.equal(nextPage.activeSession!.entries.length, 2)
nextPage = nextPage.showActiveSessionCandidate(ids[2]!, later).revealActiveSessionEntry(2, later)
  .manuallySetActiveSessionEntryWordState(2, wordStates.known, later)
const multiplePages = nextPage.selectNextActiveSessionCandidatePage([], later)
assert.equal(record(multiplePages).learningScore, 10)
assert.equal(record(multiplePages, 2).wordState, wordStates.known)
assert.equal(multiplePages.sessions[0]!.entries.length, 3)
const unlimitedNatural = refresh(data).selectNextActiveSessionCandidatePage([], later)
assert.equal(unlimitedNatural.activeSession, undefined)
assert.equal(unlimitedNatural.sessions[0]!.toData().endReason, sessionEndReasons.allWordsCompleted)
assert.equal(record(unlimitedNatural).learningScore, 10)
assert.equal(record(unlimitedNatural, 1).wordState, wordStates.learning)
assert.deepEqual(record(unlimitedNatural).learningStatistics, { cardShows: 8, correctAssessments: 5, incorrectAssessments: 2 })
const replaced = persisted.endActiveSession(later).startSession(Session.start(sessionId('replacement'), sessionTypes.learning, unlimitedSettings, [ids[0]!], later))
assert.equal(replaced.sessions.length, 1)
assert.equal(replaced.activeSession!.id, 'replacement')
assert.equal(record(replaced).learningScore, 0)

// Five immediate correct entries earn the day; later corrections cannot revoke it.
data = start(5)
for (let index = 0; index < 5; index += 1) {
  data = showAndReveal(data, index).assessActiveSessionEntry(index, recallSelfAssessments.correct, now)
}
assert.equal(data.activeSession!.isComplete, true)
assert.equal(data.dailyStreakHistory.days.find((day) => day.utcDate === now.slice(0, 10))?.status, dailyStreakDayStatuses.valid)
data = data.assessActiveSessionEntry(0, recallSelfAssessments.incorrect, later)
assert.equal(refresh(data).dailyStreakHistory.days.find((day) => day.utcDate === now.slice(0, 10))?.status, dailyStreakDayStatuses.valid)

// Preferences accept only whole-number thresholds, and older data defaults to four.
assert.equal(Preferences.createEmpty().learningScoreThreshold, 4)
assert.equal(Preferences.fromData({ interfaceLanguage: 'en' }).learningScoreThreshold, 4)
for (const invalid of [0, -1, 21, 1.5, NaN, Infinity, '4', null]) {
  assert.equal(Preferences.fromData({ interfaceLanguage: 'en', learningScoreThreshold: invalid as number }).learningScoreThreshold, 4)
  assert.throws(() => Preferences.createEmpty().withLearningScoreThreshold(invalid as number), /whole-number/)
}
for (let threshold = 1; threshold <= 20; threshold += 1) {
  const preferences = Preferences.createEmpty().withLearningScoreThreshold(threshold)
  assert.equal(Preferences.fromData(JSON.parse(JSON.stringify(preferences.toData()))).learningScoreThreshold, threshold)
}

// The final threshold controls all end paths, including answers made before it changed.
for (const unlimited of [false, true]) {
  for (const manualEnd of [false, true]) {
    for (const [atAnswer, atEnd, expected] of [[10, 4, wordStates.known], [4, 10, wordStates.learning], [1, 20, wordStates.learning], [20, 1, wordStates.known]] as const) {
      let initial = start().withVocabularyLearningRecord(VocabularyLearningRecord.fromData({ ...baselineRecord.toData(), learningScore: 3 }))
      initial = initial.withPreferences(initial.preferences.withLearningScoreThreshold(atAnswer))
      if (unlimited) {
        const initialData = initial.toData()
        initialData.activeSession = Session.start(sessionId('threshold-unlimited'), sessionTypes.learning, unlimitedSettings, [ids[0]!], now).toData()
        initial = LearningData.fromData(initialData).showActiveSessionCandidate(ids[0]!, now).revealActiveSessionEntry(0, now)
      } else {
        initial = showAndReveal(initial)
      }
      const answered = initial.assessActiveSessionEntry(0, recallSelfAssessments.correct, now)
      const changed = refresh(answered.withPreferences(answered.preferences.withLearningScoreThreshold(atEnd)))
      assert.equal(record(changed).learningScore, 3)
      assert.equal(record(changed).wordState, wordStates.learning)
      assert.equal(changed.activeSession!.entryAt(0).transition, undefined)
      assert.deepEqual(changed.activeSession!.toData(), refresh(answered).activeSession!.toData())
      const ended = manualEnd ? changed.endActiveSession(later) : unlimited ? changed.selectNextActiveSessionCandidatePage([], later) : changed.completeActiveSession(later)
      assert.equal(record(ended).learningScore, 4)
      assert.equal(record(ended).wordState, expected)
      assert.deepEqual(record(ended).learningStatistics, record(changed).learningStatistics)
      assert.equal(ended.sessions[0]!.entryAt(0).transition!.afterWordState, expected)
      assert.equal(ended.sessions[0]!.entryAt(0).transition!.afterLearningScore, 4)
      assert.equal(ended.sessions[0]!.entryAt(0).baseline, undefined)
      const history = refresh(ended).sessions[0]!.toData()
      assert.deepEqual(refresh(ended.withPreferences(ended.preferences.withLearningScoreThreshold(atAnswer))).sessions[0]!.toData(), history)
    }
  }
}

// Manual choices replace recalled answers without applying automatic promotion or resetting early.
for (const state of Object.values(wordStates)) {
  let pending = showAndReveal(start()).assessActiveSessionEntry(0, recallSelfAssessments.correct, now)
  pending = refresh(pending.manuallySetActiveSessionEntryWordState(0, state, later))
  assert.equal(record(pending).wordState, wordStates.learning)
  assert.equal(record(pending).learningScore, 9)
  assert.equal(pending.activeSession!.entryAt(0).selfAssessment, undefined)
  assert.equal(pending.activeSession!.entryAt(0).transition, undefined)
  const ended = pending.completeActiveSession(later)
  assert.equal(record(ended).wordState, state)
  assert.equal(record(ended).learningScore, state === wordStates.new ? 0 : 9)
  assert.deepEqual(record(ended).learningStatistics, { ...baselineStatistics, cardShows: 8 })
}

// Explicit Knowledge-check Learning and unanswered words do not promote at threshold one.
let classified = start(1, sessionTypes.knowledgeCheck).withVocabularyLearningRecord(VocabularyLearningRecord.createNew(ids[0]!))
classified = classified.withPreferences(classified.preferences.withLearningScoreThreshold(1))
classified = showAndReveal(classified).assessActiveSessionEntry(0, wordStates.learning, now).completeActiveSession(later)
assert.equal(record(classified).wordState, wordStates.learning)
assert.equal(record(classified).learningScore, 1)
const untouched = showAndReveal(start()).withPreferences(Preferences.createEmpty().withLearningScoreThreshold(1)).endActiveSession(later)
assert.equal(record(untouched).wordState, wordStates.learning)
assert.equal(record(untouched).learningScore, 9)

// Earlier Active sessions with calculated transitions migrate to choices and baselines.
for (const deferredOutcomes of [undefined, true]) {
  const oldData = persisted.toData()
  const oldEntry = oldData.activeSession!.entries[0]!
  delete oldEntry.baseline
  oldEntry.transition = {
    beforeWordState: wordStates.learning, beforeLearningScore: 9,
    afterWordState: wordStates.learning, afterLearningScore: 0,
  }
  oldData.activeSession!.deferredOutcomes = deferredOutcomes
  oldData.vocabularyLearningRecords[0]!.learningScore = deferredOutcomes ? 9 : 0
  data = refresh(LearningData.fromData(oldData))
  assert.equal(record(data).learningScore, 9)
  assert.equal(data.activeSession!.entryAt(0).transition, undefined)
  assert.equal(data.activeSession!.entryAt(0).baseline!.learningStatistics, undefined)
  data = refresh(data.assessActiveSessionEntry(0, recallSelfAssessments.correct, later))
  assert.equal(data.activeSession!.entryAt(0).transition, undefined)
  const oldEnded = data.completeActiveSession(later)
  assert.equal(record(oldEnded).learningScore, 10)
  assert.deepEqual(record(oldEnded).learningStatistics, { cardShows: 8, correctAssessments: 5, incorrectAssessments: 2 })
  assert.equal(oldEnded.sessions[0]!.entryAt(0).transition!.beforeLearningStatistics, undefined)
  assert.equal(oldEnded.sessions[0]!.entryAt(0).transition!.afterLearningStatistics, undefined)
  const historicalData = oldEnded.toData()
  delete historicalData.sessions[0]!.deferredOutcomes
  const oldHistory = refresh(LearningData.fromData(historicalData))
  assert.deepEqual(oldHistory.sessions[0]!.entryAt(0).toData(), refresh(oldEnded).sessions[0]!.entryAt(0).toData())
  assert.equal(record(oldHistory).learningScore, 10)
}
// A deferred legacy snapshot is never used as the result, even without a new answer.
const oldDeferred = showAndReveal(start()).assessActiveSessionEntry(0, recallSelfAssessments.correct, now).toData()
delete oldDeferred.activeSession!.entries[0]!.baseline
oldDeferred.activeSession!.entries[0]!.transition = {
  beforeWordState: wordStates.learning, beforeLearningScore: 9,
  afterWordState: wordStates.known, afterLearningScore: 999,
}
oldDeferred.preferences.learningScoreThreshold = 20
const migratedDeferred = refresh(LearningData.fromData(oldDeferred)).completeActiveSession(later)
assert.equal(record(migratedDeferred).wordState, wordStates.learning)
assert.equal(record(migratedDeferred).learningScore, 10)
assert.equal(migratedDeferred.sessions[0]!.entryAt(0).transition!.afterLearningScore, 10)

// Entries without any older snapshot still apply their saved choice at completion.
const oldUnanswered = showAndReveal(start()).toData()
delete oldUnanswered.activeSession!.deferredOutcomes
delete oldUnanswered.activeSession!.entries[0]!.baseline
const oldAnswered = LearningData.fromData(oldUnanswered).assessActiveSessionEntry(0, recallSelfAssessments.correct, now)
assert.equal(oldAnswered.activeSession!.entryAt(0).transition, undefined)
const oldFinished = oldAnswered.completeActiveSession(later)
assert.equal(record(oldFinished).learningScore, 10)
assert.equal(oldFinished.sessions[0]!.entryAt(0).transition!.beforeLearningStatistics, undefined)
assert.equal(oldFinished.sessions[0]!.entryAt(0).transition!.afterLearningStatistics, undefined)

console.log('Session outcomes verification passed: saved choices, corrections, manual actions, persistence, finalization, history, legacy data, and streaks.')
