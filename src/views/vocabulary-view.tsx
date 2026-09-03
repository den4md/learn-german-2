import { useEffect, useMemo, useState } from 'react'
import { nounGenders, verbConjugationTypes, verbHelperVerbs, wordStates, wordTypes } from '../domain/constants'
import type { WordState } from '../domain/constants'
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
import { PopupMenu } from '../components/popup-menu'

const vocabularyPageSize = 50

interface VocabularyViewProps {
  learningData: LearningData
  onChangeWordState(vocabularyItemId: VocabularyItemId, wordState: WordState): void
  onChangeFavouriteStatus(vocabularyItemId: VocabularyItemId, isFavourite: boolean): void
  onEditVocabularyItem(vocabularyItemId: VocabularyItemId): void
}

export function VocabularyView({
  learningData,
  onChangeWordState,
  onChangeFavouriteStatus,
  onEditVocabularyItem,
}: VocabularyViewProps) {
  const { t } = useInterfaceLanguage()
  const [defaultVocabularyItems, setDefaultVocabularyItems] = useState<VocabularyItemData[] | undefined>()
  const [hasLoadError, setHasLoadError] = useState(false)
  const [query, setQuery] = useState('')
  const [wordStateFilter, setWordStateFilter] = useState<'all' | WordState>('all')
  const [page, setPage] = useState(1)

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
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredVocabularyItems = vocabularyItems.filter((item) =>
    (wordStateFilter === 'all' || item.wordState === wordStateFilter) &&
    (normalizedQuery === '' || getVocabularySearchText(item).toLocaleLowerCase().includes(normalizedQuery)),
  )
  const pageCount = Math.max(1, Math.ceil(filteredVocabularyItems.length / vocabularyPageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleVocabularyItems = filteredVocabularyItems.slice(
    (currentPage - 1) * vocabularyPageSize,
    currentPage * vocabularyPageSize,
  )

  const changeQuery = (nextQuery: string) => {
    setQuery(nextQuery)
    setPage(1)
  }

  const changeWordStateFilter = (nextWordStateFilter: 'all' | WordState) => {
    setWordStateFilter(nextWordStateFilter)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">{t('navigationVocabulary')}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t('vocabularyManagementTitle')}</h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">{t('vocabularyManagementDescription')}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
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
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {t('wordState')}
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              onChange={(event) => changeWordStateFilter(event.target.value as 'all' | WordState)}
              value={wordStateFilter}
            >
              <option value="all">{t('allVocabularyItems')}</option>
              {Object.values(wordStates).map((wordState) => (
                <option key={wordState} value={wordState}>{t(wordStateMessageKeys[wordState])}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {defaultVocabularyItems === undefined && !hasLoadError ? <VocabularyNotice>{t('loadingVocabulary')}</VocabularyNotice> : null}
      {hasLoadError ? <VocabularyNotice tone="error">{t('couldNotLoadVocabulary')}</VocabularyNotice> : null}
      {defaultVocabularyItems !== undefined && !hasLoadError ? (
        <section aria-labelledby="vocabulary-results-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-8">
            <h3 className="text-xl font-bold tracking-tight text-slate-950" id="vocabulary-results-title">{t('vocabularyResults')}</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">{filteredVocabularyItems.length}</span>
          </div>
          {visibleVocabularyItems.length === 0 ? (
            <p className="border-t border-slate-100 px-6 py-8 text-slate-600 sm:px-8">{t('noVocabularyMatches')}</p>
          ) : (
            <ol className="divide-y divide-slate-100 border-t border-slate-100">
              {visibleVocabularyItems.map((item) => (
                <VocabularyManagementRow
                  item={item}
                  key={item.id}
                  onChangeFavouriteStatus={onChangeFavouriteStatus}
                  onChangeWordState={onChangeWordState}
                  onEditVocabularyItem={onEditVocabularyItem}
                />
              ))}
            </ol>
          )}
          <VocabularyPagination currentPage={currentPage} pageCount={pageCount} onChangePage={setPage} />
        </section>
      ) : null}
    </div>
  )
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
  const { t } = useInterfaceLanguage()

  return (
    <li className="grid gap-4 px-6 py-5 sm:px-8 lg:grid-cols-[minmax(15rem,1fr)_auto] lg:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-950">{getGermanHeadword(item)}</p>
          {item.isFavourite ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">{t('favourite')}</span> : null}
        </div>
        <p className="mt-1 text-sm text-slate-600">{item.translations.join(', ')}</p>
        <p className="mt-2 text-sm font-medium text-blue-700">{item.level} · {t(wordTypeMessageKeys[getWordType(item)])} · {t(wordStateMessageKeys[item.wordState])}</p>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={() => onChangeFavouriteStatus(item.id, !item.isFavourite)} type="button">
          {t(item.isFavourite ? 'removeFavourite' : 'addFavourite')}
        </button>
        <PopupMenu menuAriaLabel={t('changeWordState')} menuClassName="absolute right-0 z-10 mt-2 grid w-40 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-300/40" triggerAriaLabel={t('changeWordState')} triggerClassName="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" triggerContent={t('changeWordState')}>
          {(onSelect) => <>{Object.values(wordStates).map((wordState) => (
            <button className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100" key={wordState} role="menuitem" onClick={() => { onSelect(); onChangeWordState(item.id, wordState) }} type="button">
              {t(wordStateMessageKeys[wordState])}
            </button>
          ))}</>}
        </PopupMenu>
        <button className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-200" onClick={() => onEditVocabularyItem(item.id)} type="button">{t('edit')}</button>
      </div>
    </li>
  )
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

function VocabularyNotice({ children, tone = 'normal' }: { children: string; tone?: 'error' | 'normal' }) {
  return <p className={`rounded-2xl border p-6 shadow-sm ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-600'}`}>{children}</p>
}

function Metadata({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-medium text-slate-600">{label}</dt><dd className="mt-1 font-semibold text-slate-950">{value}</dd></div>
}

const wordTypeMessageKeys = { [wordTypes.adjective]: 'adjective', [wordTypes.noun]: 'noun', [wordTypes.verb]: 'verb' } as const
const wordStateMessageKeys = { [wordStates.new]: 'wordStateNew', [wordStates.learning]: 'wordStateLearning', [wordStates.known]: 'wordStateKnown', [wordStates.excluded]: 'wordStateExcluded' } as const

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
