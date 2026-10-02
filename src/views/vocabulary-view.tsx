import { useEffect, useMemo, useRef, useState } from 'react'
import { allCefrLevels, allWordTypes, nounGenders, orderingDirections, orderingSources, verbConjugationTypes, verbHelperVerbs, wordStates, wordTypes } from '../domain/constants'
import type { CefrLevel, OrderingDirection, OrderingSource, WordState, WordType } from '../domain/constants'
import type { VocabularyItemId } from '../domain/identifiers'
import type { LearningData } from '../domain/learning-data'
import { ResolvedVocabularyItem, VocabularyItem, getWordType, resolveVocabularyItems } from '../domain/vocabulary'
import type { ResolvedVocabularyItemData, VocabularyItemData, VocabularyItemTextData } from '../domain/vocabulary'
import { useDefaultVocabularySet } from '../default-vocabulary-set/use-default-vocabulary-set'
import { useInterfaceLanguage } from '../i18n/interface-language-context'
import { VocabularyItemRow } from '../components/vocabulary-item-row'
import { ResultPagination, resultPageSize } from '../components/result-pagination'

import { CollapsibleControls, FavouriteFilter, SortingOptions } from '../components/browse-controls'
import { compareVocabularyItems } from '../domain/vocabulary-sorting'

interface VocabularyViewProps {
  learningData: LearningData
  locationSearch: string
  onChangeWordState(vocabularyItemId: VocabularyItemId, wordState: WordState): void
  onChangeFavouriteStatus(vocabularyItemId: VocabularyItemId, isFavourite: boolean): void
  onEditVocabularyItem(vocabularyItemId: VocabularyItemId): void
  onNavigate(route: string, replace: boolean): void
}

export function VocabularyView({
  learningData,
  locationSearch,
  onChangeWordState,
  onChangeFavouriteStatus,
  onEditVocabularyItem,
  onNavigate,
}: VocabularyViewProps) {
  const { t } = useInterfaceLanguage()
  const { defaultVocabularySet, hasLoadError } = useDefaultVocabularySet()
  const routeState = useMemo(() => vocabularyResultStateFromSearch(locationSearch), [locationSearch])
  const [query, setQuery] = useState(routeState.query)
  const searchTimeout = useRef<number | undefined>(undefined)
  const [resultPageSnapshot, setResultPageSnapshot] = useState<ResultPageSnapshot | undefined>()

  useEffect(() => {
    setQuery(routeState.query)
  }, [routeState.query])

  useEffect(() => () => {
    if (searchTimeout.current !== undefined) window.clearTimeout(searchTimeout.current)
  }, [])

  const vocabularyItems = useMemo(
    () =>
      defaultVocabularySet === undefined
        ? []
        : resolveVocabularyItems(
          defaultVocabularySet,
          learningData.userAddedVocabularyItems,
          learningData.vocabularyLearningRecords,
        ).map((item) => item.toData()),
    [defaultVocabularySet, learningData],
  )
  const filterState = { ...routeState, query: query.trim() }
  const filteredVocabularyItems = applyVocabularyResultFilters(vocabularyItems, filterState)
  const calculatedPageCount = Math.max(1, Math.ceil(filteredVocabularyItems.length / resultPageSize))
  const calculatedCurrentPage = Math.min(filterState.page, calculatedPageCount)
  const calculatedVisibleVocabularyItems = filteredVocabularyItems.slice(
    (calculatedCurrentPage - 1) * resultPageSize,
    calculatedCurrentPage * resultPageSize,
  )
  const routeSearch = vocabularySearchFromResultState(routeState)
  const activeSortingCount = routeState.orderingSources.filter((source) => source.direction !== orderingDirections.none).length
  const activeFilterGroupCount = Number(routeState.cefrLevels.length > 0 && routeState.cefrLevels.length < allCefrLevels.length)
    + Number(routeState.wordTypes.length > 0 && routeState.wordTypes.length < allWordTypes.length)
    + Number(routeState.wordStates.length > 0 && routeState.wordStates.length < Object.values(wordStates).length)
    + Number(routeState.favourites.length === 1)
  useEffect(() => {
    if (resultPageSnapshot !== undefined && resultPageSnapshot.routeSearch !== routeSearch) setResultPageSnapshot(undefined)
  }, [resultPageSnapshot, routeSearch])
  const hasSnapshot = resultPageSnapshot?.routeSearch === routeSearch
  const resultCount = hasSnapshot ? resultPageSnapshot.resultCount : filteredVocabularyItems.length
  const pageCount = hasSnapshot ? resultPageSnapshot.pageCount : calculatedPageCount
  const currentPage = hasSnapshot ? resultPageSnapshot.currentPage : calculatedCurrentPage
  const visibleVocabularyItems = hasSnapshot ? resultPageSnapshot.visibleVocabularyItems : calculatedVisibleVocabularyItems
  const canonicalSearch = vocabularySearchFromResultState({
    ...routeState,
    page: defaultVocabularySet === undefined && !hasSnapshot ? routeState.page : currentPage,
  })

  useEffect(() => {
    if (locationSearch !== canonicalSearch) onNavigate(`/vocabulary${canonicalSearch}`, true)
  }, [canonicalSearch, locationSearch, onNavigate])

  const navigateResultState = (nextState: VocabularyResultState, replace = false) => {
    if (searchTimeout.current !== undefined) window.clearTimeout(searchTimeout.current)
    setResultPageSnapshot(undefined)
    onNavigate(`/vocabulary${vocabularySearchFromResultState(nextState)}`, replace)
  }

  const changeQuery = (nextQuery: string) => {
    setQuery(nextQuery)
    if (searchTimeout.current !== undefined) window.clearTimeout(searchTimeout.current)
    searchTimeout.current = window.setTimeout(() => {
      navigateResultState({ ...routeState, query: nextQuery.trim(), page: 1 }, true)
    }, 300)
  }

  const changeResultState = (change: Partial<VocabularyResultState>) => {
    navigateResultState({ ...routeState, ...change, query: query.trim(), page: 1 })
  }

  const updateSnapshotAfterItemChange = (nextItem: ResolvedVocabularyItemData) => {
    if (!hasSnapshot && matchesVocabularyResultFilters(nextItem, filterState)) return
    setResultPageSnapshot({
      currentPage,
      pageCount,
      resultCount,
      routeSearch,
      visibleVocabularyItems: visibleVocabularyItems.map((item) => item.id === nextItem.id ? nextItem : item),
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">{t('navigationVocabulary')}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t('vocabularyManagementTitle')}</h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">{t('vocabularyManagementDescription')}</p>
        <div className="mt-6 grid grid-cols-1 gap-6">
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
            {t('searchVocabulary')}
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              onChange={(event) => changeQuery(event.target.value)}
              placeholder={t('searchVocabularyPlaceholder')}
              type="search"
              value={query}
            />
          </label>
          <CollapsibleControls title={t('filters')} badge={activeFilterGroupCount > 0 ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{t('activeFilterGroups')}: {activeFilterGroupCount}</span> : undefined}>
            <div className="grid gap-6 md:grid-cols-2">
              <CheckboxGroup label={t('cefrLevels')} selectedValues={routeState.cefrLevels} values={allCefrLevels} onToggle={(level) => changeResultState({ cefrLevels: toggleValue(routeState.cefrLevels, level) })} />
              <CheckboxGroup label={t('wordTypes')} labels={{ [wordTypes.noun]: t('noun'), [wordTypes.adjective]: t('adjective'), [wordTypes.verb]: t('verb') }} selectedValues={routeState.wordTypes} values={allWordTypes} onToggle={(wordType) => changeResultState({ wordTypes: toggleValue(routeState.wordTypes, wordType) })} />
              <CheckboxGroup label={t('wordState')} labels={Object.fromEntries(Object.values(wordStates).map((state) => [state, t(wordStateMessageKeys[state])]))} selectedValues={routeState.wordStates} values={Object.values(wordStates)} onToggle={(state) => changeResultState({ wordStates: toggleValue(routeState.wordStates, state) })} />
              <FavouriteFilter selectedValues={routeState.favourites} onToggle={(value) => changeResultState({ favourites: toggleValue(routeState.favourites, value) })} />
            </div>
          </CollapsibleControls>
          <CollapsibleControls title={t('sorting')} badge={activeSortingCount > 0 ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{t('activeSortings')}: {activeSortingCount}</span> : undefined}>
            <p className="text-sm leading-6 text-slate-600">{t('sortingDescription')}</p>
            <div className="space-y-4">
              {toVocabularySortingSources(routeState.orderingSources).map((orderingSource, index, allOrderingSources) => (
                <SortingOptions key={orderingSource.source} source={orderingSource.source} direction={orderingSource.direction}
                  onChange={(direction) => changeResultState({ orderingSources: vocabularyOrderingSources(allOrderingSources.map((source) => source.source === orderingSource.source ? { ...source, direction } : source)) })}
                  onMoveEarlier={index === 0 ? undefined : () => changeResultState({ orderingSources: vocabularyOrderingSources(moveOrderingSource(allOrderingSources, index, index - 1)) })}
                  onMoveLater={index === allOrderingSources.length - 1 ? undefined : () => changeResultState({ orderingSources: vocabularyOrderingSources(moveOrderingSource(allOrderingSources, index, index + 1)) })} />
              ))}
            </div>
          </CollapsibleControls>
          {routeSearch === '' && query.trim() === '' ? null : <button className="w-fit font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={() => { setQuery(''); navigateResultState(createEmptyVocabularyResultState()) }} type="button">{t('resetFilters')}</button>}
        </div>
      </section>

      {defaultVocabularySet === undefined && !hasLoadError ? <VocabularyNotice>{t('loadingVocabulary')}</VocabularyNotice> : null}
      {hasLoadError ? <VocabularyNotice tone="error">{t('couldNotLoadVocabulary')}</VocabularyNotice> : null}
      {defaultVocabularySet !== undefined && !hasLoadError ? (
        <section aria-labelledby="vocabulary-results-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-8">
            <h3 className="text-xl font-bold tracking-tight text-slate-950" id="vocabulary-results-title">{t('vocabularyResults')}</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">{resultCount}</span>
          </div>
          <ResultPagination currentPage={currentPage} pageCount={pageCount} onChangePage={(page) => navigateResultState({ ...routeState, query: query.trim(), page })} />
          {visibleVocabularyItems.length === 0 ? (
            <p className="border-t border-slate-100 px-6 py-8 text-slate-600 sm:px-8">{t('noVocabularyMatches')}</p>
          ) : (
            <ol className="divide-y divide-slate-100 border-t border-slate-100">
              {visibleVocabularyItems.map((item) => (
                <VocabularyManagementRow
                  item={item}
                  key={item.id}
                  onChangeFavouriteStatus={(vocabularyItemId, isFavourite) => { updateSnapshotAfterItemChange({ ...item, isFavourite }); onChangeFavouriteStatus(vocabularyItemId, isFavourite) }}
                  onChangeWordState={(vocabularyItemId, wordState) => { updateSnapshotAfterItemChange({ ...item, wordState, lastUpdatedAt: wordState === item.wordState ? item.lastUpdatedAt : new Date().toISOString() }); onChangeWordState(vocabularyItemId, wordState) }}
                  onEditVocabularyItem={onEditVocabularyItem}
                />
              ))}
            </ol>
          )}
          <ResultPagination currentPage={currentPage} pageCount={pageCount} onChangePage={(page) => navigateResultState({ ...routeState, query: query.trim(), page })} />
        </section>
  ) : null}
    </div>
  )
}

interface VocabularySortingSource {
  direction: typeof orderingDirections.none | typeof orderingDirections.ascending | typeof orderingDirections.descending
  source: OrderingSource
}

interface VocabularyResultState {
  cefrLevels: CefrLevel[]
  favourites: boolean[]
  orderingSources: VocabularySortingSource[]
  page: number
  query: string
  wordStates: WordState[]
  wordTypes: WordType[]
}

interface ResultPageSnapshot {
  currentPage: number
  pageCount: number
  resultCount: number
  routeSearch: string
  visibleVocabularyItems: ResolvedVocabularyItemData[]
}

function createEmptyVocabularyResultState(): VocabularyResultState {
  return { cefrLevels: [], favourites: [], orderingSources: [], page: 1, query: '', wordStates: [], wordTypes: [] }
}

function vocabularyResultStateFromSearch(search: string): VocabularyResultState {
  const parameters = new URLSearchParams(search)
  const cefrLevelValues = parameters.getAll('level')
  const wordTypeValues = parameters.getAll('type')
  const selectedWordStates = Object.values(wordStates).filter((state) => parameters.getAll('state').includes(state))
  const favourites = [true, false].filter((value) => parameters.getAll('favourite').includes(String(value)))
  const pageValue = parameters.getAll('page').find((value) => /^\d+$/.test(value) && Number(value) > 0)
  const seenOrderingSources = new Set<OrderingSource>()
  const activeOrderingSources = parameters.getAll('order').flatMap((value) => {
    const [source, direction, extra] = value.split(':')
    if (extra !== undefined || !Object.values(orderingSources).includes(source as OrderingSource) || ![orderingDirections.none, orderingDirections.ascending, orderingDirections.descending].includes(direction as VocabularySortingSource['direction']) || seenOrderingSources.has(source as OrderingSource)) return []
    seenOrderingSources.add(source as OrderingSource)
    return [{ direction: direction as VocabularySortingSource['direction'], source: source as OrderingSource }]
  })

  return {
    cefrLevels: allCefrLevels.filter((level) => cefrLevelValues.includes(level)),
    favourites,
    orderingSources: activeOrderingSources,
    page: pageValue === undefined ? 1 : Number(pageValue),
    query: (parameters.get('q') ?? '').trim(),
    wordStates: selectedWordStates,
    wordTypes: allWordTypes.filter((wordType) => wordTypeValues.includes(wordType)),
  }
}

function vocabularySearchFromResultState(resultState: VocabularyResultState): string {
  const parameters = new URLSearchParams()
  if (resultState.query !== '') parameters.set('q', resultState.query)
  allCefrLevels.filter((level) => resultState.cefrLevels.includes(level)).forEach((level) => parameters.append('level', level))
  allWordTypes.filter((wordType) => resultState.wordTypes.includes(wordType)).forEach((wordType) => parameters.append('type', wordType))
  Object.values(wordStates).filter((state) => resultState.wordStates.includes(state)).forEach((state) => parameters.append('state', state))
  for (const value of [true, false]) {
    if (resultState.favourites.includes(value)) parameters.append('favourite', String(value))
  }
  resultState.orderingSources.forEach((orderingSource) => parameters.append('order', `${orderingSource.source}:${orderingSource.direction}`))
  if (resultState.page > 1) parameters.set('page', String(resultState.page))
  const query = parameters.toString()
  return query === '' ? '' : `?${query}`
}

function applyVocabularyResultFilters(items: ResolvedVocabularyItemData[], resultState: VocabularyResultState): ResolvedVocabularyItemData[] {
  const filteredItems = items.filter((item) => matchesVocabularyResultFilters(item, resultState))
  if (resultState.orderingSources.every((source) => source.direction === orderingDirections.none)) return filteredItems
  return [...filteredItems].sort((left, right) => compareVocabularyItems(left, right, resultState.orderingSources))

}

function matchesVocabularyResultFilters(item: ResolvedVocabularyItemData, resultState: VocabularyResultState): boolean {
  return (resultState.cefrLevels.length === 0 || resultState.cefrLevels.includes(item.level)) &&
    (resultState.wordTypes.length === 0 || resultState.wordTypes.includes(getWordType(item))) &&
    (resultState.wordStates.length === 0 || resultState.wordStates.includes(item.wordState)) &&
    (resultState.favourites.length === 0 || resultState.favourites.includes(item.isFavourite)) &&
    (resultState.query === '' || getVocabularySearchText(item).toLocaleLowerCase().includes(resultState.query.toLocaleLowerCase()))
}

function toVocabularySortingSources(activeOrderingSources: VocabularySortingSource[]): Array<{ direction: OrderingDirection; source: OrderingSource }> {
  return [
    ...activeOrderingSources,
    ...Object.values(orderingSources)
      .filter((source) => !activeOrderingSources.some((orderingSource) => orderingSource.source === source))
      .map((source) => ({ direction: orderingDirections.none, source })),
  ]
}

function vocabularyOrderingSources(sources: Array<{ direction: OrderingDirection; source: OrderingSource }>): VocabularySortingSource[] {
  return sources.flatMap((source) =>
    source.direction === orderingDirections.none || source.direction === orderingDirections.ascending || source.direction === orderingDirections.descending
      ? [{ direction: source.direction, source: source.source }]
      : [],
  )
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((candidate) => candidate !== value) : [...values, value]
}

function moveOrderingSource<T>(sources: T[], fromIndex: number, toIndex: number): T[] {
  const nextSources = [...sources]
  const [source] = nextSources.splice(fromIndex, 1)
  nextSources.splice(toIndex, 0, source!)
  return nextSources
}

interface VocabularyEditViewProps {
  vocabularyItemId: VocabularyItemId | undefined
  learningData: LearningData
  onBack(): void
  onSaveVocabularyItem(
    vocabularyItemId: VocabularyItemId,
    germanText: VocabularyItemTextData | undefined,
    translations: string[] | undefined,
    wordState: WordState,
    isFavourite: boolean,
  ): void
}

export function VocabularyEditView({ vocabularyItemId, learningData, onBack, onSaveVocabularyItem }: VocabularyEditViewProps) {
  const { t } = useInterfaceLanguage()
  const { defaultVocabularySet, hasLoadError } = useDefaultVocabularySet()

  if (vocabularyItemId === undefined) {
    return <VocabularyNotice tone="error">{t('invalidVocabularyItem')}</VocabularyNotice>
  }
  if (defaultVocabularySet === undefined) {
    return hasLoadError
      ? <VocabularyNotice tone="error">{t('couldNotLoadVocabulary')}</VocabularyNotice>
      : <VocabularyNotice>{t('loadingVocabulary')}</VocabularyNotice>
  }
  if (hasLoadError) {
    return <VocabularyNotice tone="error">{t('couldNotLoadVocabulary')}</VocabularyNotice>
  }

  const defaultVocabularyItem = defaultVocabularySet.findLoadedItem(vocabularyItemId)?.toData()
  const userAddedVocabularyItem = learningData.userAddedVocabularyItems.find((item) => item.id === vocabularyItemId)
  const sourceVocabularyItem = defaultVocabularyItem === undefined
    ? userAddedVocabularyItem
    : VocabularyItem.fromData(defaultVocabularyItem)
  if (sourceVocabularyItem === undefined) {
    return <VocabularyNotice tone="error">{t('invalidVocabularyItem')}</VocabularyNotice>
  }

  const learningRecord = learningData.vocabularyLearningRecords.find(
    (record) => record.vocabularyItemId === vocabularyItemId,
  )
  const resolvedVocabularyItem = ResolvedVocabularyItem.fromVocabularyItem(sourceVocabularyItem, learningRecord).toData()

  return (
    <VocabularyEditForm
      defaultVocabularyItem={defaultVocabularyItem}
      key={vocabularyItemId}
      onBack={onBack}
      onSave={onSaveVocabularyItem}
      isFavourite={resolvedVocabularyItem.isFavourite}
      learningScore={resolvedVocabularyItem.learningScore}
      learningStatistics={resolvedVocabularyItem.learningStatistics}
      vocabularyItem={toVocabularyItemData(resolvedVocabularyItem)}
      wordState={resolvedVocabularyItem.wordState}
    />
  )
}

function VocabularyManagementRow({
  item,
  onChangeFavouriteStatus,
  onChangeWordState,
  onEditVocabularyItem,
}: {
  item: ResolvedVocabularyItemData
  onChangeFavouriteStatus(vocabularyItemId: VocabularyItemId, isFavourite: boolean): void
  onChangeWordState(vocabularyItemId: VocabularyItemId, wordState: WordState): void
  onEditVocabularyItem(vocabularyItemId: VocabularyItemId): void
}) {
  return <VocabularyItemRow item={item} onChangeFavouriteStatus={onChangeFavouriteStatus} onChangeWordState={onChangeWordState} onEditVocabularyItem={onEditVocabularyItem} />
}

function VocabularyEditForm({
  defaultVocabularyItem,
  isFavourite,
  learningScore,
  learningStatistics,
  onBack,
  onSave,
  vocabularyItem,
  wordState,
}: {
  defaultVocabularyItem: VocabularyItemData | undefined
  isFavourite: boolean
  learningScore: number
  learningStatistics: ResolvedVocabularyItemData['learningStatistics']
  onBack(): void
  onSave(vocabularyItemId: VocabularyItemId, germanText: VocabularyItemTextData | undefined, translations: string[] | undefined, wordState: WordState, isFavourite: boolean): void
  vocabularyItem: VocabularyItemData
  wordState: WordState
}) {
  const { t } = useInterfaceLanguage()
  const [item, setItem] = useState(vocabularyItem)
  const [selectedWordState, setSelectedWordState] = useState(wordState)
  const [selectedFavouriteStatus, setSelectedFavouriteStatus] = useState(isFavourite)
  const hasDefaultVocabularyItem = defaultVocabularyItem !== undefined

  const save = () => {
    const germanText = toVocabularyItemTextData(item)
    const defaultGermanText = defaultVocabularyItem === undefined ? undefined : toVocabularyItemTextData(defaultVocabularyItem)
    const translations = defaultVocabularyItem !== undefined && sameStrings(item.translations, defaultVocabularyItem.translations)
      ? undefined
      : item.translations
    onSave(item.id, defaultGermanText !== undefined && sameGermanText(germanText, defaultGermanText) ? undefined : germanText, translations, selectedWordState, selectedFavouriteStatus)
    onBack()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">{t('navigationVocabulary')}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t('editVocabularyItem')}</h2>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <Metadata label={t('vocabularyItemId')} value={String(item.id)} />
          <Metadata label={t('cefrLevel')} value={item.level} />
          <Metadata label={t('wordType')} value={t(wordTypeMessageKeys[getWordType(item)])} />
          <Metadata label={t('learningScore')} value={String(learningScore)} />
          <Metadata label={t('cardShows')} value={String(learningStatistics.cardShows)} />
          <Metadata label={t('correctAssessments')} value={String(learningStatistics.correctAssessments)} />
          <Metadata label={t('incorrectAssessments')} value={String(learningStatistics.incorrectAssessments)} />
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-xl font-bold tracking-tight text-slate-950">{t('wordState')}</h3>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <label className="text-sm font-semibold text-slate-700">{t('wordState')}<select className="mt-2 block rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" onChange={(event) => setSelectedWordState(event.target.value as WordState)} value={selectedWordState}>{Object.values(wordStates).map((state) => <option key={state} value={state}>{t(wordStateMessageKeys[state])}</option>)}</select></label>
          <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-700"><input checked={selectedFavouriteStatus} onChange={(event) => setSelectedFavouriteStatus(event.target.checked)} type="checkbox" />{t('favourite')}</label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-bold tracking-tight text-slate-950">{t('germanText')}</h3>
          {hasDefaultVocabularyItem ? <button className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={() => setItem((currentItem) => ({ ...defaultVocabularyItem, translations: currentItem.translations }))} type="button">{t('resetGerman')}</button> : null}
        </div>
        <GermanTextFields item={item} onChange={setItem} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-bold tracking-tight text-slate-950">{t('russianTranslations')}</h3>
          {hasDefaultVocabularyItem ? <button className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={() => setItem((currentItem) => ({ ...currentItem, translations: [...defaultVocabularyItem.translations] }))} type="button">{t('resetTranslations')}</button> : null}
        </div>
        <div className="mt-5 space-y-3">
          {item.translations.map((translation, index) => (
            <div className="flex flex-wrap gap-2" key={`${index}-${translation}`}>
              <label className="sr-only" htmlFor={`translation-${index}`}>{t('russianTranslation')}</label>
              <input className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" id={`translation-${index}`} onChange={(event) => setItem((currentItem) => ({ ...currentItem, translations: currentItem.translations.map((currentTranslation, currentIndex) => currentIndex === index ? event.target.value : currentTranslation) }))} value={translation} />
              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" disabled={index === 0} onClick={() => setItem((currentItem) => ({ ...currentItem, translations: moveItem(currentItem.translations, index, index - 1) }))} type="button">{t('moveUp')}</button>
              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" disabled={index === item.translations.length - 1} onClick={() => setItem((currentItem) => ({ ...currentItem, translations: moveItem(currentItem.translations, index, index + 1) }))} type="button">{t('moveDown')}</button>
              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={() => setItem((currentItem) => ({ ...currentItem, translations: currentItem.translations.filter((_, currentIndex) => currentIndex !== index) }))} type="button">{t('removeTranslation')}</button>
            </div>
          ))}
        </div>
        <button className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={() => setItem((currentItem) => ({ ...currentItem, translations: [...currentItem.translations, ''] }))} type="button">{t('addTranslation')}</button>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <button className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={onBack} type="button">{t('cancel')}</button>
        <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-200" onClick={save} type="button">{t('saveChanges')}</button>
      </div>
    </div>
  )
}

function GermanTextFields({ item, onChange }: { item: VocabularyItemData; onChange(item: VocabularyItemData): void }) {
  const { t } = useInterfaceLanguage()
  const inputClassName = 'mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100'

  if ('nominative' in item) {
    return <div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm font-semibold text-slate-700">{t('nominative')}<input className={inputClassName} onChange={(event) => onChange({ ...item, nominative: event.target.value })} value={item.nominative} /></label><label className="text-sm font-semibold text-slate-700">{t('nounGender')}<select className={inputClassName} onChange={(event) => onChange({ ...item, gender: event.target.value as typeof item.gender })} value={item.gender}>{Object.values(nounGenders).map((gender) => <option key={gender} value={gender}>{gender}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">{t('nounPlural')}<input className={inputClassName} onChange={(event) => onChange({ ...item, plural: event.target.value })} value={item.plural} /></label></div>
  }
  if ('positive' in item) {
    return <label className="mt-5 block max-w-xl text-sm font-semibold text-slate-700">{t('positive')}<input className={inputClassName} onChange={(event) => onChange({ ...item, positive: event.target.value })} value={item.positive} /></label>
  }
  return <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">{t('infinitive')}<input className={inputClassName} onChange={(event) => onChange({ ...item, infinitive: event.target.value })} value={item.infinitive} /></label><label className="text-sm font-semibold text-slate-700">{t('verbHelperVerb')}<select className={inputClassName} onChange={(event) => onChange({ ...item, helper_verb: event.target.value as typeof item.helper_verb })} value={item.helper_verb}>{Object.values(verbHelperVerbs).map((helperVerb) => <option key={helperVerb} value={helperVerb}>{helperVerb}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">{t('verbConjugationType')}<select className={inputClassName} onChange={(event) => onChange({ ...item, conjugation_type: event.target.value as typeof item.conjugation_type })} value={item.conjugation_type}>{Object.values(verbConjugationTypes).map((conjugationType) => <option key={conjugationType} value={conjugationType}>{conjugationType}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">{t('verbPresent')}<input className={inputClassName} onChange={(event) => onChange({ ...item, present: event.target.value })} value={item.present} /></label><label className="text-sm font-semibold text-slate-700">{t('verbPreterite')}<input className={inputClassName} onChange={(event) => onChange({ ...item, preterite: event.target.value })} value={item.preterite} /></label><label className="text-sm font-semibold text-slate-700">{t('verbPerfect')}<input className={inputClassName} onChange={(event) => onChange({ ...item, perfect: event.target.value })} value={item.perfect} /></label></div>
}

function CheckboxGroup<T extends string>({ label, labels, values, selectedValues, onToggle }: { label: string; labels?: Partial<Record<T, string>>; values: readonly T[]; selectedValues: T[]; onToggle(value: T): void }) {
  return <div><p className="text-sm font-semibold text-slate-700">{label}</p><div className="mt-3 flex flex-wrap gap-3">{values.map((value) => <label className="flex items-center gap-2 text-sm text-slate-700" key={value}><input checked={selectedValues.includes(value)} type="checkbox" onChange={() => onToggle(value)} />{labels?.[value] ?? value}</label>)}</div></div>
}

function VocabularyNotice({ children, tone = 'normal' }: { children: string; tone?: 'error' | 'normal' }) {
  return <p className={`rounded-2xl border p-6 shadow-sm ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-600'}`}>{children}</p>
}

function Metadata({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-medium text-slate-600">{label}</dt><dd className="mt-1 font-semibold text-slate-950">{value}</dd></div>
}

const wordTypeMessageKeys = { [wordTypes.adjective]: 'adjective', [wordTypes.noun]: 'noun', [wordTypes.verb]: 'verb' } as const
const wordStateMessageKeys = { [wordStates.new]: 'wordStateNew', [wordStates.learning]: 'wordStateLearning', [wordStates.known]: 'wordStateKnown', [wordStates.excluded]: 'wordStateExcluded' } as const
function getVocabularySearchText(item: ResolvedVocabularyItemData): string {
  return 'nominative' in item
    ? [item.nominative, item.gender, item.plural, ...item.translations].join(' ')
    : 'positive' in item
      ? [item.positive, ...item.translations].join(' ')
      : [item.infinitive, item.helper_verb, item.conjugation_type, item.present, item.preterite, item.perfect, ...item.translations].join(' ')
}

function toVocabularyItemData(item: ResolvedVocabularyItemData): VocabularyItemData {
  const { wordState: _, learningScore: __, learningStatistics: ___, isFavourite: ____, lastUpdatedAt: _____, ...vocabularyItem } = item
  return vocabularyItem
}

function toVocabularyItemTextData(item: VocabularyItemData): VocabularyItemTextData {
  if ('nominative' in item) return { wordType: wordTypes.noun, nominative: item.nominative, gender: item.gender, plural: item.plural }
  if ('positive' in item) return { wordType: wordTypes.adjective, positive: item.positive }
  return { wordType: wordTypes.verb, infinitive: item.infinitive, helper_verb: item.helper_verb, conjugation_type: item.conjugation_type, present: item.present, preterite: item.preterite, perfect: item.perfect }
}

function sameGermanText(left: VocabularyItemTextData, right: VocabularyItemTextData): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function sameStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function moveItem(items: string[], fromIndex: number, toIndex: number): string[] {
  const nextItems = [...items]
  const [item] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, item)
  return nextItems
}
