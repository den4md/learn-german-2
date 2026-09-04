import { useEffect, useMemo, useState } from 'react'
import { documentId } from '../domain/identifiers'
import type { VocabularyItemId } from '../domain/identifiers'
import { createEmptyDataDocument } from '../domain/data-document'
import { LearningData } from '../domain/learning-data'
import type { Session } from '../domain/session'
import type { InterfaceLanguage } from '../domain/preferences'
import { InterfaceLanguageProvider, useInterfaceLanguage } from '../i18n/interface-language-context'
import { messages } from '../i18n/messages'
import { IndexedDbDataDocumentStore } from '../storage/indexed-db-data-document-store'
import { ProgressionView, SessionDetailsView } from '../views/progression-view'
import { SessionSetupView } from '../views/session-setup-view'
import { ActiveSessionView } from '../views/active-session-view'
import { SettingsView } from '../views/settings-view'
import { VocabularyEditView, VocabularyView } from '../views/vocabulary-view'
import { AppFooter, AppShell } from './app-shell'
import { PopupMenuProvider } from '../components/popup-menu'

export function App() {
  const dataDocumentStore = useMemo(() => new IndexedDbDataDocumentStore(), [])
  const initialDataDocument = useMemo(
    () => createEmptyDataDocument(documentId(crypto.randomUUID()), new Date().toISOString()),
    [],
  )
  const [dataDocument, setDataDocument] = useState(initialDataDocument)
  const [isLoaded, setIsLoaded] = useState(false)
  const [location, setLocation] = useState(() => routeFromBrowserLocation())
  const [vocabularyEditReturnPath, setVocabularyEditReturnPath] = useState('/vocabulary')
  const learningData = LearningData.fromData(dataDocument.learningData)

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

  useEffect(() => {
    const updateLocation = () => setLocation(routeFromBrowserLocation())
    window.addEventListener('popstate', updateLocation)
    return () => window.removeEventListener('popstate', updateLocation)
  }, [])

  const navigate = (nextRoute: string, replace = false) => {
    const nextLocation = routeLocationFromRoute(nextRoute)
    const browserUrl = browserUrlFromRouteLocation(nextLocation)
    if (browserUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history[replace ? 'replaceState' : 'pushState']({}, '', browserUrl)
    }
    setLocation(nextLocation)
  }

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
    if (nextLearningData.activeSession === undefined) {
      navigate('/progression')
    }
  }

  const selectNextActiveSessionCandidatePage = (vocabularyItemIds: VocabularyItemId[]) => {
    const nextLearningData = learningData.selectNextActiveSessionCandidatePage(vocabularyItemIds, new Date().toISOString())
    saveLearningData(nextLearningData)
    if (nextLearningData.activeSession === undefined) {
      navigate('/progression')
    }
  }

  const manuallySetActiveSessionEntryWordState = (entryIndex: number, wordState: Parameters<LearningData['manuallySetActiveSessionEntryWordState']>[1]) => {
    const nextLearningData = learningData.manuallySetActiveSessionEntryWordState(entryIndex, wordState, new Date().toISOString())
    saveLearningData(nextLearningData)
    if (nextLearningData.activeSession === undefined) {
      navigate('/progression')
    }
  }

  const endActiveSession = () => {
    saveLearningData(learningData.endActiveSession(new Date().toISOString()))
    navigate('/progression')
  }

  const startNewSession = () => {
    if (learningData.activeSession !== undefined && !window.confirm(messages[learningData.preferences.interfaceLanguage].startNewSessionConfirmation)) return
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
  ) => {
    saveLearningData(
      learningData
        .withVocabularyItemGermanText(vocabularyItemId, germanText)
        .withVocabularyItemTranslations(vocabularyItemId, translations),
    )
  }

  const openVocabularyItemEdit = (vocabularyItemId: VocabularyItemId, returnPath = '/vocabulary') => {
    setVocabularyEditReturnPath(returnPath)
    navigate(`/vocabulary/${vocabularyItemId}/edit`)
  }

  const clearData = () => {
    const nextDataDocument = createEmptyDataDocument(dataDocument.documentId, new Date().toISOString())
    setDataDocument(nextDataDocument)
    void dataDocumentStore.save(nextDataDocument).catch((error: unknown) => console.error('Could not clear the local Data document.', error))
    navigate('/progression')
  }

  const route = isLoaded && location.path === '/session/active' && learningData.activeSession === undefined ? '/progression' : location.path
  const vocabularyEditMatch = route.match(/^\/vocabulary\/(-?\d+)\/edit$/)
  const sessionDetailsMatch = route.match(/^\/sessions\/([^/]+)$/)

  useEffect(() => {
    const canonicalLocation = { ...location, path: route }
    if (browserUrlFromRouteLocation(canonicalLocation) !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      navigate(routeHrefFromLocation(canonicalLocation), true)
    }
  }, [location, route])

  return (
    <InterfaceLanguageProvider
      interfaceLanguage={learningData.preferences.interfaceLanguage}
      setInterfaceLanguage={setInterfaceLanguage}
    >
      {isLoaded ? (
        <PopupMenuProvider>
          <AppShell hasActiveSession={learningData.activeSession !== undefined} isActiveSessionView={route === '/session/active'} onContinueSession={() => navigate('/session/active')} onOpenProgression={() => navigate('/progression')} onOpenSessionSetup={startNewSession} onOpenSettings={() => navigate('/settings')} onOpenVocabulary={() => navigate('/vocabulary')}>
          {route === '/progression' ? (
            <ProgressionView
              learningData={learningData}
              onChangeFavouriteStatus={changeVocabularyItemFavouriteStatus}
              onChangeWordState={changeVocabularyItemWordState}
              onEditVocabularyItem={openVocabularyItemEdit}
              onOpenSessionDetails={(sessionId) => navigate(`/sessions/${sessionId}`)}
              onOpenVocabulary={navigate}
              onStartSession={startNewSession}
            />
          ) : route.startsWith('/sessions/') ? (
            <SessionDetailsView learningData={learningData} onBack={() => navigate('/progression')} sessionId={sessionDetailsMatch === null ? undefined : sessionDetailsMatch[1]} />
          ) : route === '/vocabulary' ? (
            <VocabularyView
              learningData={learningData}
              locationSearch={location.search}
              onChangeFavouriteStatus={changeVocabularyItemFavouriteStatus}
              onChangeWordState={changeVocabularyItemWordState}
              onEditVocabularyItem={(vocabularyItemId) => openVocabularyItemEdit(vocabularyItemId, routeHrefFromLocation(location))}
              onNavigate={navigate}
            />
          ) : route.startsWith('/vocabulary/') ? (
            <VocabularyEditView
              learningData={learningData}
              onBack={() => navigate(vocabularyEditReturnPath)}
              onSaveVocabularyItem={saveVocabularyItem}
              vocabularyItemId={vocabularyEditMatch === null ? undefined : Number(vocabularyEditMatch[1]) as VocabularyItemId}
            />
          ) : route === '/session/new' ? (
            <SessionSetupView learningData={learningData} onBack={() => navigate('/progression')} onSessionStarted={startSession} />
          ) : route === '/settings' ? (
            <SettingsView onClearData={clearData} />
          ) : (
            <ActiveSessionView
              learningData={learningData}
              onAssessEntry={assessActiveSessionEntry}
              onChangeFavouriteStatus={changeVocabularyItemFavouriteStatus}
              onEndSession={endActiveSession}
              onEditVocabularyItem={(vocabularyItemId) => openVocabularyItemEdit(vocabularyItemId, '/session/active')}
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

interface RouteLocation {
  path: string
  search: string
  hash: string
}

function normalizePath(pathname: string): string {
  if (pathname === '/') return '/progression'
  if (['/progression', '/session/new', '/session/active', '/settings', '/vocabulary'].includes(pathname)) return pathname
  if (/^\/sessions\/[^/]+$/.test(pathname)) return pathname
  if (/^\/vocabulary\/-?\d+\/edit$/.test(pathname)) return pathname
  return '/progression'
}

function routeFromBrowserLocation(): RouteLocation {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const pathname = window.location.pathname.startsWith(basePath)
    ? window.location.pathname.slice(basePath.length) || '/'
    : window.location.pathname
  const handoffRoute = pathname === '/' ? new URLSearchParams(window.location.search).get('route') : null

  if (handoffRoute !== null) {
    const recoveredRoute = routeLocationFromHandoff(handoffRoute)
    if (recoveredRoute !== undefined) return recoveredRoute
  }

  return { path: normalizePath(pathname), search: window.location.search, hash: window.location.hash }
}

function routeLocationFromHandoff(handoffRoute: string): RouteLocation | undefined {
  try {
    const handoffUrl = new URL(handoffRoute, window.location.origin)
    if (handoffUrl.origin !== window.location.origin || !handoffUrl.pathname.startsWith('/')) return undefined
    return { path: normalizePath(handoffUrl.pathname), search: handoffUrl.search, hash: handoffUrl.hash }
  } catch {
    return undefined
  }
}

function routeLocationFromRoute(route: string): RouteLocation {
  const routeUrl = new URL(route, window.location.origin)
  return { path: normalizePath(routeUrl.pathname), search: routeUrl.search, hash: routeUrl.hash }
}

function routeHrefFromLocation(location: RouteLocation): string {
  return `${location.path}${location.search}${location.hash}`
}

function browserUrlFromRouteLocation(location: RouteLocation): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${routeHrefFromLocation(location)}`
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
