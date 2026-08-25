import { useEffect, useState } from 'react'
import { allCefrLevels, allWordTypes, cardSides, favouriteStatusFilters, orderingDirections, orderingSources, sessionTypes, wordTypes } from '../domain/constants'
import type { Dispatch, SetStateAction } from 'react'
import type { CefrLevel, FavouriteStatusFilter, SessionType, WordType } from '../domain/constants'
import { sessionId } from '../domain/identifiers'
import type { LearningData } from '../domain/learning-data'
import { Session, SessionSettings } from '../domain/session'
import type { SessionSettingsData } from '../domain/session'
import type { VocabularyItemData } from '../domain/vocabulary'
import { loadAllDefaultVocabularyItems } from '../default-vocabulary-set/load-default-vocabulary-items'
import { useInterfaceLanguage } from '../i18n/interface-language-context'
import { selectSessionVocabularyItemIds } from '../app/select-session-vocabulary-item-ids'

interface SessionSetupViewProps {
  learningData: LearningData
  onBack(): void
  onSessionStarted(session: Session): void
}

export function SessionSetupView({ learningData, onBack, onSessionStarted }: SessionSetupViewProps) {
  const { t } = useInterfaceLanguage()
  const [sessionType, setSessionType] = useState<SessionType>(sessionTypes.knowledgeCheck)
  const [settings, setSettings] = useState<SessionSettingsData>(() => ({
    ...SessionSettings.createDefault().toData(),
    itemLimit: 10,
  }))
  const [defaultVocabularyItems, setDefaultVocabularyItems] = useState<VocabularyItemData[]>()
  const [startFailure, setStartFailure] = useState<'no-matching-items' | 'active-session' | undefined>()

  useEffect(() => {
    let isCurrent = true
    void loadAllDefaultVocabularyItems().then((items) => {
      if (isCurrent) {
        setDefaultVocabularyItems(items)
      }
    })
    return () => {
      isCurrent = false
    }
  }, [])

  const toggleCefrLevel = (level: CefrLevel) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      cefrLevels: toggleValue(currentSettings.cefrLevels, level),
    }))
  }
  const toggleWordType = (wordType: WordType) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      wordTypes: toggleValue(currentSettings.wordTypes, wordType),
    }))
  }
  const startSession = () => {
    if (learningData.activeSession !== undefined) {
      setStartFailure('active-session')
      return
    }
    if (defaultVocabularyItems === undefined) {
      return
    }

    const sessionSettings = SessionSettings.fromData(settings)
    const vocabularyItemIds = selectSessionVocabularyItemIds(
      learningData,
      defaultVocabularyItems,
      sessionType,
      sessionSettings.toData(),
    )
    if (vocabularyItemIds.length === 0) {
      setStartFailure('no-matching-items')
      return
    }

    onSessionStarted(
      Session.start(
        sessionId(crypto.randomUUID()),
        sessionType,
        sessionSettings,
        vocabularyItemIds,
        new Date().toISOString(),
      ),
    )
  }

  return (
    <section className="max-w-4xl">
      <button className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" type="button" onClick={onBack}>
        {t('backToProgression')}
      </button>
      <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-950">{t('startSession')}</h2>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">{t('sessionSetupDescription')}</p>

      <div className="mt-8 space-y-8">
        <fieldset>
          <legend className="text-lg font-bold text-slate-950">{t('sessionType')}</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <SessionTypeOption checked={sessionType === sessionTypes.knowledgeCheck} label={t('knowledgeCheckSession')} value={sessionTypes.knowledgeCheck} onChange={setSessionType} />
            <SessionTypeOption checked={sessionType === sessionTypes.learning} label={t('learningSession')} value={sessionTypes.learning} onChange={setSessionType} />
            <SessionTypeOption checked={sessionType === sessionTypes.repetition} label={t('repetitionSession')} value={sessionTypes.repetition} onChange={setSessionType} />
          </div>
        </fieldset>

        <fieldset className="border-t border-slate-200 pt-8">
          <legend className="text-lg font-bold text-slate-950">{t('ordering')}</legend>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t('orderingDescription')}</p>
          <div className="mt-4 space-y-3">
            {settings.orderingSources.map((orderingSource, index) => (
              <div className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_12rem_auto] sm:items-center" key={orderingSource.source}>
                <span className="font-semibold text-slate-800">{t(orderingSourceMessageKeys[orderingSource.source])}</span>
                <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100" value={orderingSource.direction} onChange={(event) => setSettings((currentSettings) => ({ ...currentSettings, orderingSources: currentSettings.orderingSources.map((candidate) => candidate.source === orderingSource.source ? { ...candidate, direction: event.target.value as typeof orderingSource.direction } : candidate) }))}>
                  <option value={orderingDirections.none}>{t('noSorting')}</option><option value={orderingDirections.ascending}>{t('ascending')}</option><option value={orderingDirections.descending}>{t('descending')}</option>
                </select>
                <div className="flex gap-2"><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={index === 0} type="button" onClick={() => moveOrderingSource(index, index - 1, setSettings)}>{t('earlier')}</button><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={index === settings.orderingSources.length - 1} type="button" onClick={() => moveOrderingSource(index, index + 1, setSettings)}>{t('later')}</button></div>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-t border-slate-200 pt-8">
          <legend className="text-lg font-bold text-slate-950">{t('filters')}</legend>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <CheckboxGroup label={t('cefrLevels')} values={allCefrLevels} selectedValues={settings.cefrLevels} onToggle={toggleCefrLevel} />
            <CheckboxGroup label={t('wordTypes')} labels={{ [wordTypes.noun]: t('noun'), [wordTypes.adjective]: t('adjective'), [wordTypes.verb]: t('verb') }} values={allWordTypes} selectedValues={settings.wordTypes} onToggle={toggleWordType} />
          </div>
          <label className="mt-6 block max-w-xs text-sm font-semibold text-slate-700">
            <span>{t('favouriteStatus')}</span>
            <select className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100" value={settings.favouriteStatusFilter} onChange={(event) => setSettings((currentSettings) => ({ ...currentSettings, favouriteStatusFilter: event.target.value as FavouriteStatusFilter }))}>
              <option value={favouriteStatusFilters.all}>{t('allItems')}</option>
              <option value={favouriteStatusFilters.favourites}>{t('favouritesOnly')}</option>
              <option value={favouriteStatusFilters.nonFavourites}>{t('nonFavouritesOnly')}</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="border-t border-slate-200 pt-8">
          <legend className="text-lg font-bold text-slate-950">{t('cardAndLimit')}</legend>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              <span>{t('itemLimit')}</span>
              <select className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100" value={settings.itemLimit ?? 'unlimited'} onChange={(event) => setSettings((currentSettings) => ({ ...currentSettings, itemLimit: event.target.value === 'unlimited' ? undefined : Number(event.target.value) }))}>
                {[10, 20, 30, 50].map((limit) => <option key={limit} value={limit}>{limit}</option>)}
                <option value="unlimited">{t('unlimited')}</option>
              </select>
            </label>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">{t('firstCardSide')}</legend>
              <div className="mt-3 flex gap-4">
                <RadioOption checked={settings.firstCardSide === cardSides.german} label={t('germanFirst')} value={cardSides.german} name="first-card-side" onChange={(value) => setSettings((currentSettings) => ({ ...currentSettings, firstCardSide: value }))} />
                <RadioOption checked={settings.firstCardSide === cardSides.russian} label={t('russianFirst')} value={cardSides.russian} name="first-card-side" onChange={(value) => setSettings((currentSettings) => ({ ...currentSettings, firstCardSide: value }))} />
              </div>
            </fieldset>
          </div>
        </fieldset>
      </div>

      {startFailure === 'no-matching-items' ? <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">{t('noMatchingItems')}</p> : null}
      {startFailure === 'active-session' ? <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">{t('activeSessionAlreadyExists')}</p> : null}
      <button className="mt-8 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:bg-blue-300" disabled={defaultVocabularyItems === undefined} type="button" onClick={startSession}>
        {defaultVocabularyItems === undefined ? t('loadingVocabulary') : t('startSession')}
      </button>
    </section>
  )
}

function SessionTypeOption({ checked, label, value, onChange }: { checked: boolean; label: string; value: SessionType; onChange(value: SessionType): void }) {
  return <RadioOption checked={checked} label={label} name="session-type" value={value} onChange={onChange} />
}

function RadioOption<T extends string>({ checked, label, name, value, onChange }: { checked: boolean; label: string; name: string; value: T; onChange(value: T): void }) {
  return <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 has-checked:border-blue-600 has-checked:bg-blue-50">
    <input checked={checked} name={name} type="radio" value={value} onChange={() => onChange(value)} />
    {label}
  </label>
}

function CheckboxGroup<T extends string>({ label, labels, values, selectedValues, onToggle }: { label: string; labels?: Partial<Record<T, string>>; values: readonly T[]; selectedValues: T[]; onToggle(value: T): void }) {
  return <div>
    <p className="text-sm font-semibold text-slate-700">{label}</p>
    <div className="mt-3 flex flex-wrap gap-3">
      {values.map((value) => <label className="flex items-center gap-2 text-sm text-slate-700" key={value}><input checked={selectedValues.includes(value)} type="checkbox" onChange={() => onToggle(value)} />{labels?.[value] ?? value}</label>)}
    </div>
  </div>
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((candidate) => candidate !== value) : [...values, value]
}

const orderingSourceMessageKeys = { [orderingSources.cefrLevel]: 'cefrLevels', [orderingSources.wordType]: 'wordTypes', [orderingSources.vocabularyItem]: 'vocabulary', [orderingSources.favouriteStatus]: 'favouriteStatus' } as const

function moveOrderingSource(index: number, nextIndex: number, setSettings: Dispatch<SetStateAction<SessionSettingsData>>) {
  setSettings((currentSettings) => {
    const orderingSources = [...currentSettings.orderingSources]
    const [orderingSource] = orderingSources.splice(index, 1)
    orderingSources.splice(nextIndex, 0, orderingSource!)
    return { ...currentSettings, orderingSources }
  })
}
