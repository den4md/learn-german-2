import { useEffect, useMemo, useRef, useState } from 'react'
import { allCefrLevels, allWordTypes, nounGenders, verbConjugationTypes, verbHelperVerbs, wordStates, wordTypes } from '../domain/constants'
import type { CefrLevel, WordState, WordType } from '../domain/constants'
import { vocabularyItemId } from '../domain/identifiers'
import type { VocabularyItemId } from '../domain/identifiers'
import type { LearningData } from '../domain/learning-data'
import { DefaultVocabularySet, getWordType, resolveVocabularyItems } from '../domain/vocabulary'
import type { VocabularyItemData } from '../domain/vocabulary'
import { useDefaultVocabularySet } from '../default-vocabulary-set/use-default-vocabulary-set'
import { useInterfaceLanguage } from '../i18n/interface-language-context'
import { GermanTextFields } from './vocabulary-view'

interface VocabularyCreateViewProps {
  learningData: LearningData
  onBack(): void
  onAddVocabularyItem(item: VocabularyItemData, wordState: WordState, isFavourite: boolean): Promise<void>
  onEditVocabularyItem(id: VocabularyItemId): void
  onUnsavedChangesChange(hasChanges: boolean): void
}

export function VocabularyCreateView({ learningData, onBack, onAddVocabularyItem, onEditVocabularyItem, onUnsavedChangesChange }: VocabularyCreateViewProps) {
  const { t } = useInterfaceLanguage()
  const { defaultVocabularySet, hasLoadError } = useDefaultVocabularySet()
  const [wordType, setWordType] = useState<WordType>(wordTypes.noun)
  const [level, setLevel] = useState<CefrLevel>(allCefrLevels[0])
  const [germanDrafts, setGermanDrafts] = useState(createGermanDrafts)
  const [translations, setTranslations] = useState([{ id: 0, text: '' }])
  const nextTranslationId = useRef(1)
  const [wordState, setWordState] = useState<WordState>(wordStates.new)
  const [isFavourite, setIsFavourite] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<'requiredVocabularyFields' | 'couldNotSaveWord'>()
  const formRef = useRef<HTMLFormElement>(null)
  const item = { ...germanDrafts[wordType], level }
  const headword = getHeadword(item).trim()
  const hasChanges = wordType !== wordTypes.noun || level !== allCefrLevels[0]
    || JSON.stringify(germanDrafts) !== JSON.stringify(createGermanDrafts())
    || translations.length !== 1 || translations[0].text !== ''
    || wordState !== wordStates.new || isFavourite

  useEffect(() => {
    onUnsavedChangesChange(hasChanges)
    return () => onUnsavedChangesChange(false)
  }, [hasChanges, onUnsavedChangesChange])

  const vocabularyItems = useMemo(() => resolveVocabularyItems(
    defaultVocabularySet ?? DefaultVocabularySet.fromItems([]),
    learningData.userAddedVocabularyItems,
    learningData.vocabularyLearningRecords,
  ).map((candidate) => candidate.toData()), [defaultVocabularySet, learningData])
  const duplicates = headword === '' ? [] : vocabularyItems.filter((candidate) =>
    getHeadword(candidate).trim().normalize('NFC').toLocaleLowerCase('de') === headword.normalize('NFC').toLocaleLowerCase('de'),
  )
  const inputClassName = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100'
  const buttonClassName = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100'

  const save = async () => {
    if (isSaving) return
    const nonEmptyTranslations = translations.map((translation) => translation.text.trim()).filter((translation) => translation !== '')
    if (headword === '' || nonEmptyTranslations.length === 0) {
      setError('requiredVocabularyFields')
      const input = headword === '' ? formRef.current?.querySelector<HTMLInputElement>('[data-german-fields] input') : formRef.current?.querySelector<HTMLInputElement>('[data-translations] input')
      input?.focus()
      return
    }
    const trimmedItem: VocabularyItemData = 'nominative' in item
      ? { ...item, nominative: headword, plural: item.plural.trim() }
      : 'positive' in item
        ? { ...item, positive: headword }
        : { ...item, infinitive: headword, present: item.present.trim(), preterite: item.preterite.trim(), perfect: item.perfect.trim() }
    setError(undefined)
    setIsSaving(true)
    try {
      await onAddVocabularyItem({ ...trimmedItem, translations: nonEmptyTranslations }, wordState, isFavourite)
    } catch {
      setError('couldNotSaveWord')
      setIsSaving(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void save() }} ref={formRef}>
      <fieldset className="min-w-0 space-y-6 disabled:opacity-70" disabled={isSaving}>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">{t('addWord')}</h2>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">{t('addWordDescription')}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">{t('wordType')}<select className={inputClassName} onChange={(event) => setWordType(event.target.value as WordType)} value={wordType}>{allWordTypes.map((type) => <option key={type} value={type}>{t(wordTypeMessageKeys[type])}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700">{t('cefrLevel')}<select className={inputClassName} onChange={(event) => setLevel(event.target.value as CefrLevel)} value={level}>{allCefrLevels.map((cefrLevel) => <option key={cefrLevel} value={cefrLevel}>{cefrLevel}</option>)}</select></label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" data-german-fields>
          <h3 className="text-xl font-bold tracking-tight text-slate-950">{t('germanText')}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t('germanHeadwordRequired')}</p>
          <GermanTextFields item={item} onChange={(nextItem) => setGermanDrafts((current) => ({ ...current, [wordType]: { ...nextItem, level: allCefrLevels[0] } }))} />
          {duplicates.length > 0 ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
            <p className="font-semibold text-amber-950">{t('duplicateWordWarning')}</p>
            <p className="mt-1 text-sm leading-6 text-amber-900">{t('duplicateWordDescription')}</p>
            <ul className="mt-3 divide-y divide-amber-200">
              {duplicates.map((duplicate) => <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={duplicate.id}><div className="min-w-0"><p className="break-words font-semibold text-slate-950">{getHeadword(duplicate)} <span className="text-sm font-normal text-slate-600">{duplicate.level}, {t(wordTypeMessageKeys[getWordType(duplicate)])}</span></p><p className="mt-1 break-words text-sm text-slate-700">{duplicate.translations.join(', ')}</p></div><button className={buttonClassName} onClick={() => onEditVocabularyItem(duplicate.id)} type="button">{t('editExistingWord')}</button></li>)}
            </ul>
          </div> : null}
          {defaultVocabularySet === undefined && !hasLoadError ? <p className="mt-4 text-sm text-slate-600" role="status">{t('loadingVocabulary')}</p> : null}
          {hasLoadError ? <p className="mt-4 text-sm text-amber-800" role="status">{t('couldNotCheckDuplicates')}</p> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" data-translations>
          <h3 className="text-xl font-bold tracking-tight text-slate-950">{t('russianTranslations')}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t('translationRequired')}</p>
          <div className="mt-5 space-y-3">
            {translations.map((translation, index) => <div className="flex flex-wrap items-end gap-2" key={translation.id}>
              <label className="min-w-0 basis-full text-sm font-semibold text-slate-700 sm:flex-1 sm:basis-auto">{t('russianTranslation')} {index + 1}<input className={inputClassName} onChange={(event) => setTranslations((current) => current.map((candidate) => candidate.id === translation.id ? { ...candidate, text: event.target.value } : candidate))} value={translation.text} /></label>
              <button aria-label={`${t('moveUp')}: ${t('russianTranslation')} ${index + 1}`} className={buttonClassName} disabled={index === 0} onClick={() => setTranslations((current) => moveTranslation(current, index, index - 1))} type="button">{t('moveUp')}</button>
              <button aria-label={`${t('moveDown')}: ${t('russianTranslation')} ${index + 1}`} className={buttonClassName} disabled={index === translations.length - 1} onClick={() => setTranslations((current) => moveTranslation(current, index, index + 1))} type="button">{t('moveDown')}</button>
              <button aria-label={`${t('removeTranslation')}: ${t('russianTranslation')} ${index + 1}`} className={buttonClassName} disabled={translations.length === 1} onClick={() => setTranslations((current) => current.filter((candidate) => candidate.id !== translation.id))} type="button">{t('removeTranslation')}</button>
            </div>)}
          </div>
          <button className={`mt-4 ${buttonClassName}`} onClick={() => { const id = nextTranslationId.current++; setTranslations((current) => [...current, { id, text: '' }]) }} type="button">{t('addTranslation')}</button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="text-xl font-bold tracking-tight text-slate-950">{t('learningChoices')}</h3>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <label className="text-sm font-semibold text-slate-700">{t('wordState')}<select className={inputClassName} onChange={(event) => setWordState(event.target.value as WordState)} value={wordState}>{Object.values(wordStates).map((state) => <option key={state} value={state}>{t(wordStateMessageKeys[state])}</option>)}</select></label>
            <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-700"><input checked={isFavourite} onChange={(event) => setIsFavourite(event.target.checked)} type="checkbox" />{t('favourite')}</label>
          </div>
        </section>

        {error !== undefined && (error === 'couldNotSaveWord' || headword === '' || !translations.some((translation) => translation.text.trim() !== '')) ? <p className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-800" role="alert">{t(error)}</p> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={onBack} type="button">{t('cancel')}</button>
          <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-200" disabled={defaultVocabularySet === undefined && !hasLoadError} type="submit">{isSaving ? t('savingWord') : t('addWord')}</button>
        </div>
      </fieldset>
    </form>
  )
}

function createGermanDrafts(): Record<WordType, VocabularyItemData> {
  const base = { id: vocabularyItemId(0), level: allCefrLevels[0], translations: [] }
  return {
    [wordTypes.noun]: { ...base, nominative: '', gender: nounGenders.male, plural: '' },
    [wordTypes.adjective]: { ...base, positive: '' },
    [wordTypes.verb]: { ...base, infinitive: '', helper_verb: verbHelperVerbs.haben, conjugation_type: verbConjugationTypes.regular, present: '', preterite: '', perfect: '' },
  }
}

function getHeadword(item: VocabularyItemData): string {
  return 'nominative' in item ? item.nominative : 'positive' in item ? item.positive : item.infinitive
}

function moveTranslation(items: Array<{ id: number; text: string }>, fromIndex: number, toIndex: number): Array<{ id: number; text: string }> {
  const nextItems = [...items]
  const [item] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, item)
  return nextItems
}

const wordTypeMessageKeys = { [wordTypes.adjective]: 'adjective', [wordTypes.noun]: 'noun', [wordTypes.verb]: 'verb' } as const
const wordStateMessageKeys = { [wordStates.new]: 'wordStateNew', [wordStates.learning]: 'wordStateLearning', [wordStates.known]: 'wordStateKnown', [wordStates.excluded]: 'wordStateExcluded' } as const
