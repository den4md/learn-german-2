import assert from 'node:assert/strict'
import { selectSessionVocabularyItemIds } from '../src/app/select-session-vocabulary-item-ids'
import { favouriteStatusFilters, sessionTypes, wordStates } from '../src/domain/constants'
import { sessionId, vocabularyItemId } from '../src/domain/identifiers'
import { LearningData } from '../src/domain/learning-data'
import { Session, SessionSettings } from '../src/domain/session'
import { DefaultVocabularySet, VocabularyItem, VocabularyLearningRecord } from '../src/domain/vocabulary'

const now = '2026-10-27T12:00:00.000Z'
const ids = Array.from({ length: 15 }, (_, index) => vocabularyItemId(index + 1))
const vocabulary = DefaultVocabularySet.fromItems(ids.map((id) => VocabularyItem.fromData({ id, level: 'A1', positive: `Wort${String(id).padStart(2, '0')}`, translations: ['слово'] })))
const settings = SessionSettings.fromData({ ...SessionSettings.createDefault().toData(), favouriteStatusFilter: favouriteStatusFilters.favourites })
let initial = LearningData.createEmpty()
for (const id of ids) initial = initial.withVocabularyItemFavouriteStatus(id, true)
const eligible = (data: LearningData) => selectSessionVocabularyItemIds(data, vocabulary, sessionTypes.knowledgeCheck, settings.toData())
const refresh = (data: LearningData) => LearningData.fromData(JSON.parse(JSON.stringify(data.toData())))

let data = initial.startSession(Session.start(sessionId('selected'), sessionTypes.knowledgeCheck, settings, eligible(initial), now))
assert.equal(data.activeSession!.toData().totalItemCount, 15)
assert.equal(data.activeSession!.candidateVocabularyItemIds.length, 10)
assert.throws(() => data.selectNextActiveSessionCandidatePage(ids.slice(10), now), /Complete the current/)
for (const id of ids.slice(0, 10)) {
  assert.equal(data.isVocabularyItemWordStateLocked(id), true)
  assert.throws(() => data.withManualWordState(id, wordStates.excluded), /locked/)
}
assert.equal(data.isVocabularyItemWordStateLocked(ids[10]!), false)
data = data.withManualWordState(ids[10]!, wordStates.excluded)
assert.equal(eligible(data).length, 14)

// Shown and unshown selections survive filter changes and persistence.
data = data.showActiveSessionCandidate(ids[0]!, now)
data = data.withVocabularyItemFavouriteStatus(ids[0]!, false).withVocabularyItemFavouriteStatus(ids[1]!, false)
data = refresh(data.withVocabularyItemTranslations(ids[0]!, ['изменено']).withManualWordState(ids[0]!, wordStates.new))
assert.equal(data.activeSession!.toData().totalItemCount, 15)
assert.equal(data.activeSession!.candidateVocabularyItemIds.includes(ids[1]!), true)
assert.equal(data.isVocabularyItemWordStateLocked(ids[0]!), true)
assert.equal(data.isVocabularyItemWordStateLocked(ids[1]!), true)
assert.deepEqual(data.vocabularyLearningRecords.find((record) => record.vocabularyItemId === ids[0])!.toData().translations, ['изменено'])

// Loaded Excluded data cannot silently remove an existing selection.
data = refresh(data.withVocabularyLearningRecord(VocabularyLearningRecord.createNew(ids[1]!).withWordState(wordStates.excluded)))
assert.equal(data.activeSession!.candidateVocabularyItemIds.includes(ids[1]!), true)
for (const [index, id] of ids.slice(0, 10).entries()) {
  if (index !== 0) data = data.showActiveSessionCandidate(id, now)
  data = data.revealActiveSessionEntry(index, now).assessActiveSessionEntry(index, wordStates.known, now)
}
const presented = new Set(data.activeSession!.entries.map((entry) => entry.vocabularyItemId))
const nextIds = eligible(data).filter((id) => !presented.has(id))
assert.deepEqual(nextIds, ids.slice(11))
assert.throws(() => data.selectNextActiveSessionCandidatePage([ids[0]!], now), /already presented/)
data = refresh(data.selectNextActiveSessionCandidatePage(nextIds, now))
assert.equal(data.activeSession!.toData().totalItemCount, 14)
assert.equal(data.activeSession!.entries.length, 10)
assert.deepEqual(data.activeSession!.candidateVocabularyItemIds, ids.slice(11))
assert.equal(data.isVocabularyItemWordStateLocked(ids[0]!), true)
assert.equal(data.isVocabularyItemWordStateLocked(ids[11]!), true)
assert.equal(data.isVocabularyItemWordStateLocked(ids[10]!), false)
const ended = data.endActiveSession(now)
for (const id of ids) assert.equal(ended.isVocabularyItemWordStateLocked(id), false)
assert.doesNotThrow(() => ended.withManualWordState(ids[0]!, wordStates.excluded))

// Limited locks include every unshown entry, and retain the selected total.
const limitedSettings = SessionSettings.fromData({ ...settings.toData(), itemLimit: 3 })
data = initial.startSession(Session.start(sessionId('limited'), sessionTypes.knowledgeCheck, limitedSettings, ids, now))
for (const id of ids.slice(0, 3)) assert.throws(() => data.withManualWordState(id, wordStates.excluded), /locked/)
assert.doesNotThrow(() => data.withManualWordState(ids[3]!, wordStates.excluded))
data = data.showActiveSessionEntry(0, now).revealActiveSessionEntry(0, now).manuallySetActiveSessionEntryWordState(0, wordStates.learning, now)
assert.equal(data.activeSession!.toData().selectedItemCount, 3)
assert.equal(data.activeSession!.entryAt(0).manualWordState, wordStates.learning)
assert.equal(data.activeSession!.entryAt(0).transition, undefined)
assert.equal(data.vocabularyLearningRecords.find((record) => record.vocabularyItemId === ids[0])!.wordState, wordStates.new)
assert.equal(data.endActiveSession(now).sessions[0]!.toData().selectedItemCount, 3)

console.log('Session selection verification passed: selected-word locks, filter changes, persistence, Excluded selections, portion totals, deferred actions, and unlock on end.')
