import assert from 'node:assert/strict'
import { Pronunciation } from '../src/app/pronunciation'
import type { SpeechPlayback } from '../src/app/pronunciation'
import { BrowserSpeechPlayback } from '../src/app/browser-speech-playback'
import { Preferences, defaultPronunciationRates } from '../src/domain/preferences'

class TestSpeech implements SpeechPlayback {
  available = true
  requests: Array<{ text: string; rate: number; started(): void; finished(): void }> = []
  cancellations = 0
  subscribe() { return () => {} }
  cancel() { this.cancellations += 1 }
  speak(text: string, rate: number, started: () => void, finished: () => void) {
    this.requests.push({ text, rate, started, finished })
  }
}

const speech = new TestSpeech()
let playing: string | undefined
const player = new Pronunciation(speech, (text) => { playing = text })
function play(text: string) {
  player.play(text, defaultPronunciationRates)
  speech.requests.at(-1)!.started()
}
for (const text of ['das Haus', 'das Haus', 'das Haus', 'die Straße', 'das Haus']) play(text)
assert.deepEqual(speech.requests.map((request) => request.rate), [1, 0.8, 1, 1, 1])
play('die Häuser')
play('das Haus')
assert.equal(speech.requests.at(-1)!.rate, 1)
player.play('das Haus', { normal: 1.2, slow: 0.7 })
assert.equal(speech.requests.at(-1)!.rate, 0.7)
speech.requests.at(-1)!.started()
player.stop()
assert.equal(playing, undefined)
// A different page gets a new controller; aborted asynchronous callbacks cannot revive playback.
const oldRequest = speech.requests.at(-1)!
oldRequest.started()
assert.equal(playing, undefined)
const nextPage = new Pronunciation(speech, (text) => { playing = text })
nextPage.play('das Haus', defaultPronunciationRates)
assert.equal(speech.requests.at(-1)!.rate, 1)
speech.requests.at(-1)!.finished()
nextPage.play('das Haus', defaultPronunciationRates)
assert.equal(speech.requests.at(-1)!.rate, 1, 'A failure before start must not advance the sequence')
speech.requests.at(-1)!.started()
nextPage.play('das Haus', defaultPronunciationRates)
assert.equal(speech.requests.at(-1)!.rate, 0.8, 'An interrupted started utterance counts')
speech.available = false
const count = speech.requests.length
nextPage.play('das Haus', defaultPronunciationRates)
assert.equal(speech.requests.length, count)
speech.available = true
nextPage.play('   ', defaultPronunciationRates)
assert.equal(speech.requests.length, count)
nextPage.reset()
nextPage.play('das Haus', defaultPronunciationRates)
assert.equal(speech.requests.at(-1)!.rate, 1, 'Editing the current word resets its page sequence')

const defaults = Preferences.createEmpty().pronunciationRates
assert.deepEqual(defaults, { normal: 1, slow: 0.8 })
defaults.normal = 9
assert.deepEqual(Preferences.createEmpty().pronunciationRates, defaultPronunciationRates)
for (const rates of [{ normal: 2, slow: 0.5 }, { normal: 0.6, slow: 0.5 }, { normal: 1.2, slow: 1.1 }]) {
  const preferences = Preferences.createEmpty().withPronunciationRates(rates)
  rates.normal = 99
  const stored = preferences.toData()
  const restored = Preferences.fromData(JSON.parse(JSON.stringify(stored)))
  assert.deepEqual(restored.pronunciationRates, stored.pronunciationRates)
  stored.pronunciationRates!.normal = 99
  assert.notEqual(preferences.pronunciationRates.normal, 99)
}
for (const invalid of [null, {}, { normal: '1', slow: 0.8 }, { normal: 1, slow: 1 }, { normal: 0.4, slow: 0.3 }, { normal: 2.1, slow: 0.8 }, { normal: 1, slow: 0.85 }, { normal: NaN, slow: 0.5 }]) {
  const rates = invalid as typeof defaultPronunciationRates
  assert.throws(() => Preferences.createEmpty().withPronunciationRates(rates))
  assert.deepEqual(Preferences.fromData({ interfaceLanguage: 'en', pronunciationRates: rates }).pronunciationRates, defaultPronunciationRates)
}

// Exercise the browser boundary with an injected synthesis engine and real callback ordering.
class Synthesis extends EventTarget {
  voices = [{ lang: 'en-US', default: true }, { lang: 'de-AT', default: true }, { lang: 'de-DE', default: false }]
  utterances: SpeechSynthesisUtterance[] = []
  cancelled = 0
  getVoices() { return this.voices }
  speak(utterance: SpeechSynthesisUtterance) { this.utterances.push(utterance) }
  cancel() { this.cancelled += 1 }
}
const synthesis = new Synthesis()
const adapter = new BrowserSpeechPlayback(synthesis as unknown as SpeechSynthesis, (text) => ({ text }) as SpeechSynthesisUtterance)
assert.equal(adapter.available, true)
let voicesChanged = 0
const unsubscribe = adapter.subscribe(() => { voicesChanged += 1 })
synthesis.dispatchEvent(new Event('voiceschanged'))
unsubscribe()
synthesis.dispatchEvent(new Event('voiceschanged'))
assert.equal(voicesChanged, 1)
let started = 0
let finished = 0
adapter.speak('sich freuen', 0.8, () => { started += 1 }, () => { finished += 1 })
const utterance = synthesis.utterances[0]!
assert.equal(utterance.text, 'sich freuen')
assert.equal(utterance.voice!.lang, 'de-DE')
assert.equal(utterance.lang, 'de-DE')
assert.equal(utterance.rate, 0.8)
utterance.onstart!({} as SpeechSynthesisEvent)
assert.equal(started, 1)
adapter.cancel()
utterance.onstart!({} as SpeechSynthesisEvent)
utterance.onend!({} as SpeechSynthesisEvent)
assert.equal(started, 1)
assert.equal(finished, 0)
assert.equal(synthesis.cancelled, 1)
const originalError = console.error
const errors: unknown[][] = []
console.error = (...args) => errors.push(args)
try {
  adapter.speak('das Haus', 1, () => {}, () => { finished += 1 })
  synthesis.utterances.at(-1)!.onerror!({ error: 'network' } as SpeechSynthesisErrorEvent)
  assert.equal(finished, 1)
  assert.equal(errors.length, 1)
} finally {
  console.error = originalError
}
synthesis.voices = [{ lang: 'en-US', default: true }]
assert.equal(adapter.available, false)
adapter.speak('das Haus', 1, () => {}, () => {})
assert.equal(synthesis.utterances.length, 2)
assert.equal(new BrowserSpeechPlayback(undefined).available, false)

console.log('Pronunciation verification passed: sequential alternation, interruption, failed starts, page reset, German voice selection, events, errors, and saved rate validation.')
