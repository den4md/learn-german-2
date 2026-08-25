import { favouriteStatusFilters, orderingDirections, orderingSources, sessionTypes, wordStates } from '../domain/constants'
import type { VocabularyItemId } from '../domain/identifiers'
import type { LearningData } from '../domain/learning-data'
import type { SessionSettingsData, SessionType } from '../domain/session'
import { DefaultVocabularySet, VocabularyItem, getWordType, resolveVocabularyItems } from '../domain/vocabulary'
import type { ResolvedVocabularyItemData, VocabularyItemData } from '../domain/vocabulary'

export function selectSessionVocabularyItemIds(
  learningData: LearningData,
  defaultVocabularyItemData: VocabularyItemData[],
  sessionType: SessionType,
  settings: SessionSettingsData,
): VocabularyItemId[] {
  const requiredWordState = sessionType === sessionTypes.knowledgeCheck
    ? wordStates.new
    : sessionType === sessionTypes.learning
      ? wordStates.learning
      : wordStates.known
  const vocabularyItems = resolveVocabularyItems(
    DefaultVocabularySet.fromItems(defaultVocabularyItemData.map(VocabularyItem.fromData)),
    learningData.userAddedVocabularyItems,
    learningData.vocabularyLearningRecords,
  )

  const matchingVocabularyItems = vocabularyItems
    .filter((vocabularyItem) => vocabularyItem.wordState === requiredWordState)
    .filter((vocabularyItem) => settings.cefrLevels.includes(vocabularyItem.toData().level))
    .filter((vocabularyItem) => settings.wordTypes.includes(getWordType(vocabularyItem.toData())))
    .filter((vocabularyItem) =>
      settings.favouriteStatusFilter === favouriteStatusFilters.all ||
      vocabularyItem.isFavourite === (settings.favouriteStatusFilter === favouriteStatusFilters.favourites),
    )

  if (settings.orderingSources.every((source) => source.direction === orderingDirections.none)) {
    return shuffle(matchingVocabularyItems.map((vocabularyItem) => vocabularyItem.id))
  }

  return [...matchingVocabularyItems]
    .sort((left, right) => compareVocabularyItems(left.toData(), right.toData(), settings))
    .map((vocabularyItem) => vocabularyItem.id)
}

function compareVocabularyItems(left: ResolvedVocabularyItemData, right: ResolvedVocabularyItemData, settings: SessionSettingsData): number {
  for (const orderingSource of settings.orderingSources) {
    if (orderingSource.direction === orderingDirections.none || orderingSource.direction === orderingDirections.shuffle) {
      continue
    }
    const leftValue = orderingSource.source === orderingSources.cefrLevel
      ? left.level
      : orderingSource.source === orderingSources.wordType
        ? getWordType(left)
        : orderingSource.source === orderingSources.favouriteStatus
          ? String(left.isFavourite)
          : getHeadword(left)
    const rightValue = orderingSource.source === orderingSources.cefrLevel
      ? right.level
      : orderingSource.source === orderingSources.wordType
        ? getWordType(right)
        : orderingSource.source === orderingSources.favouriteStatus
          ? String(right.isFavourite)
          : getHeadword(right)
    const comparison = leftValue.localeCompare(rightValue, 'de')
    if (comparison !== 0) {
      return orderingSource.direction === orderingDirections.descending ? -comparison : comparison
    }
  }
  return left.id - right.id
}

function getHeadword(vocabularyItem: ResolvedVocabularyItemData): string {
  return 'nominative' in vocabularyItem ? vocabularyItem.nominative : 'positive' in vocabularyItem ? vocabularyItem.positive : vocabularyItem.infinitive
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
