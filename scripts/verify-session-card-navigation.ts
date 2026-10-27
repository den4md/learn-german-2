import assert from 'node:assert/strict'
import { sessionCardIndex, sessionCardRoute } from '../src/app/session-card-navigation'
import { sessionTypes, wordStates } from '../src/domain/constants'
import { sessionId, vocabularyItemId } from '../src/domain/identifiers'
import { LearningData } from '../src/domain/learning-data'
import { Session, SessionSettings } from '../src/domain/session'

const now = '2026-10-27T12:00:00.000Z'
const ids = Array.from({ length: 12 }, (_, index) => vocabularyItemId(index + 1))
const settings = SessionSettings.fromData({ ...SessionSettings.createDefault().toData(), itemLimit: 3 })
let data = LearningData.createEmpty().startSession(Session.start(sessionId('cards'), sessionTypes.knowledgeCheck, settings, ids, now))
const active = () => data.activeSession!
const answer = (index: number) => { data = data.showActiveSessionEntry(index, now).revealActiveSessionEntry(index, now).assessActiveSessionEntry(index, wordStates.known, now) }
const refresh = () => { data = LearningData.fromData(JSON.parse(JSON.stringify(data.toData()))) }

// Next skips without answering; the final answer wraps to the first unanswered card.
assert.equal(active().nextEntryIndexAfter(0), 1)
assert.equal(active().entryAt(0).isCompleted, false)
answer(1)
assert.equal(active().toData().currentEntryIndex, 2)
answer(2)
assert.equal(active().toData().currentEntryIndex, 0)
assert.equal(active().entryAt(0).isCompleted, false)
answer(0)
assert.equal(active().toData().currentEntryIndex, 1)
assert.equal(active().isComplete, true)

// Corrections advance to an already completed neighbour, preserving its reveal state.
data = data.assessActiveSessionEntry(0, wordStates.learning, now)
assert.equal(active().toData().currentEntryIndex, 1)
assert.equal(active().entryAt(1).isCompleted, true)
assert.equal(active().entryAt(1).revealedAt, now)
const shows = data.vocabularyLearningRecords.map((record) => record.learningStatistics.cardShows)
for (const index of [0, 2, 1, 0]) {
  const url = new URL(sessionCardRoute(active(), index), 'https://example.test')
  data = data.showActiveSessionEntry(sessionCardIndex(active(), url.search), now)
  refresh()
  assert.equal(sessionCardIndex(active(), url.search), index)
  assert.equal(active().toData().currentEntryIndex, index)
}
assert.deepEqual(data.vocabularyLearningRecords.map((record) => record.learningStatistics.cardShows), shows)
const finishRoute = sessionCardRoute(active(), active().nextEntryIndexAfter(2))
assert.equal(new URL(finishRoute, 'https://example.test').searchParams.get('card'), 'finish')
assert.equal(sessionCardIndex(active(), '?card=finish'), 3)
for (const invalid of ['-1', '0', 'NaN', '99999999999999999', '900', '1.1']) assert.equal(sessionCardIndex(active(), `?card=${invalid}`), 3)

// Finish cannot skip unanswered entries; invalid routes return to an unanswered card.
const unfinished = LearningData.createEmpty().startSession(Session.start(sessionId('unfinished'), sessionTypes.knowledgeCheck, settings, ids, now)).activeSession!
assert.equal(sessionCardIndex(unfinished, '?card=finish'), 0)
assert.equal(sessionCardIndex(unfinished, '?card=300'), 0)

// An Unlimited page can be reviewed, but skipping does not load a new page.
data = LearningData.createEmpty().startSession(Session.start(sessionId('unlimited'), sessionTypes.knowledgeCheck, SessionSettings.createDefault(), ids, now))
for (let index = 0; index < 10; index++) {
  assert.equal(sessionCardIndex(active(), `?card=${index + 1}`), index)
  data = data.showActiveSessionCandidate(ids[index]!, now)
  if (index > 0) answer(index)
}
assert.equal(active().nextEntryIndexAfter(9), 0)
assert.equal(sessionCardIndex(active(), '?card=11'), 0)
assert.throws(() => data.selectNextActiveSessionCandidatePage(ids.slice(10), now), /Complete the current/)
answer(0)
assert.equal(active().toData().currentEntryIndex, 1)
assert.equal(active().nextEntryIndexAfter(9), 10)
data = data.selectNextActiveSessionCandidatePage(ids.slice(10), now)
assert.equal(sessionCardIndex(active(), '?card=11'), 10)
assert.equal(sessionCardIndex(active(), '?card=1'), 0)
data = data.showActiveSessionEntry(0, now)
assert.equal(active().nextEntryIndexAfter(0), 1)
assert.equal(active().candidateVocabularyItemIds.length, 2)

const ended = data.endActiveSession(now)
assert.equal(ended.activeSession, undefined)
assert.throws(() => ended.assessActiveSessionEntry(0, wordStates.learning, now), /no Active session/)
console.log('Session card navigation verification passed: skip, wrap, correction order, URL positions, refresh, show counts, finishing, Unlimited page guards, and ended-session protection.')
