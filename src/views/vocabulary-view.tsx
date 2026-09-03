import { useEffect, useMemo, useRef, useState } from 'react'
import { allCefrLevels, allWordTypes, nounGenders, orderingDirections, orderingSources, verbConjugationTypes, verbHelperVerbs, wordStates, wordTypes } from '../domain/constants'
import type { CefrLevel, OrderingDirection, OrderingSource, WordState, WordType } from '../domain/constants'
import type { VocabularyItemId } from '../domain/identifiers'
import type { LearningData } from '../domain/learning-data'
import {
  DefaultVocabularySet,
  ResolvedVocabularyItem,
  VocabularyItem,
  getWordType,
  resolveVocabularyItems,
} from '../domain/vocabulary'
import type { ResolvedVocabularyItemData, VocabularyItemData, VocabularyItemTextData } from '../domain/vocabulary'
import { loadAllDefaultVocabularyItems } from '../default-vocabulary-set/load-default-vocabulary-items'
import { useInterfaceLanguage } from '../i18n/interface-language-context'
import { VocabularyItemRow } from '../components/vocabulary-item-row'

const vocabularyPageSize = 50

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
  const [defaultVocabularyItems, setDefaultVocabularyItems] = useState<VocabularyItemData[] | undefined>()
  const [hasLoadError, setHasLoadError] = useState(false)
  const routeState = useMemo(() => vocabularyResultStateFromSearch(locationSearch), [locationSearch])
  const [query, setQuery] = useState(routeState.query)
  const searchTimeout = useRef<number | undefined>(undefined)
  const [resultPageSnapshot, setResultPageSnapshot] = useState<ResultPageSnapshot | undefined>()

  useEffect(() => {
    let isCurrent = true
    setHasLoadError(false)

    void loadAllDefaultVocabularyItems()
      .then((items) => {
        if (isCurrent) setDefaultVocabularyItems(items)
      })
      .catch(() => {
        if (isCurrent) setHasLoadError(true)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    setQuery(routeState.query)
  }, [routeState.query])

  useEffect(() => () => {
    if (searchTimeout.current !== undefined) window.clearTimeout(searchTimeout.current)
  }, [])

  const vocabularyItems = useMemo(
    () =>
      defaultVocabularyItems === undefined
        ? []
        : resolveVocabularyItems(
          DefaultVocabularySet.fromItems(defaultVocabularyItems.map(VocabularyItem.fromData)),
          learningData.userAddedVocabularyItems,
          learningData.vocabularyLearningRecords,
        ).map((item) => item.toData()),
    [defaultVocabularyItems, learningData],
  )
  const filterState = { ...routeState, query: query.trim() }
  const filteredVocabularyItems = applyVocabularyResultFilters(vocabularyItems, filterState)
  const calculatedPageCount = Math.max(1, Math.ceil(filteredVocabularyItems.length / vocabularyPageSize))
  const calculatedCurrentPage = Math.min(filterState.page, calculatedPageCount)
  const calculatedVisibleVocabularyItems = filteredVocabularyItems.slice(
    (calculatedCurrentPage - 1) * vocabularyPageSize,
    calculatedCurrentPage * vocabularyPageSize,
  )
  const routeSearch = vocabularySearchFromResultState(routeState)
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
    page: defaultVocabularyItems === undefined && !hasSnapshot ? routeState.page : currentPage,
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
        <div className="mt-6 grid gap-6">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {t('searchVocabulary')}
            <input
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              onChange={(event) => changeQuery(event.target.value)}
              placeholder={t('searchVocabularyPlaceholder')}
              type="search"
              value={query}
            />
          </label>
          <div className="grid gap-6 md:grid-cols-2">
            <CheckboxGroup label={t('cefrLevels')} selectedValues={routeState.cefrLevels} values={allCefrLevels} onToggle={(level) => changeResultState({ cefrLevels: toggleValue(routeState.cefrLevels, level) })} />
            <CheckboxGroup label={t('wordTypes')} labels={{ [wordTypes.noun]: t('noun'), [wordTypes.adjective]: t('adjective'), [wordTypes.verb]: t('verb') }} selectedValues={routeState.wordTypes} values={allWordTypes} onToggle={(wordType) => changeResultState({ wordTypes: toggleValue(routeState.wordTypes, wordType) })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              {t('wordState')}
              <select className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" onChange={(event) => changeResultState({ wordState: event.target.value === 'all' ? undefined : event.target.value as WordState })} value={routeState.wordState ?? 'all'}>
                <option value="all">{t('allVocabularyItems')}</option>
                {Object.values(wordStates).map((wordState) => <option key={wordState} value={wordState}>{t(wordStateMessageKeys[wordState])}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              {t('favouriteStatus')}
              <select className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" onChange={(event) => changeResultState({ favourite: event.target.value === 'all' ? undefined : event.target.value === 'true' })} value={routeState.favourite === undefined ? 'all' : String(routeState.favourite)}>
                <option value="all">{t('allItems')}</option><option value="true">{t('favouritesOnly')}</option><option value="false">{t('nonFavouritesOnly')}</option>
              </select>
            </label>
          </div>
          <fieldset className="border-t border-slate-200 pt-6">
            <legend className="text-lg font-bold text-slate-950">{t('ordering')}</legend>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t('orderingDescription')}</p>
            <div className="mt-4 space-y-3">
              {toVocabularyOrderingSources(routeState.orderingSources).map((orderingSource, index, allOrderingSources) => (
                <div className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_14rem_auto] sm:items-center" key={orderingSource.source}>
                  <span className="font-semibold text-slate-800">{t(orderingSourceMessageKeys[orderingSource.source])}</span>
                  <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100" onChange={(event) => changeResultState({ orderingSources: activeVocabularyOrderingSources(allOrderingSources.map((source) => source.source === orderingSource.source ? { ...source, direction: event.target.value as OrderingDirection } : source)) })} value={orderingSource.direction}>
                    <option value={orderingDirections.none}>{t('noSorting')}</option><option value={orderingDirections.ascending}>{t(orderingDirectionMessageKeys[orderingSource.source][orderingDirections.ascending])}</option><option value={orderingDirections.descending}>{t(orderingDirectionMessageKeys[orderingSource.source][orderingDirections.descending])}</option>
                  </select>
                  <div className="flex gap-2"><button aria-label={t('moveOrderingSourceEarlier')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={index === 0} type="button" onClick={() => changeResultState({ orderingSources: activeVocabularyOrderingSources(moveOrderingSource(allOrderingSources, index, index - 1)) })}><span aria-hidden="true">⬆️</span></button><button aria-label={t('moveOrderingSourceLater')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={index === allOrderingSources.length - 1} type="button" onClick={() => changeResultState({ orderingSources: activeVocabularyOrderingSources(moveOrderingSource(allOrderingSources, index, index + 1)) })}><span aria-hidden="true">⬇️</span></button></div>
                </div>
              ))}
            </div>
          </fieldset>
          {routeSearch === '' && query.trim() === '' ? null : <button className="w-fit font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={() => { setQuery(''); navigateResultState(createEmptyVocabularyResultState()) }} type="button">{t('resetFilters')}</button>}
        </div>
      </section>

      {defaultVocabularyItems === undefined && !hasLoadError ? <VocabularyNotice>{t('loadingVocabulary')}</VocabularyNotice> : null}
      {hasLoadError ? <VocabularyNotice tone="error">{t('couldNotLoadVocabulary')}</VocabularyNotice> : null}
      {defaultVocabularyItems !== undefined && !hasLoadError ? (
        <section aria-labelledby="vocabulary-results-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-8">
            <h3 className="text-xl font-bold tracking-tight text-slate-950" id="vocabulary-results-title">{t('vocabularyResults')}</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">{resultCount}</span>
          </div>
          {visibleVocabularyItems.length === 0 ? (
            <p className="border-t border-slate-100 px-6 py-8 text-slate-600 sm:px-8">{t('noVocabularyMatches')}</p>
          ) : (
            <ol className="divide-y divide-slate-100 border-t border-slate-100">
              {visibleVocabularyItems.map((item) => (
                <VocabularyManagementRow
                  item={item}
                  key={item.id}
                  onChangeFavouriteStatus={(vocabularyItemId, isFavourite) => { updateSnapshotAfterItemChange({ ...item, isFavourite }); onChangeFavouriteStatus(vocabularyItemId, isFavourite) }}
                  onChangeWordState={(vocabularyItemId, wordState) => { updateSnapshotAfterItemChange({ ...item, wordState }); onChangeWordState(vocabularyItemId, wordState) }}
                  onEditVocabularyItem={onEditVocabularyItem}
                />
              ))}
            </ol>
          )}
          <VocabularyPagination currentPage={currentPage} pageCount={pageCount} onChangePage={(page) => navigateResultState({ ...routeState, query: query.trim(), page })} />
        </section>
  ) : null}
    </div>
  )
}

interface VocabularyOrderingSource {
  direction: typeof orderingDirections.ascending | typeof orderingDirections.descending
  source: OrderingSource
}

interface VocabularyResultState {
  cefrLevels: CefrLevel[]
  favourite: boolean | undefined
  orderingSources: VocabularyOrderingSource[]
  page: number
  query: string
  wordState: WordState | undefined
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
  return { cefrLevels: [], favourite: undefined, orderingSources: [], page: 1, query: '', wordState: undefined, wordTypes: [] }
}

function vocabularyResultStateFromSearch(search: string): VocabularyResultState {
  const parameters = new URLSearchParams(search)
  const cefrLevelValues = parameters.getAll('level')
  const wordTypeValues = parameters.getAll('type')
  const wordState = parameters.getAll('state').find((value): value is WordState => Object.values(wordStates).includes(value as WordState))
  const favouriteValue = parameters.getAll('favourite').find((value) => value === 'true' || value === 'false')
  const pageValue = parameters.getAll('page').find((value) => /^\d+$/.test(value) && Number(value) > 0)
  const seenOrderingSources = new Set<OrderingSource>()
  const activeOrderingSources = parameters.getAll('order').flatMap((value) => {
    const [source, direction, extra] = value.split(':')
    if (extra !== undefined || !Object.values(orderingSources).includes(source as OrderingSource) || ![orderingDirections.ascending, orderingDirections.descending].includes(direction as typeof orderingDirections.ascending | typeof orderingDirections.descending) || seenOrderingSources.has(source as OrderingSource)) return []
    seenOrderingSources.add(source as OrderingSource)
    return [{ direction: direction as VocabularyOrderingSource['direction'], source: source as OrderingSource }]
  })

  return {
    cefrLevels: allCefrLevels.filter((level) => cefrLevelValues.includes(level)),
    favourite: favouriteValue === undefined ? undefined : favouriteValue === 'true',
    orderingSources: activeOrderingSources,
    page: pageValue === undefined ? 1 : Number(pageValue),
    query: (parameters.get('q') ?? '').trim(),
    wordState,
    wordTypes: allWordTypes.filter((wordType) => wordTypeValues.includes(wordType)),
  }
}

function vocabularySearchFromResultState(resultState: VocabularyResultState): string {
  const parameters = new URLSearchParams()
  if (resultState.query !== '') parameters.set('q', resultState.query)
  allCefrLevels.filter((level) => resultState.cefrLevels.includes(level)).forEach((level) => parameters.append('level', level))
  allWordTypes.filter((wordType) => resultState.wordTypes.includes(wordType)).forEach((wordType) => parameters.append('type', wordType))
  if (resultState.wordState !== undefined) parameters.set('state', resultState.wordState)
  if (resultState.favourite !== undefined) parameters.set('favourite', String(resultState.favourite))
  resultState.orderingSources.forEach((orderingSource) => parameters.append('order', `${orderingSource.source}:${orderingSource.direction}`))
  if (resultState.page > 1) parameters.set('page', String(resultState.page))
  const query = parameters.toString()
  return query === '' ? '' : `?${query}`
}

function applyVocabularyResultFilters(items: ResolvedVocabularyItemData[], resultState: VocabularyResultState): ResolvedVocabularyItemData[] {
  const filteredItems = items.filter((item) => matchesVocabularyResultFilters(item, resultState))
  if (resultState.orderingSources.length === 0) return filteredItems
  return [...filteredItems].sort((left, right) => compareVocabularyItems(left, right, resultState.orderingSources))

}

function matchesVocabularyResultFilters(item: ResolvedVocabularyItemData, resultState: VocabularyResultState): boolean {
  return (resultState.cefrLevels.length === 0 || resultState.cefrLevels.includes(item.level)) &&
    (resultState.wordTypes.length === 0 || resultState.wordTypes.includes(getWordType(item))) &&
    (resultState.wordState === undefined || item.wordState === resultState.wordState) &&
    (resultState.favourite === undefined || item.isFavourite === resultState.favourite) &&
    (resultState.query === '' || getVocabularySearchText(item).toLocaleLowerCase().includes(resultState.query.toLocaleLowerCase()))
}

function compareVocabularyItems(left: ResolvedVocabularyItemData, right: ResolvedVocabularyItemData, activeOrderingSources: VocabularyOrderingSource[]): number {
  for (const orderingSource of activeOrderingSources) {
    const leftValue = getOrderingValue(left, orderingSource.source)
    const rightValue = getOrderingValue(right, orderingSource.source)
    const comparison = leftValue.localeCompare(rightValue, 'de')
    if (comparison !== 0) return orderingSource.direction === orderingDirections.descending ? -comparison : comparison
  }
  return left.id - right.id
}

function getOrderingValue(item: ResolvedVocabularyItemData, source: OrderingSource): string {
  if (source === orderingSources.cefrLevel) return item.level
  if (source === orderingSources.wordType) return getWordType(item)
  if (source === orderingSources.favouriteStatus) return String(item.isFavourite)
  return getGermanHeadword(item)
}

function toVocabularyOrderingSources(activeOrderingSources: VocabularyOrderingSource[]): Array<{ direction: OrderingDirection; source: OrderingSource }> {
  return [
    ...activeOrderingSources,
    ...Object.values(orderingSources)
      .filter((source) => !activeOrderingSources.some((orderingSource) => orderingSource.source === source))
      .map((source) => ({ direction: orderingDirections.none, source })),
  ]
}

function activeVocabularyOrderingSources(sources: Array<{ direction: OrderingDirection; source: OrderingSource }>): VocabularyOrderingSource[] {
  return sources.flatMap((source) =>
    source.direction === orderingDirections.ascending || source.direction === orderingDirections.descending
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
  ): void
}

export function VocabularyEditView({ vocabularyItemId, learningData, onBack, onSaveVocabularyItem }: VocabularyEditViewProps) {
  const { t } = useInterfaceLanguage()
  const [defaultVocabularyItems, setDefaultVocabularyItems] = useState<VocabularyItemData[] | undefined>()
  const [hasLoadError, setHasLoadError] = useState(false)

  useEffect(() => {
    let isCurrent = true
    setHasLoadError(false)

    void loadAllDefaultVocabularyItems()
      .then((items) => {
        if (isCurrent) setDefaultVocabularyItems(items)
      })
      .catch(() => {
        if (isCurrent) setHasLoadError(true)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  if (vocabularyItemId === undefined) {
    return <VocabularyNotice tone="error">{t('invalidVocabularyItem')}</VocabularyNotice>
  }
  if (defaultVocabularyItems === undefined) {
    return hasLoadError
      ? <VocabularyNotice tone="error">{t('couldNotLoadVocabulary')}</VocabularyNotice>
      : <VocabularyNotice>{t('loadingVocabulary')}</VocabularyNotice>
  }
  if (hasLoadError) {
    return <VocabularyNotice tone="error">{t('couldNotLoadVocabulary')}</VocabularyNotice>
  }

  const defaultVocabularyItem = defaultVocabularyItems.find((item) => item.id === vocabularyItemId)
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
      vocabularyItem={toVocabularyItemData(resolvedVocabularyItem)}
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
  onBack,
  onSave,
  vocabularyItem,
}: {
  defaultVocabularyItem: VocabularyItemData | undefined
  onBack(): void
  onSave(vocabularyItemId: VocabularyItemId, germanText: VocabularyItemTextData | undefined, translations: string[] | undefined): void
  vocabularyItem: VocabularyItemData
}) {
  const { t } = useInterfaceLanguage()
  const [item, setItem] = useState(vocabularyItem)
  const hasDefaultVocabularyItem = defaultVocabularyItem !== undefined

  const save = () => {
    const germanText = toVocabularyItemTextData(item)
    const defaultGermanText = defaultVocabularyItem === undefined ? undefined : toVocabularyItemTextData(defaultVocabularyItem)
    const translations = defaultVocabularyItem !== undefined && sameStrings(item.translations, defaultVocabularyItem.translations)
      ? undefined
      : item.translations
    onSave(item.id, defaultGermanText !== undefined && sameGermanText(germanText, defaultGermanText) ? undefined : germanText, translations)
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
        </dl>
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

function VocabularyPagination({ currentPage, pageCount, onChangePage }: { currentPage: number; pageCount: number; onChangePage(page: number): void }) {
  const { t } = useInterfaceLanguage()
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:px-8"><p className="text-sm text-slate-600">{t('page')} {currentPage} / {pageCount}</p><div className="flex gap-2"><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" disabled={currentPage === 1} onClick={() => onChangePage(currentPage - 1)} type="button">{t('previousPage')}</button><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" disabled={currentPage === pageCount} onClick={() => onChangePage(currentPage + 1)} type="button">{t('nextPage')}</button></div></div>
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
const orderingSourceMessageKeys = { [orderingSources.cefrLevel]: 'cefrLevels', [orderingSources.wordType]: 'wordTypes', [orderingSources.vocabularyItem]: 'vocabulary', [orderingSources.favouriteStatus]: 'favouriteStatus' } as const
const orderingDirectionMessageKeys = {
  [orderingSources.cefrLevel]: { [orderingDirections.ascending]: 'ascendingCefrLevels', [orderingDirections.descending]: 'descendingCefrLevels' },
  [orderingSources.wordType]: { [orderingDirections.ascending]: 'ascendingAlphabetically', [orderingDirections.descending]: 'descendingAlphabetically' },
  [orderingSources.vocabularyItem]: { [orderingDirections.ascending]: 'ascendingAlphabetically', [orderingDirections.descending]: 'descendingAlphabetically' },
  [orderingSources.favouriteStatus]: { [orderingDirections.ascending]: 'ascendingFavouriteStatus', [orderingDirections.descending]: 'descendingFavouriteStatus' },
} as const

function getGermanHeadword(item: VocabularyItemData | ResolvedVocabularyItemData): string {
  return 'nominative' in item ? item.nominative : 'positive' in item ? item.positive : item.infinitive
}

function getVocabularySearchText(item: ResolvedVocabularyItemData): string {
  return 'nominative' in item
    ? [item.nominative, item.gender, item.plural, ...item.translations].join(' ')
    : 'positive' in item
      ? [item.positive, ...item.translations].join(' ')
      : [item.infinitive, item.helper_verb, item.conjugation_type, item.present, item.preterite, item.perfect, ...item.translations].join(' ')
}

function toVocabularyItemData(item: ResolvedVocabularyItemData): VocabularyItemData {
  const { wordState: _, learningScore: __, learningStatistics: ___, isFavourite: ____, ...vocabularyItem } = item
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
