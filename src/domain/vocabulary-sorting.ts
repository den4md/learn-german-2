import { orderingDirections, orderingSources } from './constants'
import type { OrderingSourceData } from './session'
import { getWordType } from './vocabulary'
import type { ResolvedVocabularyItemData } from './vocabulary'

export function compareVocabularyItems(left: ResolvedVocabularyItemData, right: ResolvedVocabularyItemData, sources: OrderingSourceData[]): number {
  for (const { source, direction } of sources) {
    if (direction === orderingDirections.none || direction === orderingDirections.shuffle) continue
    let comparison: number
    if (source === orderingSources.lastUpdated) {
      comparison = (Date.parse(left.lastUpdatedAt ?? '') || 0) - (Date.parse(right.lastUpdatedAt ?? '') || 0)
    } else {
      const leftValue = source === orderingSources.cefrLevel ? left.level : source === orderingSources.wordType ? getWordType(left) : source === orderingSources.favouriteStatus ? String(left.isFavourite) : getHeadword(left)
      const rightValue = source === orderingSources.cefrLevel ? right.level : source === orderingSources.wordType ? getWordType(right) : source === orderingSources.favouriteStatus ? String(right.isFavourite) : getHeadword(right)
      comparison = leftValue.localeCompare(rightValue, 'de')
    }
    if (comparison !== 0) return direction === orderingDirections.descending ? -comparison : comparison
  }
  return left.id - right.id
}

function getHeadword(item: ResolvedVocabularyItemData): string {
  return 'nominative' in item ? item.nominative : 'positive' in item ? item.positive : item.infinitive
}
