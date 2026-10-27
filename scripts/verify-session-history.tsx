import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppPopupProvider } from '../src/components/app-popup'
import { PopupMenuProvider } from '../src/components/popup-menu'
import { VocabularyItemRow } from '../src/components/vocabulary-item-row'
import { assessmentAccent } from '../src/components/assessment-accent'
import { recallSelfAssessments, wordStates } from '../src/domain/constants'
import { vocabularyItemId } from '../src/domain/identifiers'
import type { SessionEntryData } from '../src/domain/session'
import type { ResolvedVocabularyItemData } from '../src/domain/vocabulary'
import { InterfaceLanguageProvider } from '../src/i18n/interface-language-context'

const item: ResolvedVocabularyItemData = {
  id: vocabularyItemId(1), level: 'A1', positive: 'heutig', translations: ['текущий текст'],
  wordState: wordStates.known, learningScore: 8, isFavourite: true,
  learningStatistics: { cardShows: 99, correctAssessments: 88, incorrectAssessments: 77 },
}
const entry: SessionEntryData = {
  vocabularyItemId: item.id, shownAt: '2026-10-27T12:00:00.000Z', selfAssessment: wordStates.learning,
  transition: {
    beforeWordState: wordStates.new, beforeLearningScore: 0,
    beforeLearningStatistics: { cardShows: 0, correctAssessments: 0, incorrectAssessments: 0 },
    afterWordState: wordStates.learning, afterLearningScore: 1,
    afterLearningStatistics: { cardShows: 1, correctAssessments: 0, incorrectAssessments: 0 },
  },
}

function render(sessionEntry: SessionEntryData | undefined, currentItem = item, language: 'en' | 'de' | 'ru' = 'en') {
  return renderToStaticMarkup(<AppPopupProvider><PopupMenuProvider><InterfaceLanguageProvider interfaceLanguage={language} setInterfaceLanguage={() => {}}><ol><VocabularyItemRow item={currentItem} sessionEntry={sessionEntry} onChangeFavouriteStatus={() => {}} onChangeWordState={() => {}} onEditVocabularyItem={() => {}} /></ol></InterfaceLanguageProvider></PopupMenuProvider></AppPopupProvider>)
}

const historical = render(entry)
assert.match(historical, /Know, learn/)
assert.match(historical, /New → Learning/)
assert.match(historical, /0 → 1 \/ 10/)
assert.match(historical, /Shows<\/dt><dd[^>]*>0 → 1/)
assert.doesNotMatch(historical, /(?:99|88|77|8 \/ 10)/)
assert.match(historical, /Remove from favourites/)
assert.match(historical, /More actions/)
const changedCurrent = render(entry, { ...item, positive: 'anders', translations: ['изменено'], learningScore: 10, isFavourite: false })
assert.match(changedCurrent, /anders/)
assert.match(changedCurrent, /изменено/)
assert.match(changedCurrent, /Add to favourites/)
assert.match(changedCurrent, /New → Learning/)
assert.match(changedCurrent, /0 → 1 \/ 10/)

const unchanged = render({ ...entry, selfAssessment: recallSelfAssessments.correct, transition: { ...entry.transition!, beforeWordState: wordStates.learning, afterWordState: wordStates.learning, beforeLearningScore: 1 } })
assert.doesNotMatch(unchanged, /Learning → Learning|1 → 1 \/ 10/)
assert.match(unchanged, /recorded-assessment/)
const manual = render({ ...entry, selfAssessment: undefined, manualWordState: wordStates.known })
assert.match(manual, /Manual: Known/)
assert.match(manual, /data-accent="known"/)
const unanswered = render({ ...entry, selfAssessment: undefined })
assert.match(unanswered, /Not assessed/)
assert.match(unanswered, /Shows<\/dt><dd[^>]*>0 → 1/)

const old = render({ ...entry, transition: { ...entry.transition!, beforeLearningStatistics: undefined, afterLearningStatistics: undefined } })
assert.equal((old.match(/Not recorded/g) ?? []).length, 3)
assert.match(old, /New → Learning/)
assert.doesNotMatch(old, /99|88|77/)
assert.equal((render({ ...entry, transition: undefined }).match(/Not recorded/g) ?? []).length, 5)
assert.match(render(entry, item, 'de'), /Neu → Lernen/)
assert.match(render({ ...entry, transition: undefined }, item, 'ru'), /Не записано/)
assert.match(render(undefined), /8 \/ 10/)
assert.match(render(undefined), />99</)
for (const [assessment, accent] of [[wordStates.excluded, 'excluded'], [wordStates.new, 'unknown'], [recallSelfAssessments.incorrect, 'unknown'], [wordStates.learning, 'learning'], [recallSelfAssessments.correct, 'learning'], [wordStates.known, 'known']] as const) assert.equal(assessmentAccent(assessment), accent)

console.log('Session history verification passed: shared layout, decisions/colors, changed and unchanged values, unanswered/legacy entries, current text/actions, historical isolation, and localization.')
