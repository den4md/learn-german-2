import { useState } from 'react'
import { allCefrLevels, allWordTypes, cardSides, favouriteStatusFilters, orderingDirections, sessionTypes, wordTypes } from '../domain/constants'
import type { Dispatch, SetStateAction } from 'react'
import type { CefrLevel, OrderingDirection, OrderingSource, SessionType, WordType } from '../domain/constants'
import { sessionId } from '../domain/identifiers'
import type { LearningData } from '../domain/learning-data'
import { Session, SessionSettings } from '../domain/session'
import type { SessionSettingsData } from '../domain/session'
import { useDefaultVocabularySet } from '../default-vocabulary-set/use-default-vocabulary-set'
import { useInterfaceLanguage } from '../i18n/interface-language-context'
import { selectSessionVocabularyItemIds } from '../app/select-session-vocabulary-item-ids'

import { CollapsibleControls, FavouriteFilter, SortingOptions } from '../components/browse-controls'

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
  const [favourites, setFavourites] = useState<boolean[]>([true, false])
  const toggleFavourite = (value: boolean) => {
    const nextValues = toggleValue(favourites, value)
    setFavourites(nextValues)
    setSettings((currentSettings) => ({ ...currentSettings, favouriteStatusFilter: nextValues.length === 1 ? nextValues[0] ? favouriteStatusFilters.favourites : favouriteStatusFilters.nonFavourites : favouriteStatusFilters.all }))
  }
  const { defaultVocabularySet, hasLoadError } = useDefaultVocabularySet()
  const [startFailure, setStartFailure] = useState<'no-matching-items' | 'active-session' | undefined>()

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
  const toggleShuffled = () => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      orderingSources: isShuffled(currentSettings.orderingSources)
        ? createDefaultOrderingSources()
        : currentSettings.orderingSources.map((orderingSource) => ({
          ...orderingSource,
          direction: orderingDirections.none,
        })),
    }))
  }
  const changeOrderingDirection = (source: OrderingSource, direction: OrderingDirection) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      orderingSources: currentSettings.orderingSources.map((orderingSource) =>
        orderingSource.source === source ? { ...orderingSource, direction } : orderingSource,
      ),
    }))
  }
  const startSession = () => {
    if (learningData.activeSession !== undefined) {
      setStartFailure('active-session')
      return
    }
    if (defaultVocabularySet === undefined) {
      return
    }

    const sessionSettings = SessionSettings.fromData(settings)
    const vocabularyItemIds = selectSessionVocabularyItemIds(
      learningData,
      defaultVocabularySet,
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
            <SessionTypeOption checked={sessionType === sessionTypes.knowledgeCheck} description={t('knowledgeCheckSessionDescription')} label={t('knowledgeCheckSession')} value={sessionTypes.knowledgeCheck} onChange={setSessionType} />
            <SessionTypeOption checked={sessionType === sessionTypes.learning} description={t('learningSessionDescription')} label={t('learningSession')} value={sessionTypes.learning} onChange={setSessionType} />
            <SessionTypeOption checked={sessionType === sessionTypes.repetition} description={t('repetitionSessionDescription')} label={t('repetitionSession')} value={sessionTypes.repetition} onChange={setSessionType} />
          </div>
        </fieldset>

        <CollapsibleControls defaultExpanded title={t('filters')}>
          <div className="grid gap-6 md:grid-cols-2">
            <CheckboxGroup label={t('cefrLevels')} values={allCefrLevels} selectedValues={settings.cefrLevels} onToggle={toggleCefrLevel} />
            <CheckboxGroup label={t('wordTypes')} labels={{ [wordTypes.noun]: t('noun'), [wordTypes.adjective]: t('adjective'), [wordTypes.verb]: t('verb') }} values={allWordTypes} selectedValues={settings.wordTypes} onToggle={toggleWordType} />
          </div>
          <FavouriteFilter selectedValues={favourites} onToggle={toggleFavourite} />
        </CollapsibleControls>

        <CollapsibleControls defaultExpanded title={t('sorting')}>
          <p className="text-sm leading-6 text-slate-600">{t('sortingDescription')}</p>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
            <input checked={isShuffled(settings.orderingSources)} className="accent-blue-700" type="checkbox" onChange={toggleShuffled} />
            {t('shuffled')}
          </label>
          <div className="space-y-4">
            {settings.orderingSources.map((orderingSource, index) => (
              <SortingOptions key={orderingSource.source} source={orderingSource.source} direction={orderingSource.direction}
                onChange={(direction) => changeOrderingDirection(orderingSource.source, direction)}
                onMoveEarlier={index === 0 ? undefined : () => moveOrderingSource(index, index - 1, setSettings)}
                onMoveLater={index === settings.orderingSources.length - 1 ? undefined : () => moveOrderingSource(index, index + 1, setSettings)} />
            ))}
          </div>
        </CollapsibleControls>

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
      {hasLoadError ? <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">{t('couldNotLoadVocabulary')}</p> : null}
      <button className="mt-8 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:bg-blue-300" disabled={defaultVocabularySet === undefined} type="button" onClick={startSession}>
        {hasLoadError ? t('couldNotLoadVocabulary') : defaultVocabularySet === undefined ? t('loadingVocabulary') : t('startSession')}
      </button>
    </section>
  )
}

function SessionTypeOption({ checked, description, label, value, onChange }: { checked: boolean; description: string; label: string; value: SessionType; onChange(value: SessionType): void }) {
  return <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 has-checked:border-blue-600 has-checked:bg-blue-50">
    <input checked={checked} className="mt-0.5" name="session-type" type="radio" value={value} onChange={() => onChange(value)} />
    <span><span className="block font-semibold">{label}</span><span className="mt-1 block leading-5 text-slate-600">{description}</span></span>
  </label>
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

function createDefaultOrderingSources(): SessionSettingsData['orderingSources'] {
  return SessionSettings.createDefault().toData().orderingSources
}

function isShuffled(orderingSourceData: SessionSettingsData['orderingSources']): boolean {
  return orderingSourceData.every((orderingSource) => orderingSource.direction === orderingDirections.none)
}

function moveOrderingSource(index: number, nextIndex: number, setSettings: Dispatch<SetStateAction<SessionSettingsData>>) {
  setSettings((currentSettings) => {
    const orderingSources = [...currentSettings.orderingSources]
    const [orderingSource] = orderingSources.splice(index, 1)
    orderingSources.splice(nextIndex, 0, orderingSource!)
    return { ...currentSettings, orderingSources }
  })
}
