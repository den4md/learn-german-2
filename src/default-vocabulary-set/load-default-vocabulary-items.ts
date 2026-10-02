import type { VocabularyItemId } from '../domain/identifiers'
import { DefaultVocabularySet, VocabularyItem } from '../domain/vocabulary'
import type { VocabularyItemData } from '../domain/vocabulary'
import vocabularyChunkManifest from './vocabulary-chunks.json'

const vocabularyItemChunkLoaders = import.meta.glob<VocabularyItemData[]>(
  './vocabulary-items/*.json',
  { import: 'default' },
)
const loadedVocabularyItemChunks = new Map<string, Promise<VocabularyItemData[]>>()
let loadedDefaultVocabularySet: Promise<DefaultVocabularySet> | undefined

export function loadAllDefaultVocabularySet(): Promise<DefaultVocabularySet> {
  if (loadedDefaultVocabularySet === undefined) {
    loadedDefaultVocabularySet = loadVocabularyItemChunks(
      vocabularyChunkManifest.chunks.map((chunk) => chunk.path),
    ).then(toDefaultVocabularySet).catch((error) => {
      loadedDefaultVocabularySet = undefined
      throw error
    })
  }
  return loadedDefaultVocabularySet
}

export async function loadDefaultVocabularySet(
  vocabularyItemIds: VocabularyItemId[],
): Promise<DefaultVocabularySet> {
  const requestedVocabularyItemIds = new Set(vocabularyItemIds.filter((vocabularyItemId) => vocabularyItemId > 0))
  const chunkPaths = vocabularyChunkManifest.chunks
    .filter((chunk) =>
      [...requestedVocabularyItemIds].some(
        (vocabularyItemId) =>
          vocabularyItemId >= chunk.firstVocabularyItemId &&
          vocabularyItemId <= chunk.lastVocabularyItemId,
      ),
    )
    .map((chunk) => chunk.path)
  const items = await loadVocabularyItemChunks(chunkPaths)
  return toDefaultVocabularySet(
    items.filter((vocabularyItem) => requestedVocabularyItemIds.has(vocabularyItem.id)),
  )
}

function loadVocabularyItemChunks(chunkPaths: string[]): Promise<VocabularyItemData[]> {
  return Promise.all(chunkPaths.map(loadVocabularyItemChunk)).then((chunks) => chunks.flat())
}

function loadVocabularyItemChunk(chunkPath: string): Promise<VocabularyItemData[]> {
  const loadedChunk = loadedVocabularyItemChunks.get(chunkPath)
  if (loadedChunk !== undefined) return loadedChunk

  const loadChunk = vocabularyItemChunkLoaders[chunkPath]
  const nextLoadedChunk = (loadChunk === undefined ? Promise.resolve([]) : loadChunk()).catch((error) => {
    loadedVocabularyItemChunks.delete(chunkPath)
    throw error
  })
  loadedVocabularyItemChunks.set(chunkPath, nextLoadedChunk)
  return nextLoadedChunk
}

function toDefaultVocabularySet(items: VocabularyItemData[]): DefaultVocabularySet {
  return DefaultVocabularySet.fromItems(
    [...items]
      .sort((left, right) => left.id - right.id)
      .map(VocabularyItem.fromData),
  )
}
