import { useCallback, useEffect, useMemo, useState } from 'react'
import { documentId, vocabularyItemId } from '../domain/identifiers'
import type { VocabularyItemId } from '../domain/identifiers'
import { createEmptyDataDocument } from '../domain/data-document'
import { LearningData } from '../domain/learning-data'
import type { Session } from '../domain/session'
import type { InterfaceLanguage } from '../domain/preferences'
import { InterfaceLanguageProvider, useInterfaceLanguage } from '../i18n/interface-language-context'
import { messages } from '../i18n/messages'
import { IndexedDbDataDocumentStore } from '../storage/indexed-db-data-document-store'
import { ProgressionView, SessionDetailsView } from '../views/progression-view'
import { SessionsView } from '../views/sessions-view'
import { SessionSetupView } from '../views/session-setup-view'
import { ActiveSessionView } from '../views/active-session-view'
import { SettingsView } from '../views/settings-view'
import { VocabularyEditView, VocabularyView } from '../views/vocabulary-view'
import { VocabularyCreateView } from '../views/vocabulary-create-view'
import { VocabularyItem } from '../domain/vocabulary'
import type { VocabularyItemData, WordState } from '../domain/vocabulary'
import { AppFooter, AppShell } from './app-shell'
import { PopupMenuProvider } from '../components/popup-menu'
import { AppNavigation } from './navigation'

export function App() {
  const dataDocumentStore = useMemo(() => new IndexedDbDataDocumentStore(), [])
  const initialDataDocument = useMemo(
    () => createEmptyDataDocument(documentId(crypto.randomUUID()), new Date().toISOString()),
    [],
  )
  const [dataDocument, setDataDocument] = useState(initialDataDocument)
  const [isLoaded, setIsLoaded] = useState(false)
  const navigation = useMemo(() => new AppNavigation(window, import.meta.env.BASE_URL), [])
  const [location, setLocation] = useState(navigation.location)
  const [sessionTransitionData, setSessionTransitionData] = useState<LearningData>()
  const learningData = LearningData.fromData(dataDocument.learningData)
  const discardChangesMessage = messages[learningData.preferences.interfaceLanguage].discardVocabularyChanges
  const setUnsavedVocabularyChanges = useCallback((hasChanges: boolean) => {
    navigation.setUnsavedChanges(hasChanges, discardChangesMessage)
  }, [navigation, discardChangesMessage])
  const { navigate } = navigation

  useEffect(() => navigation.connect(setLocation), [navigation])

  useEffect(() => {
    let isMounted = true

    void dataDocumentStore
      .load()
      .then((storedDataDocument) => {
        if (!isMounted) {
          return
        }

        if (storedDataDocument === undefined) {
          void dataDocumentStore.save(initialDataDocument)
        } else {
          setDataDocument(storedDataDocument)
        }

        setIsLoaded(true)
      })
      .catch((error: unknown) => {
        console.error('Could not load the local Data document.', error)
        if (isMounted) {
          setIsLoaded(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [dataDocumentStore, initialDataDocument])

  const setInterfaceLanguage = (interfaceLanguage: InterfaceLanguage) => {
    const nextLearningData = learningData.withPreferences(
      learningData.preferences.withInterfaceLanguage(interfaceLanguage),
    )
    const nextDataDocument = {
      ...dataDocument,
      updatedAt: new Date().toISOString(),
      learningData: nextLearningData.toData(),
    }

    setDataDocument(nextDataDocument)
    void dataDocumentStore.save(nextDataDocument).catch((error: unknown) => {
      console.error('Could not save the local Data document.', error)
    })
  }

  const saveLearningData = (nextLearningData: LearningData) => {
    const nextDataDocument = {
      ...dataDocument,
      updatedAt: new Date().toISOString(),
      learningData: nextLearningData.toData(),
    }
    setDataDocument(nextDataDocument)
    void dataDocumentStore.save(nextDataDocument).catch((error: unknown) => {
      console.error('Could not save the local Data document.', error)
    })
  }

  const startSession = (session: Session) => {
    saveLearningData(learningData.startSession(session))
    navigate('/session/active')
  }

  const showActiveSessionEntry = (entryIndex: number) => {
    saveLearningData(learningData.showActiveSessionEntry(entryIndex, new Date().toISOString()))
  }

  const showActiveSessionCandidate = (vocabularyItemId: VocabularyItemId) => {
    saveLearningData(learningData.showActiveSessionCandidate(vocabularyItemId, new Date().toISOString()))
  }

  const revealActiveSessionEntry = (entryIndex: number) => {
    saveLearningData(learningData.revealActiveSessionEntry(entryIndex, new Date().toISOString()))
  }

  const assessActiveSessionEntry = (entryIndex: number, selfAssessment: Parameters<LearningData['assessActiveSessionEntry']>[1]) => {
    const nextLearningData = learningData.assessActiveSessionEntry(entryIndex, selfAssessment, new Date().toISOString())
    saveLearningData(nextLearningData)
  }

  const selectNextActiveSessionCandidatePage = (vocabularyItemIds: VocabularyItemId[]) => {
    const nextLearningData = learningData.selectNextActiveSessionCandidatePage(vocabularyItemIds, new Date().toISOString())
    saveLearningData(nextLearningData)
    if (nextLearningData.activeSession === undefined && sessionTransitionData === undefined) {
      navigate('/progression')
    }
  }

  const manuallySetActiveSessionEntryWordState = (entryIndex: number, wordState: Parameters<LearningData['manuallySetActiveSessionEntryWordState']>[1]) => {
    const nextLearningData = learningData.manuallySetActiveSessionEntryWordState(entryIndex, wordState, new Date().toISOString())
    saveLearningData(nextLearningData)
  }

  const endActiveSession = () => {
    saveLearningData(learningData.endActiveSession(new Date().toISOString()))
    navigate('/progression')
  }

  const startNewSession = () => {
    if (!navigation.allowNavigation()) return
    if (learningData.activeSession !== undefined && !window.confirm(messages[learningData.preferences.interfaceLanguage].startNewSessionConfirmation)) return
    navigation.discardChanges()
    if (learningData.activeSession !== undefined) saveLearningData(learningData.endActiveSession(new Date().toISOString()))
    navigate('/session/new')
  }

  const changeVocabularyItemWordState = (vocabularyItemId: VocabularyItemId, wordState: Parameters<LearningData['withManualWordState']>[1]) => {
    saveLearningData(learningData.withManualWordState(vocabularyItemId, wordState))
  }

  const changeVocabularyItemFavouriteStatus = (vocabularyItemId: VocabularyItemId, isFavourite: boolean) => {
    saveLearningData(learningData.withVocabularyItemFavouriteStatus(vocabularyItemId, isFavourite))
  }

  const saveVocabularyItem = (
    vocabularyItemId: VocabularyItemId,
    germanText: Parameters<LearningData['withVocabularyItemGermanText']>[1],
    translations: Parameters<LearningData['withVocabularyItemTranslations']>[1],
    wordState: Parameters<LearningData['withManualWordState']>[1],
    isFavourite: boolean,
  ) => {
    saveLearningData(
      learningData
        .withVocabularyItemGermanText(vocabularyItemId, germanText)
        .withVocabularyItemTranslations(vocabularyItemId, translations)
        .withManualWordState(vocabularyItemId, wordState)
        .withVocabularyItemFavouriteStatus(vocabularyItemId, isFavourite),
    )
  }

  const openVocabularyItemEdit = (vocabularyItemId: VocabularyItemId) => {
    navigation.openVocabularyItemEdit(vocabularyItemId)
  }

  const addVocabularyItem = async (item: VocabularyItemData, wordState: WordState, isFavourite: boolean) => {
    const usedIds = [...learningData.userAddedVocabularyItems.map((candidate) => candidate.id), ...learningData.vocabularyLearningRecords.map((record) => record.vocabularyItemId)]
    const id = vocabularyItemId(usedIds.reduce<number>((lowest, usedId) => Math.min(lowest, usedId), 0) - 1)
    const nextLearningData = learningData
      .withUserAddedVocabularyItem(VocabularyItem.fromData({ ...item, id }))
      .withManualWordState(id, wordState)
      .withVocabularyItemFavouriteStatus(id, isFavourite)
    const nextDataDocument = { ...dataDocument, updatedAt: new Date().toISOString(), learningData: nextLearningData.toData() }
    navigation.setSaving(true)
    try {
      await dataDocumentStore.save(nextDataDocument)
    } finally {
      navigation.setSaving(false)
    }
    setDataDocument(nextDataDocument)
    navigation.discardChanges()
    navigate(`/vocabulary?item=${id}`)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const clearData = () => {
    const nextDataDocument = createEmptyDataDocument(dataDocument.documentId, new Date().toISOString())
    setDataDocument(nextDataDocument)
    void dataDocumentStore.save(nextDataDocument).catch((error: unknown) => console.error('Could not clear the local Data document.', error))
    navigate('/progression')
  }

  const route = isLoaded && location.path === '/session/active' && learningData.activeSession === undefined && sessionTransitionData === undefined ? '/progression' : location.path
  const vocabularyEditMatch = route.match(/^\/vocabulary\/(-?\d+)\/edit$/)
  const sessionDetailsMatch = route.match(/^\/sessions\/([^/]+)$/)

  useEffect(() => {
    navigation.canonicalize(route)
  }, [navigation, location, route])

  return (
    <InterfaceLanguageProvider
      interfaceLanguage={learningData.preferences.interfaceLanguage}
      setInterfaceLanguage={setInterfaceLanguage}
    >
      {isLoaded ? (
        <PopupMenuProvider>
          <AppShell dailyStreakHistory={learningData.dailyStreakHistory} hasActiveSession={learningData.activeSession !== undefined} isActiveSessionView={route === '/session/active'} hasVocabularyCreateButton={route === '/vocabulary'} onContinueSession={() => navigate('/session/active')} onOpenProgression={() => navigate('/progression')} onOpenSessionSetup={startNewSession} onOpenSettings={() => navigate('/settings')} onOpenVocabulary={() => navigate('/vocabulary')} onOpenSessions={() => navigate('/sessions')}>
          {route === '/progression' ? (
            <ProgressionView
              learningData={learningData}
              onChangeFavouriteStatus={changeVocabularyItemFavouriteStatus}
              onChangeWordState={changeVocabularyItemWordState}
              onEditVocabularyItem={openVocabularyItemEdit}
              onOpenSessionDetails={(sessionId) => navigate(`/sessions/${sessionId}`, false, undefined, '/progression')}
              onContinueSession={() => navigate('/session/active')}
              onOpenSessions={() => navigate('/sessions')}
              onOpenVocabulary={navigate}
              onStartSession={startNewSession}
            />
          ) : route === '/sessions' ? (
            <SessionsView learningData={learningData} locationSearch={location.search} onNavigate={navigate} onContinue={() => navigate('/session/active')} onOpenDetails={(sessionId) => navigate(`/sessions/${sessionId}`, false, undefined, navigation.href)} />
          ) : route.startsWith('/sessions/') ? (
            <SessionDetailsView learningData={learningData} onBack={() => navigate(location.sessionDetailsReturnPath ?? '/progression')} backMessageKey={location.sessionDetailsReturnPath?.startsWith('/sessions') ? 'backToSessions' : 'backToProgression'} sessionId={sessionDetailsMatch === null ? undefined : sessionDetailsMatch[1]} />
          ) : route === '/vocabulary' ? (
            <VocabularyView
              learningData={learningData}
              locationSearch={location.search}
              onChangeFavouriteStatus={changeVocabularyItemFavouriteStatus}
              onChangeWordState={changeVocabularyItemWordState}
              onEditVocabularyItem={openVocabularyItemEdit}
              onNavigate={navigate}
              onCreateVocabularyItem={(returnPath) => { navigate('/vocabulary/new', false, returnPath); window.scrollTo({ top: 0, behavior: 'instant' }) }}
            />
          ) : route === '/vocabulary/new' ? (
            <VocabularyCreateView learningData={learningData} onBack={() => navigate(location.vocabularyEditReturnPath ?? '/vocabulary')} onAddVocabularyItem={addVocabularyItem} onEditVocabularyItem={openVocabularyItemEdit} onUnsavedChangesChange={setUnsavedVocabularyChanges} />
          ) : route.startsWith('/vocabulary/') ? (
            <VocabularyEditView
              learningData={learningData}
              onBack={() => navigate(location.vocabularyEditReturnPath ?? '/vocabulary')}
              onSaveVocabularyItem={saveVocabularyItem}
              vocabularyItemId={vocabularyEditMatch === null ? undefined : Number(vocabularyEditMatch[1]) as VocabularyItemId}
            />
          ) : route === '/session/new' ? (
            <SessionSetupView learningData={learningData} onBack={() => navigate('/progression')} onSessionStarted={startSession} />
          ) : route === '/settings' ? (
            <SettingsView onClearData={clearData} />
          ) : (
            <ActiveSessionView
              isSessionComplete={learningData.activeSession === undefined}
              learningData={learningData.activeSession === undefined ? sessionTransitionData ?? learningData : learningData}
              onAssessmentTransitionChange={setSessionTransitionData}
              onAssessEntry={assessActiveSessionEntry}
              onChangeFavouriteStatus={changeVocabularyItemFavouriteStatus}
              onEndSession={endActiveSession}
              onEditVocabularyItem={openVocabularyItemEdit}
              onManuallySetWordState={manuallySetActiveSessionEntryWordState}
              onOpenProgression={() => navigate('/progression')}
              onOpenSessionSetup={startNewSession}
              onOpenSettings={() => navigate('/settings')}
              onOpenVocabulary={() => navigate('/vocabulary')}
              onRevealEntry={revealActiveSessionEntry}
              onSelectNextCandidatePage={selectNextActiveSessionCandidatePage}
              onShowCandidate={showActiveSessionCandidate}
              onShowEntry={showActiveSessionEntry}
            />
          )}
          </AppShell>
        </PopupMenuProvider>
      ) : (
        <LoadingView />
      )}
    </InterfaceLanguageProvider>
  )
}

function LoadingView() {
  const { t } = useInterfaceLanguage()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-700">
      <main className="grid flex-1 place-items-center px-6">
        <p>{t('loading')}</p>
      </main>
      <AppFooter />
    </div>
  )
}
