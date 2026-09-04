import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { cardSides, recallSelfAssessments, sessionTypes, wordStates, wordTypes } from '../domain/constants'
import type { SelfAssessment } from '../domain/constants'
import type { VocabularyItemId } from '../domain/identifiers'
import type { LearningData } from '../domain/learning-data'
import type { SessionSettingsData } from '../domain/session'
import type { ResolvedVocabularyItemData, VocabularyItemData } from '../domain/vocabulary'
import { DefaultVocabularySet, VocabularyItem, resolveVocabularyItems } from '../domain/vocabulary'
import { loadAllDefaultVocabularyItems } from '../default-vocabulary-set/load-default-vocabulary-items'
import { selectSessionVocabularyItemIds } from '../app/select-session-vocabulary-item-ids'
import { useInterfaceLanguage } from '../i18n/interface-language-context'
import { PopupMenu } from '../components/popup-menu'

interface ActiveSessionViewProps {
  learningData: LearningData
  onShowEntry(entryIndex: number): void
  onShowCandidate(vocabularyItemId: VocabularyItemId): void
  onRevealEntry(entryIndex: number): void
  onAssessEntry(entryIndex: number, selfAssessment: SelfAssessment): void
  onChangeFavouriteStatus(vocabularyItemId: VocabularyItemId, isFavourite: boolean): void
  onEndSession(): void
  onEditVocabularyItem(vocabularyItemId: VocabularyItemId): void
  onManuallySetWordState(entryIndex: number, wordState: typeof wordStates[keyof typeof wordStates]): void
  onOpenProgression(): void
  onOpenSessionSetup(): void
  onOpenSettings(): void
  onOpenVocabulary(): void
  onSelectNextCandidatePage(vocabularyItemIds: VocabularyItemId[]): void
}

export function ActiveSessionView({ learningData, onShowEntry, onShowCandidate, onRevealEntry, onAssessEntry, onChangeFavouriteStatus, onEndSession, onEditVocabularyItem, onManuallySetWordState, onOpenProgression, onOpenSessionSetup, onOpenSettings, onOpenVocabulary, onSelectNextCandidatePage }: ActiveSessionViewProps) {
  const { t } = useInterfaceLanguage()
  const [defaultVocabularyItems, setDefaultVocabularyItems] = useState<VocabularyItemData[]>()
  const [vocabularyLoadError, setVocabularyLoadError] = useState(false)
  const activeSession = learningData.activeSession
  const resolvedVocabularyItems = useMemo(() => defaultVocabularyItems === undefined ? [] : resolveVocabularyItems(DefaultVocabularySet.fromItems(defaultVocabularyItems.map(VocabularyItem.fromData)), learningData.userAddedVocabularyItems, learningData.vocabularyLearningRecords), [defaultVocabularyItems, learningData])
  const vocabularyItemsById = useMemo(() => new Map(resolvedVocabularyItems.map((item) => [item.id, item.toData()])), [resolvedVocabularyItems])
  const activeEntryIndex = activeSession?.entries.findIndex((entry) => entry.selfAssessment === undefined && entry.manualWordState === undefined) ?? -1
  const activeEntry = activeEntryIndex === -1 || activeSession === undefined ? undefined : activeSession.entryAt(activeEntryIndex)
  const [isEndSessionConfirmationOpen, setIsEndSessionConfirmationOpen] = useState(false)
  const [shouldRestoreEndSessionFocus, setShouldRestoreEndSessionFocus] = useState(false)
  const endSessionButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let isCurrent = true
    void loadAllDefaultVocabularyItems().then((items) => {
      if (isCurrent) {
        setDefaultVocabularyItems(items)
      }
    }).catch(() => {
      if (isCurrent) {
        setVocabularyLoadError(true)
      }
    })
    return () => { isCurrent = false }
  }, [])

  useEffect(() => {
    if (activeSession === undefined || defaultVocabularyItems === undefined) {
      return
    }
    if (activeEntry !== undefined) {
      if (activeEntry.shownAt === undefined) {
        onShowEntry(activeEntryIndex)
      }
      return
    }
    if (!activeSession.isUnlimited) {
      return
    }
    if (activeSession.candidateVocabularyItemIds.length > 0) {
      onShowCandidate(activeSession.candidateVocabularyItemIds[0]!)
      return
    }
    if (activeSession.isCandidatePageComplete) {
      const presentedVocabularyItemIds = new Set(activeSession.entries.map((entry) => entry.vocabularyItemId))
      const candidateVocabularyItemIds = selectSessionVocabularyItemIds(learningData, defaultVocabularyItems, activeSession.type, activeSession.toData().settings).filter((id) => !presentedVocabularyItemIds.has(id))
      onSelectNextCandidatePage(candidateVocabularyItemIds)
    }
  }, [activeEntry, activeEntryIndex, activeSession, defaultVocabularyItems, learningData, onSelectNextCandidatePage, onShowCandidate, onShowEntry])

  if (activeSession === undefined) {
    return null
  }

  const vocabularyItem = activeEntry === undefined ? undefined : vocabularyItemsById.get(activeEntry.vocabularyItemId)
  const completedEntryCount = activeSession.entries.filter((entry) => entry.selfAssessment !== undefined || entry.manualWordState !== undefined).length
  const totalEntryCount = activeSession.isUnlimited ? completedEntryCount + activeSession.candidateVocabularyItemIds.length + (activeEntry === undefined ? 0 : 1) : activeSession.entries.length
  const closeEndSessionConfirmation = () => {
    setIsEndSessionConfirmationOpen(false)
    setShouldRestoreEndSessionFocus(true)
  }

  useEffect(() => {
    if (!shouldRestoreEndSessionFocus) return
    endSessionButton.current?.focus()
    setShouldRestoreEndSessionFocus(false)
  }, [shouldRestoreEndSessionFocus])

  return (
    <section className="-mt-4 sm:-mt-6">
      <header className="space-y-1 border-b border-slate-200 pb-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"><button className="rounded-lg text-left focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={onOpenProgression} type="button">{t('title')}</button></h1>
          <SessionNavigation onOpenProgression={onOpenProgression} onOpenSessionSetup={onOpenSessionSetup} onOpenSettings={onOpenSettings} onOpenVocabulary={onOpenVocabulary} />
        </div>
        <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{t(activeSession.type === sessionTypes.knowledgeCheck ? 'knowledgeCheckSession' : activeSession.type === sessionTypes.learning ? 'learningSession' : 'repetitionSession')}</h2><button className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" ref={endSessionButton} type="button" onClick={() => setIsEndSessionConfirmationOpen(true)}>{t('endSession')}</button></div>
        <p className="text-sm font-semibold text-slate-600">{t('sessionProgress')}: {completedEntryCount} / {totalEntryCount}{activeSession.isUnlimited ? ` ${t('remainingCards')}` : ''}</p>
      </header>

      {isEndSessionConfirmationOpen ? <EndSessionConfirmation onClose={closeEndSessionConfirmation} onEndSession={onEndSession} /> : null}

      {vocabularyLoadError ? <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">{t('cardCouldNotLoad')}</p> : null}
      {vocabularyItem === undefined ? <p className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-slate-600">{t('loadingCard')}</p> : activeEntry === undefined ? null : <Flashcard activeEntryIndex={activeEntryIndex} isRevealed={activeEntry.revealedAt !== undefined} sessionType={activeSession.type} settings={activeSession.toData().settings} vocabularyItem={vocabularyItem} onAssessEntry={onAssessEntry} onChangeFavouriteStatus={onChangeFavouriteStatus} onEditVocabularyItem={onEditVocabularyItem} onManuallySetWordState={onManuallySetWordState} onRevealEntry={onRevealEntry} />}
    </section>
  )
}

function Flashcard({ activeEntryIndex, isRevealed, sessionType, settings, vocabularyItem, onAssessEntry, onChangeFavouriteStatus, onEditVocabularyItem, onManuallySetWordState, onRevealEntry }: { activeEntryIndex: number; isRevealed: boolean; sessionType: string; settings: SessionSettingsData; vocabularyItem: ResolvedVocabularyItemData; onRevealEntry(entryIndex: number): void; onAssessEntry(entryIndex: number, selfAssessment: SelfAssessment): void; onChangeFavouriteStatus(vocabularyItemId: VocabularyItemId, isFavourite: boolean): void; onEditVocabularyItem(vocabularyItemId: VocabularyItemId): void; onManuallySetWordState(entryIndex: number, wordState: typeof wordStates[keyof typeof wordStates]): void }) {
  const { t } = useInterfaceLanguage()
  const [visibleSide, setVisibleSide] = useState<'first' | 'other'>(isRevealed ? 'other' : 'first')
  const [areRemainingTranslationsVisible, setAreRemainingTranslationsVisible] = useState(false)
  const [completionMotion, setCompletionMotion] = useState<CardMotion>()
  const [swipeMotion, setSwipeMotion] = useState<CardMotion>()
  const [isSwipeInProgress, setIsSwipeInProgress] = useState(false)
  const completionTimeout = useRef<number | undefined>(undefined)
  const swipeTimeout = useRef<number | undefined>(undefined)
  const swipeStart = useRef<SwipeStart | undefined>(undefined)
  const shouldIgnoreNextCardClick = useRef(false)
  const firstSideIsGerman = settings.firstCardSide === cardSides.german
  const isGermanVisible = visibleSide === 'first' ? firstSideIsGerman : !firstSideIsGerman
  const visibleSideLabel = t(isGermanVisible ? 'cardSideGerman' : 'cardSideRussian')
  const isCompletingEntry = completionMotion !== undefined

  useEffect(() => {
    setVisibleSide(isRevealed ? 'other' : 'first')
    setAreRemainingTranslationsVisible(false)
    setCompletionMotion(undefined)
    setSwipeMotion(undefined)
    setIsSwipeInProgress(false)
    swipeStart.current = undefined
    shouldIgnoreNextCardClick.current = false
  }, [activeEntryIndex, isRevealed])

  useEffect(() => () => {
    window.clearTimeout(completionTimeout.current)
    window.clearTimeout(swipeTimeout.current)
  }, [])

  const completeEntry = (motion: CardMotion, onComplete: () => void) => {
    if (isCompletingEntry) return
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 280
    setCompletionMotion(motion)
    completionTimeout.current = window.setTimeout(onComplete, duration)
  }

  const flipCard = () => {
    if (shouldIgnoreNextCardClick.current) {
      shouldIgnoreNextCardClick.current = false
      return
    }
    if (isCompletingEntry) return
    if (!isRevealed) {
      onRevealEntry(activeEntryIndex)
    }
    setVisibleSide((side) => side === 'first' ? 'other' : 'first')
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('a, input, button, select, textarea, summary, [role="menu"], [role="menuitem"]')) {
        return
      }
      if (isCompletingEntry) return
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault()
        flipCard()
        return
      }
      if (!isRevealed) {
        return
      }
      const selfAssessment = assessmentForArrowKey(sessionType, event.key)
      if (selfAssessment !== undefined) {
        event.preventDefault()
        completeEntry(motionForWordState(selfAssessment), () => onAssessEntry(activeEntryIndex, selfAssessment))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeEntryIndex, isCompletingEntry, isRevealed, onAssessEntry, onRevealEntry, sessionType])

  const startSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (!isRevealed || isCompletingEntry || event.pointerType !== 'touch' || event.target instanceof Element && event.target.closest('button, a, input, select, textarea, summary, [role="menu"], [role="menuitem"]')) return
    window.clearTimeout(swipeTimeout.current)
    swipeStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    setIsSwipeInProgress(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    const start = swipeStart.current
    if (start === undefined || start.pointerId !== event.pointerId) return
    const distanceX = event.clientX - start.x
    const distanceY = event.clientY - start.y
    if (Math.abs(distanceX) > 8 || Math.abs(distanceY) > 8) shouldIgnoreNextCardClick.current = true
    setSwipeMotion({ transform: `translate(${distanceX}px, ${distanceY}px)`, transformOrigin: 'center' })
  }

  const endSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    const start = swipeStart.current
    if (start === undefined || start.pointerId !== event.pointerId) return
    swipeStart.current = undefined
    const selfAssessment = assessmentForSwipe(sessionType, event.clientX - start.x, event.clientY - start.y)
    setIsSwipeInProgress(false)
    if (selfAssessment !== undefined) {
      setSwipeMotion(undefined)
      completeEntry(motionForWordState(selfAssessment), () => onAssessEntry(activeEntryIndex, selfAssessment))
      return
    }
    returnSwipeToRest()
  }

  const cancelSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (swipeStart.current?.pointerId !== event.pointerId) return
    swipeStart.current = undefined
    setIsSwipeInProgress(false)
    returnSwipeToRest()
  }

  const returnSwipeToRest = () => {
    setSwipeMotion({ transform: 'translate(0, 0)', transformOrigin: 'center' })
    swipeTimeout.current = window.setTimeout(() => setSwipeMotion(undefined), 160)
  }

  const cardMotion = completionMotion ?? swipeMotion
  const cardCanvas = <article className={`relative h-[40rem] cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-within:ring-4 focus-within:ring-blue-100 max-[480px]:h-[34rem] sm:h-[33rem] ${isCompletingEntry ? 'pointer-events-none' : ''}`} style={{ touchAction: isRevealed ? 'none' : undefined, transform: cardMotion?.transform, transformOrigin: cardMotion?.transformOrigin, transition: !isSwipeInProgress && cardMotion !== undefined ? `transform ${completionMotion === undefined ? 160 : window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 280}ms ease-in` : undefined }} onClick={flipCard} onPointerCancel={cancelSwipe} onPointerDown={startSwipe} onPointerMove={moveSwipe} onPointerUp={endSwipe}>
    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-600"><span>{visibleSideLabel}</span><div className="flex items-center gap-2"><button aria-label={t(vocabularyItem.isFavourite ? 'removeFavourite' : 'addFavourite')} className={`rounded-lg border border-slate-300 px-3 py-2 text-lg leading-none disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100 ${vocabularyItem.isFavourite ? 'text-yellow-500' : 'text-slate-500'}`} disabled={isCompletingEntry} type="button" onClick={(event) => { event.stopPropagation(); onChangeFavouriteStatus(vocabularyItem.id, !vocabularyItem.isFavourite) }}><span aria-hidden="true">{vocabularyItem.isFavourite ? '★' : '☆'}</span></button><MoreActions disabled={isCompletingEntry} isRevealed={isRevealed} onChangeWordState={(wordState) => completeEntry(motionForWordState(wordState), () => onManuallySetWordState(activeEntryIndex, wordState))} onEdit={() => onEditVocabularyItem(vocabularyItem.id)} /></div></div>
    <div className="h-[calc(100%-4.25rem)] overflow-hidden px-6 py-8 max-[480px]:py-6 sm:px-10 sm:py-12">{isGermanVisible ? <GermanCardSide settings={settings} vocabularyItem={vocabularyItem} /> : <RussianCardSide areRemainingTranslationsVisible={areRemainingTranslationsVisible} disabled={isCompletingEntry} onToggleRemainingTranslations={() => setAreRemainingTranslationsVisible((visible) => !visible)} vocabularyItem={vocabularyItem} />}</div>
  </article>

  if (!isRevealed) {
    return <div className="mt-4 space-y-4">{cardCanvas}<button className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-200" disabled={isCompletingEntry} type="button" onClick={flipCard}>{t('revealAnswer')}</button></div>
  }

  const actions = assessmentActions(sessionType, t)
  return <div className="mt-4">
    {cardCanvas}
    <div className="mt-4 grid grid-cols-[40%_40%] justify-center gap-x-[20%] gap-y-3">
      <AssessmentButton action={actions.exclude} className="col-span-2 max-w-[40%] justify-self-center" disabled={isCompletingEntry} onAssess={(selfAssessment) => completeEntry(motionForWordState(selfAssessment), () => onAssessEntry(activeEntryIndex, selfAssessment))} />
      <AssessmentButton action={actions.negative} className="" disabled={isCompletingEntry} onAssess={(selfAssessment) => completeEntry(motionForWordState(selfAssessment), () => onAssessEntry(activeEntryIndex, selfAssessment))} />
      <AssessmentButton action={actions.positive} className="" disabled={isCompletingEntry} onAssess={(selfAssessment) => completeEntry(motionForWordState(selfAssessment), () => onAssessEntry(activeEntryIndex, selfAssessment))} />
      {actions.known === undefined ? null : <AssessmentButton action={actions.known} className="col-span-2 max-w-[40%] justify-self-center" disabled={isCompletingEntry} onAssess={(selfAssessment) => completeEntry(motionForWordState(selfAssessment), () => onAssessEntry(activeEntryIndex, selfAssessment))} />}
    </div>
  </div>
}

function GermanCardSide({ settings, vocabularyItem }: { settings: SessionSettingsData; vocabularyItem: ResolvedVocabularyItemData }) {
  const { t } = useInterfaceLanguage()
  const wordType = 'nominative' in vocabularyItem ? wordTypes.noun : 'positive' in vocabularyItem ? wordTypes.adjective : wordTypes.verb
  const headword = 'nominative' in vocabularyItem ? vocabularyItem.nominative : 'positive' in vocabularyItem ? vocabularyItem.positive : vocabularyItem.infinitive
  return <div><div className="flex flex-wrap gap-2 text-sm font-semibold text-slate-600"><span>{vocabularyItem.level}</span><span aria-hidden="true">/</span><span>{t(wordType)}</span></div><FittedText className="mt-5 text-4xl font-bold tracking-tight text-slate-950 max-[480px]:mt-3 sm:text-5xl" minimumFontSize={18}>{headword}</FittedText>{'nominative' in vocabularyItem ? <dl className="mt-8 flex flex-wrap gap-4 text-sm max-[480px]:mt-5 max-[480px]:grid max-[480px]:grid-cols-2 max-[480px]:gap-3">{settings.nounGermanSideHeaderFields.includes('gender') ? <Info label={t('nounGender')} value={vocabularyItem.gender} /> : null}{settings.nounGermanSideHeaderFields.includes('plural') ? <Info label={t('nounPlural')} value={vocabularyItem.plural} /> : null}</dl> : 'positive' in vocabularyItem ? null : <dl className="mt-8 flex flex-wrap gap-4 text-sm max-[480px]:mt-5 max-[480px]:grid max-[480px]:grid-cols-2 max-[480px]:gap-3">{settings.verbGermanSideHeaderFields.includes('helper-verb') ? <Info label={t('verbHelperVerb')} value={vocabularyItem.helper_verb} /> : null}{settings.verbGermanSideHeaderFields.includes('conjugation-type') ? <Info label={t('verbConjugationType')} value={vocabularyItem.conjugation_type} /> : null}{settings.verbGermanSideHeaderFields.includes('present') ? <Info label={t('verbPresent')} value={vocabularyItem.present} /> : null}{settings.verbGermanSideHeaderFields.includes('preterite') ? <Info label={t('verbPreterite')} value={vocabularyItem.preterite} /> : null}{settings.verbGermanSideHeaderFields.includes('perfect') ? <Info label={t('verbPerfect')} value={vocabularyItem.perfect} /> : null}</dl>}</div>
}

function RussianCardSide({ areRemainingTranslationsVisible, disabled, onToggleRemainingTranslations, vocabularyItem }: { areRemainingTranslationsVisible: boolean; disabled: boolean; onToggleRemainingTranslations(): void; vocabularyItem: ResolvedVocabularyItemData }) {
  const { t } = useInterfaceLanguage()
  const wordType = 'nominative' in vocabularyItem ? wordTypes.noun : 'positive' in vocabularyItem ? wordTypes.adjective : wordTypes.verb
  const headerTranslations = vocabularyItem.translations.slice(0, 3)
  const remainingTranslations = vocabularyItem.translations.slice(3)
  return <div><div className="flex flex-wrap gap-2 text-sm font-semibold text-slate-600"><span>{vocabularyItem.level}</span><span aria-hidden="true">/</span><span>{t(wordType)}</span></div><FittedText className="mt-5 text-3xl font-bold tracking-tight text-slate-950 max-[480px]:mt-3 sm:text-4xl" minimumFontSize={16}>{headerTranslations.join(', ')}</FittedText>{remainingTranslations.length > 0 ? <div className="mt-8 border-t border-slate-100 pt-6"><button className="text-sm font-semibold text-blue-700 underline decoration-blue-200 underline-offset-4 disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" disabled={disabled} type="button" onClick={(event) => { event.stopPropagation(); onToggleRemainingTranslations() }}>{t(areRemainingTranslationsVisible ? 'showLess' : 'showMore')}</button>{areRemainingTranslationsVisible ? <p className="mt-3 text-lg font-semibold text-slate-700">{remainingTranslations.join(', ')}</p> : null}</div> : null}</div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="w-44 rounded-xl bg-slate-50 px-4 py-3 max-[480px]:w-auto max-[480px]:min-w-0 max-[480px]:px-3 max-[480px]:py-2.5"><dt className="font-semibold text-slate-600">{label}</dt><dd className="mt-1"><FittedText className="font-semibold text-slate-950" minimumFontSize={12}>{value}</FittedText></dd></div>
}

function FittedText({ children, className, minimumFontSize }: { children: string; className: string; minimumFontSize: number }) {
  const text = useRef<HTMLParagraphElement>(null)
  const [fontSize, setFontSize] = useState<number>()

  useLayoutEffect(() => {
    const textElement = text.current
    if (textElement === null) return

    const fit = () => {
      textElement.style.removeProperty('font-size')
      const preferredFontSize = Number.parseFloat(window.getComputedStyle(textElement).fontSize)
      const fittedFontSize = Math.max(minimumFontSize, Math.floor(preferredFontSize * Math.min(1, textElement.clientWidth / textElement.scrollWidth)))
      textElement.style.fontSize = `${fittedFontSize}px`
      setFontSize((currentFontSize) => currentFontSize === fittedFontSize ? currentFontSize : fittedFontSize)
    }

    const resizeObserver = new ResizeObserver(fit)
    resizeObserver.observe(textElement)
    fit()
    return () => resizeObserver.disconnect()
  }, [children, minimumFontSize])

  return <p className={`${className} overflow-hidden whitespace-nowrap`} ref={text} style={fontSize === undefined ? undefined : { fontSize: `${fontSize}px` }}>{children}</p>
}

function assessmentActions(sessionType: string, t: ReturnType<typeof useInterfaceLanguage>['t']) {
  const isKnowledgeCheck = sessionType === sessionTypes.knowledgeCheck
  return {
    exclude: { label: t('exclude'), value: wordStates.excluded as SelfAssessment },
    negative: { label: t('selfAssessmentUnknown'), value: isKnowledgeCheck ? wordStates.new as SelfAssessment : recallSelfAssessments.incorrect },
    positive: { label: t(isKnowledgeCheck ? 'selfAssessmentLearning' : 'selfAssessmentKnown'), value: isKnowledgeCheck ? wordStates.learning as SelfAssessment : recallSelfAssessments.correct },
    known: isKnowledgeCheck ? { label: t('selfAssessmentKnown'), value: wordStates.known as SelfAssessment } : undefined,
  }
}

function assessmentForArrowKey(sessionType: string, key: string): SelfAssessment | undefined {
  if (key === 'ArrowUp') return assessmentForDirection(sessionType, 'up')
  if (key === 'ArrowLeft') return assessmentForDirection(sessionType, 'left')
  if (key === 'ArrowRight') return assessmentForDirection(sessionType, 'right')
  if (key === 'ArrowDown') return assessmentForDirection(sessionType, 'down')
  return undefined
}

function assessmentForSwipe(sessionType: string, distanceX: number, distanceY: number): SelfAssessment | undefined {
  const isHorizontal = Math.abs(distanceX) >= Math.abs(distanceY) * 1.5
  const isVertical = Math.abs(distanceY) >= Math.abs(distanceX) * 1.5
  if (isHorizontal && Math.abs(distanceX) >= 80) return assessmentForDirection(sessionType, distanceX < 0 ? 'left' : 'right')
  if (isVertical && Math.abs(distanceY) >= 80) return assessmentForDirection(sessionType, distanceY < 0 ? 'up' : 'down')
  return undefined
}

function assessmentForDirection(sessionType: string, direction: 'up' | 'left' | 'right' | 'down'): SelfAssessment | undefined {
  const actions = assessmentActions(sessionType, (messageKey) => messageKey)
  if (direction === 'up') return actions.exclude.value
  if (direction === 'left') return actions.negative.value
  if (direction === 'right') return actions.positive.value
  return actions.known?.value
}

interface CardMotion {
  transform: string
  transformOrigin: string
}

interface SwipeStart {
  pointerId: number
  x: number
  y: number
}

function motionForWordState(selfAssessment: SelfAssessment | typeof wordStates[keyof typeof wordStates]): CardMotion {
  if (selfAssessment === wordStates.new || selfAssessment === recallSelfAssessments.incorrect) return { transform: 'translateX(-50%) rotate(-30deg)', transformOrigin: 'bottom center' }
  if (selfAssessment === wordStates.learning || selfAssessment === recallSelfAssessments.correct) return { transform: 'translateX(50%) rotate(30deg)', transformOrigin: 'bottom center' }
  if (selfAssessment === wordStates.excluded) return { transform: 'translateY(-50%) rotate(30deg)', transformOrigin: 'right center' }
  return { transform: 'translateY(50%) rotate(-30deg)', transformOrigin: 'right center' }
}

function AssessmentButton({ action, className, disabled, onAssess }: { action: { label: string; value: SelfAssessment }; className: string; disabled: boolean; onAssess(selfAssessment: SelfAssessment): void }) {
  return <button className={`${className} w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100`} disabled={disabled} type="button" onClick={() => onAssess(action.value)}>{action.label}</button>
}

function SessionNavigation({ onOpenProgression, onOpenSessionSetup, onOpenSettings, onOpenVocabulary }: { onOpenProgression(): void; onOpenSessionSetup(): void; onOpenSettings(): void; onOpenVocabulary(): void }) {
  const { t } = useInterfaceLanguage()

  return <PopupMenu menuAriaLabel={t('navigation')} menuClassName="absolute right-0 z-10 mt-2 grid w-60 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-300/40" triggerAriaLabel={t('openNavigation')} triggerClassName="flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xl font-bold leading-none text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" triggerContent={<span aria-hidden="true">≣</span>}>
    {(onSelect) => <nav aria-label={t('navigation')}><button className="w-full rounded-lg px-3 py-2.5 text-left font-semibold text-slate-700 hover:bg-slate-50 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" role="menuitem" type="button" onClick={() => { onSelect(); onOpenSessionSetup() }}>{t('startSession')}</button><button className="w-full rounded-lg px-3 py-2.5 text-left font-semibold text-slate-700 hover:bg-slate-50 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" role="menuitem" type="button" onClick={() => { onSelect(); onOpenProgression() }}>{t('progressionTitle')}</button><button className="w-full rounded-lg px-3 py-2.5 text-left font-semibold text-slate-700 hover:bg-slate-50 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" role="menuitem" type="button" onClick={() => { onSelect(); onOpenVocabulary() }}>{t('navigationVocabulary')}</button><button className="w-full rounded-lg px-3 py-2.5 text-left font-semibold text-slate-700 hover:bg-slate-50 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" role="menuitem" type="button" onClick={() => { onSelect(); onOpenSettings() }}>{t('settings')}</button></nav>}
  </PopupMenu>
}

function EndSessionConfirmation({ onClose, onEndSession }: { onClose(): void; onEndSession(): void }) {
  const { t } = useInterfaceLanguage()
  const dialog = useRef<HTMLElement>(null)
  const keepStudyingButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    keepStudyingButton.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusableElements = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      if (focusableElements === undefined || focusableElements.length === 0) return
      const firstElement = focusableElements[0]!
      const lastElement = focusableElements[focusableElements.length - 1]!
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return <div className="fixed inset-0 z-20 grid place-items-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section aria-labelledby="end-session-title" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" ref={dialog} role="dialog"><h3 className="text-lg font-bold text-slate-950" id="end-session-title">{t('endSessionTitle')}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{t('endSessionDescription')}</p><div className="mt-5 flex flex-wrap gap-3"><button className="rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white active:translate-y-px focus:outline-none focus:ring-4 focus:ring-slate-300" ref={keepStudyingButton} type="button" onClick={onClose}>{t('keepStudying')}</button><button className="rounded-xl border border-red-300 bg-white px-4 py-2.5 font-semibold text-red-800 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-red-100" type="button" onClick={onEndSession}>{t('endSessionNow')}</button></div></section></div>
}

function MoreActions({ disabled, isRevealed, onChangeWordState, onEdit }: { disabled: boolean; isRevealed: boolean; onChangeWordState(wordState: typeof wordStates[keyof typeof wordStates]): void; onEdit(): void }) {
  const { t } = useInterfaceLanguage()
  const actions = [{ label: t('wordStateNew'), value: wordStates.new }, { label: t('wordStateLearning'), value: wordStates.learning }, { label: t('wordStateKnown'), value: wordStates.known }, { label: t('wordStateExcluded'), value: wordStates.excluded }]
  const [menuPage, setMenuPage] = useState<'actions' | 'states'>('actions')
  const [pendingMenuFocus, setPendingMenuFocus] = useState<'actions' | 'states' | undefined>()
  const changeWordStateButton = useRef<HTMLButtonElement>(null)
  const firstWordStateButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (pendingMenuFocus === 'actions') changeWordStateButton.current?.focus()
    if (pendingMenuFocus === 'states') firstWordStateButton.current?.focus()
    if (pendingMenuFocus !== undefined) setPendingMenuFocus(undefined)
  }, [menuPage, pendingMenuFocus])

  const showWordStates = () => {
    setMenuPage('states')
    setPendingMenuFocus('states')
  }

  const showActions = () => {
    setMenuPage('actions')
    setPendingMenuFocus('actions')
  }

  return <PopupMenu menuAriaLabel={t('moreActions')} menuClassName="absolute right-0 z-10 mt-2 grid w-64 gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-300/40" onClose={() => setMenuPage('actions')} triggerAriaLabel={t('moreActions')} triggerClassName="ml-auto flex w-fit rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-bold leading-none text-slate-700 disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" triggerContent={<span aria-hidden="true">•••</span>} triggerDisabled={disabled}>
    {(onSelect) => !isRevealed ? <><p className="px-1 py-2 text-sm leading-6 text-slate-600">{t('revealBeforeManualStateChange')}</p><button className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" role="menuitem" type="button" onClick={() => { onSelect(); onEdit() }}>{t('edit')}</button></> : menuPage === 'actions' ? <><button className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" ref={changeWordStateButton} role="menuitem" type="button" onClick={showWordStates}>{t('changeWordState')}</button><button className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" role="menuitem" type="button" onClick={() => { onSelect(); onEdit() }}>{t('edit')}</button></> : <>{actions.map((action, index) => <button className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" key={action.value} ref={index === 0 ? firstWordStateButton : undefined} role="menuitem" type="button" onClick={() => { setMenuPage('actions'); onSelect(); onChangeWordState(action.value) }}>{action.label}</button>)}<button className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" role="menuitem" type="button" onClick={showActions}>{t('back')}</button></>}
  </PopupMenu>
}
