import assert from 'node:assert/strict'
import { SessionFinishingCountdown } from '../src/app/session-finishing-countdown'
import { interfaceLanguages } from '../src/domain/constants'
import { LearningData } from '../src/domain/learning-data'
import { sessionId, vocabularyItemId } from '../src/domain/identifiers'
import { Session, SessionSettings } from '../src/domain/session'
import { sessionTypes, wordStates } from '../src/domain/constants'
import { Preferences, sessionFinishDelays } from '../src/domain/preferences'
import type { SessionFinishDelaySeconds } from '../src/domain/preferences'

assert.equal(Preferences.createEmpty().sessionFinishDelaySeconds, 5)
assert.equal(Preferences.fromData({ interfaceLanguage: interfaceLanguages.russian }).sessionFinishDelaySeconds, 5)
assert.equal(Preferences.fromData({ interfaceLanguage: interfaceLanguages.english, sessionFinishDelaySeconds: 999 as SessionFinishDelaySeconds }).sessionFinishDelaySeconds, 5)
assert.throws(() => Preferences.createEmpty().withSessionFinishDelaySeconds(-1 as SessionFinishDelaySeconds), /supported/)

for (const seconds of sessionFinishDelays) {
  const preferences = Preferences.createEmpty().withSessionFinishDelaySeconds(seconds).withInterfaceLanguage(interfaceLanguages.russian)
  const data = LearningData.fromData(JSON.parse(JSON.stringify(LearningData.createEmpty().withPreferences(preferences).toData())))
  assert.equal(data.preferences.sessionFinishDelaySeconds, seconds)
  assert.equal(data.preferences.interfaceLanguage, interfaceLanguages.russian)
  assert.deepEqual(Object.keys(data.preferences.toData()).sort(), ['interfaceLanguage', 'sessionFinishDelaySeconds'])

  const duration = seconds * 1000
  const countdown = new SessionFinishingCountdown(duration)
  assert.equal(countdown.remainingAt(10000), duration)
  countdown.resume(10000)
  countdown.resume(10001)
  const used = duration / 2
  assert.equal(countdown.remainingAt(10000 + used), duration - used)
  countdown.pause(10000 + used)
  assert.equal(countdown.remainingAt(90000), duration - used)
  countdown.pause(90000)
  countdown.resume(90000)
  assert.equal(countdown.remainingAt(90000 + duration), 0)
  countdown.pause(90000 + duration)
  assert.equal(countdown.remainingAt(999999), 0)

  // Reviewing a card or refreshing creates a full wait; pausing never resets it.
  countdown.reset()
  assert.equal(countdown.remainingAt(999999), duration)
  const refreshed = new SessionFinishingCountdown(data.preferences.sessionFinishDelaySeconds * 1000)
  assert.equal(refreshed.remainingAt(999999), duration)
}

const now = '2026-10-27T12:00:00.000Z'
const settings = SessionSettings.fromData({ ...SessionSettings.createDefault().toData(), itemLimit: 1 })
let sessionData = LearningData.createEmpty().startSession(Session.start(sessionId('finishing'), sessionTypes.knowledgeCheck, settings, [vocabularyItemId(1)], now))
assert.throws(() => sessionData.selectActiveSessionFinishingPosition(now), /fully answered/)
sessionData = sessionData.showActiveSessionEntry(0, now).revealActiveSessionEntry(0, now).assessActiveSessionEntry(0, wordStates.known, now)
sessionData = sessionData.showActiveSessionEntry(0, now).selectActiveSessionFinishingPosition(now)
sessionData = LearningData.fromData(JSON.parse(JSON.stringify(sessionData.toData())))
assert.equal(sessionData.activeSession!.toData().currentEntryIndex, 1)
assert.equal(sessionData.vocabularyLearningRecords[0]!.learningStatistics.cardShows, 1)

console.log('Session finishing verification passed: all four preferences, legacy defaults, persistence, pause/resume, expiry, review/refresh reset, and saved finishing position.')
