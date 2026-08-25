import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import {
  cardSides,
  nounGenders,
  recallSelfAssessments,
  sessionTypes,
  wordStates,
} from '../src/domain/constants'
import { vocabularyItemId } from '../src/domain/identifiers'
import { SessionSettings } from '../src/domain/session'
import { VocabularyLearningRecord } from '../src/domain/vocabulary'

const settings = SessionSettings.createDefault().toData()

assert.deepEqual(settings.cefrLevels, ['A1', 'A2', 'B1', 'B2', 'C1'])
assert.deepEqual(settings.wordTypes, ['noun', 'adjective', 'verb'])
assert.equal(settings.firstCardSide, cardSides.german)
assert.equal(settings.firstCardSide, 'de')

const learningRecord = VocabularyLearningRecord.createNew(vocabularyItemId(1))
const learningAssessment = learningRecord.withSessionSelfAssessment(
  sessionTypes.knowledgeCheck,
  wordStates.learning,
)

assert.equal(learningAssessment.wordState, wordStates.learning)
assert.equal(learningAssessment.learningScore, 1)

const correctAssessment = learningAssessment.withSessionSelfAssessment(
  sessionTypes.learning,
  recallSelfAssessments.correct,
)

assert.equal(correctAssessment.wordState, wordStates.learning)
assert.equal(correctAssessment.learningScore, 2)

const vocabularyItemsDirectory = new URL('../src/default-vocabulary-set/vocabulary-items/', import.meta.url)
const defaultVocabularyNounGenders = new Set<string>()

for (const fileName of await readdir(vocabularyItemsDirectory)) {
  const items = JSON.parse(
    await readFile(new URL(fileName, vocabularyItemsDirectory), 'utf8'),
  ) as { gender?: string }[]

  for (const item of items) {
    if (item.gender !== undefined) {
      defaultVocabularyNounGenders.add(item.gender)
    }
  }
}

assert.deepEqual(
  [...defaultVocabularyNounGenders].sort(),
  [...Object.values(nounGenders)].sort(),
)

console.log('Domain constants verification passed.')
