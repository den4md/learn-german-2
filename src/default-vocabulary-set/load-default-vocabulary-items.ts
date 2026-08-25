import type { VocabularyItemId } from '../domain/identifiers'
import type { VocabularyItemData } from '../domain/vocabulary'

const vocabularyItemChunkLoaders = import.meta.glob<VocabularyItemData[]>(
  './vocabulary-items/*.json',
  { import: 'default' },
)

export async function loadDefaultVocabularyItems(
  vocabularyItemIds: VocabularyItemId[],
): Promise<VocabularyItemData[]> {
  const requestedVocabularyItemIds = new Set(vocabularyItemIds.filter((vocabularyItemId) => vocabularyItemId > 0))
  const chunkPaths = new Set(
    [...requestedVocabularyItemIds].map(
      (vocabularyItemId) => `./vocabulary-items/${Math.ceil(vocabularyItemId / 1000) * 1000}.json`,
    ),
  )
  const chunks = await Promise.all(
    [...chunkPaths].map(async (chunkPath) => {
      const loadChunk = vocabularyItemChunkLoaders[chunkPath]
      return loadChunk === undefined ? [] : loadChunk()
    }),
  )

  return chunks.flat().filter((vocabularyItem) => requestedVocabularyItemIds.has(vocabularyItem.id))
}
