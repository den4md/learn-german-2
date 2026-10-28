import assert from 'node:assert/strict'
import { AppNavigation } from '../src/app/navigation'
import { vocabularyItemId } from '../src/domain/identifiers'

function createBrowser() {
  const events = new EventTarget()
  let location = new URL('https://example.test/learn-german-2/progression')
  const entries: Array<{ url: URL; state: unknown }> = [{ url: location, state: null }]
  let position = 0
  const history = {
    get state() { return entries[position]!.state },
    get length() { return entries.length },
    replaceState(state: unknown, _title: string, url?: string) {
      location = url === undefined ? location : new URL(url, location)
      entries[position] = { url: location, state: structuredClone(state) }
    },
    pushState(state: unknown, _title: string, url: string) {
      location = new URL(url, location)
      entries.splice(++position, entries.length, { url: location, state: structuredClone(state) })
    },
    go(distance: number) {
      const nextPosition = position + distance
      if (nextPosition < 0 || nextPosition >= entries.length) return
      queueMicrotask(() => {
        position = nextPosition
        location = entries[position]!.url
        events.dispatchEvent(new Event('popstate'))
      })
    },
  }
  const browser = {
    get location() { return location },
    history,
    crypto: globalThis.crypto,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    confirm() { throw new Error('Native browser confirmation must never be called.') },
  } as unknown as Window
  return { browser, events }
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve))
const { browser, events } = createBrowser()
const navigation = new AppNavigation(browser, '/learn-german-2/')
const questions: Array<{ message: string; resolve(accepted: boolean): void }> = []
const visited: string[] = []
const disconnect = navigation.connect(
  (location) => visited.push(`${location.path}${location.search}${location.hash}`),
  (message) => new Promise((resolve) => questions.push({ message, resolve })),
)

function answer(accepted: boolean) {
  assert.equal(questions.length, 1)
  questions.shift()!.resolve(accepted)
}

function assertUnloadProtection(expected: boolean) {
  const event = new Event('beforeunload', { cancelable: true })
  events.dispatchEvent(event)
  assert.equal(event.defaultPrevented, expected)
}

const initialNavigation = navigation.navigate('/vocabulary?q=Haus&state=learning#results')
assert.equal(navigation.href, '/vocabulary?q=Haus&state=learning#results')
await initialNavigation
navigation.openVocabularyItemEdit(vocabularyItemId(-1))
await flush()
const editor = '/vocabulary/-1/edit'
assert.equal(navigation.href, editor)
assert.equal(navigation.location.vocabularyEditReturnPath, '/vocabulary?q=Haus&state=learning#results')
navigation.setUnsavedChanges(true, 'Discard the draft?')
assertUnloadProtection(true)

// App navigation waits for the answer; cancelling keeps the editor and dirty flag.
let requested = navigation.navigate('/settings')
await flush()
assert.equal(questions[0]!.message, 'Discard the draft?')
assert.equal(navigation.href, editor)
assert.equal(browser.location.pathname, `/learn-german-2${editor}`)
answer(false)
assert.equal(await requested, false)
assertUnloadProtection(true)

// Back restores the source entry before asking, without unmounting the editor.
const visitCount = visited.length
browser.history.go(-1)
await flush()
assert.equal(navigation.href, editor)
assert.equal(browser.location.pathname, `/learn-german-2${editor}`)
assert.equal(visited.length, visitCount)
answer(false)
await flush()
assert.equal(navigation.href, editor)
assert.equal(visited.length, visitCount)
browser.history.go(-1)
await flush()
answer(true)
await flush()
assert.equal(navigation.href, '/vocabulary?q=Haus&state=learning#results')
assert.equal(visited.length, visitCount + 1)
assertUnloadProtection(false)

// Forward has the same cancellation and replay behavior, with return metadata intact.
navigation.setUnsavedChanges(true, 'Discard the draft?')
browser.history.go(1)
await flush()
assert.equal(navigation.href, '/vocabulary?q=Haus&state=learning#results')
answer(false)
await flush()
browser.history.go(1)
await flush()
answer(true)
await flush()
assert.equal(navigation.href, editor)
assert.equal(navigation.location.vocabularyEditReturnPath, '/vocabulary?q=Haus&state=learning#results')

// A second navigation cannot replace the pending destination or show another popup.
navigation.setUnsavedChanges(true, 'Discard the draft?')
requested = navigation.navigate('/settings')
await flush()
assert.equal(await navigation.navigate('/sessions'), false)
assert.equal(questions.length, 1)
browser.history.go(-1)
answer(true)
assert.equal(await requested, true)
await flush()
assert.equal(navigation.href, '/settings')
assert.equal(questions.length, 0)
assertUnloadProtection(false)

// During a save, both kinds of navigation are blocked and beforeunload stays protected.
await navigation.navigate(editor)
navigation.setSaving(true)
assertUnloadProtection(true)
assert.equal(await navigation.navigate('/settings'), false)
browser.history.go(-1)
await flush()
assert.equal(navigation.href, editor)
assert.equal(browser.location.pathname, `/learn-german-2${editor}`)
assert.equal(questions.length, 0)
navigation.setSaving(false)
assertUnloadProtection(false)

// Same-view fragments do not discard drafts; older untracked entries restore safely.
navigation.setUnsavedChanges(true, 'Discard the draft?')
browser.history.pushState(null, '', `/learn-german-2${editor}#main-content`)
events.dispatchEvent(new Event('popstate'))
assert.equal(navigation.href, `${editor}#main-content`)
assert.equal(questions.length, 0)
assertUnloadProtection(true)
browser.history.pushState(null, '', '/learn-german-2/settings')
events.dispatchEvent(new Event('popstate'))
await flush()
assert.equal(navigation.href, `${editor}#main-content`)
answer(false)
await flush()
browser.history.pushState(null, '', '/learn-german-2/sessions?order=oldest')
events.dispatchEvent(new Event('popstate'))
await flush()
answer(true)
await flush()
assert.equal(navigation.href, '/sessions?order=oldest')
assertUnloadProtection(false)

// The editor round trip must keep the entire parent route, including after refresh.
for (const returnPath of ['/sessions?type=learning&order=oldest&page=2#results', '/progression', undefined]) {
  const detailsPath = '/sessions/recorded-session'
  await navigation.navigate(detailsPath, false, undefined, returnPath)
  navigation.openVocabularyItemEdit(vocabularyItemId(-1))
  assert.equal(navigation.location.vocabularyEditReturnPath, detailsPath)
  assert.equal(navigation.location.sessionDetailsReturnPath, returnPath)
  const refreshed = new AppNavigation(browser, '/learn-german-2/')
  assert.equal(refreshed.location.sessionDetailsReturnPath, returnPath)
  await navigation.navigate(navigation.location.vocabularyEditReturnPath!, false, undefined, navigation.location.sessionDetailsReturnPath)
  assert.equal(navigation.href, detailsPath)
  assert.equal(navigation.location.sessionDetailsReturnPath, returnPath)
  await navigation.navigate(navigation.location.sessionDetailsReturnPath ?? '/progression')
  assert.equal(navigation.href, returnPath ?? '/progression')
}

disconnect()

console.log('Popup navigation verification passed: cancellation, Back/Forward, destination replay, concurrent navigation, saving, fragments, unload protection, and Session-details editor return routes.')
