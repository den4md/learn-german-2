import { favouriteStatusFilters, orderingDirections, sessionTypes, wordStates } from '../domain/constants'
import type { VocabularyItemId } from '../domain/identifiers'
import type { LearningData } from '../domain/learning-data'
import type { SessionSettingsData, SessionType } from '../domain/session'
import { getWordType, resolveVocabularyItems } from '../domain/vocabulary'
import type { DefaultVocabularySet } from '../domain/vocabulary'

import { compareVocabularyItems } from '../domain/vocabulary-sorting'

export function selectSessionVocabularyItemIds(
  learningData: LearningData,
  defaultVocabularySet: DefaultVocabularySet,
  sessionType: SessionType,
  settings: SessionSettingsData,
): VocabularyItemId[] {
  const requiredWordState = sessionType === sessionTypes.knowledgeCheck
    ? wordStates.new
    : sessionType === sessionTypes.learning
      ? wordStates.learning
      : wordStates.known
  const vocabularyItems = resolveVocabularyItems(
    defaultVocabularySet,
    learningData.userAddedVocabularyItems,
    learningData.vocabularyLearningRecords,
  )

  const matchingVocabularyItems = vocabularyItems
    .filter((vocabularyItem) => vocabularyItem.wordState === requiredWordState)
    .filter((vocabularyItem) => settings.cefrLevels.length === 0 || settings.cefrLevels.includes(vocabularyItem.toData().level))
    .filter((vocabularyItem) => settings.wordTypes.length === 0 || settings.wordTypes.includes(getWordType(vocabularyItem.toData())))
    .filter((vocabularyItem) =>
      settings.favouriteStatusFilter === favouriteStatusFilters.all ||
      vocabularyItem.isFavourite === (settings.favouriteStatusFilter === favouriteStatusFilters.favourites),
    )

  if (settings.orderingSources.every((source) => source.direction === orderingDirections.none)) {
    return shuffle(matchingVocabularyItems.map((vocabularyItem) => vocabularyItem.id))
  }

  return [...matchingVocabularyItems]
    .sort((left, right) => compareVocabularyItems(left.toData(), right.toData(), settings.orderingSources))
    .map((vocabularyItem) => vocabularyItem.id)
}

function shuffle<T>(items: T[]): T[] {
  const shuffledItems = [...items]
  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(Math.random() * (index + 1))
    const item = shuffledItems[index]
    shuffledItems[index] = shuffledItems[otherIndex]!
    shuffledItems[otherIndex] = item!
  }
  return shuffledItems
}
