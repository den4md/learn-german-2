import { useEffect, useState } from 'react'
import type { VocabularyItemId } from '../domain/identifiers'
import type { DefaultVocabularySet } from '../domain/vocabulary'
import { loadAllDefaultVocabularySet, loadDefaultVocabularySet } from './load-default-vocabulary-items'

export interface DefaultVocabularySetLoadState {
  defaultVocabularySet: DefaultVocabularySet | undefined
  hasLoadError: boolean
}

export function useDefaultVocabularySet(
  vocabularyItemIds?: VocabularyItemId[],
): DefaultVocabularySetLoadState {
  const vocabularyItemIdsKey = vocabularyItemIds?.join(',')
  const [state, setState] = useState<DefaultVocabularySetLoadState>({
    defaultVocabularySet: undefined,
    hasLoadError: false,
  })

  useEffect(() => {
    let isCurrent = true
    setState({ defaultVocabularySet: undefined, hasLoadError: false })

    void (vocabularyItemIds === undefined
      ? loadAllDefaultVocabularySet()
      : loadDefaultVocabularySet(vocabularyItemIds))
      .then((defaultVocabularySet) => {
        if (isCurrent) setState({ defaultVocabularySet, hasLoadError: false })
      })
      .catch(() => {
        if (isCurrent) setState({ defaultVocabularySet: undefined, hasLoadError: true })
      })

    return () => {
      isCurrent = false
    }
  }, [vocabularyItemIdsKey])

  return state
}
