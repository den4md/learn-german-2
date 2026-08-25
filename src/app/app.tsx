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
import { ProgressionView } from '../views/progression-view'
import { SessionSetupView } from '../views/session-setup-view'
import { ActiveSessionView } from '../views/active-session-view'
import { SettingsView } from '../views/settings-view'
import { AppShell } from './app-shell'

export function App() {
  const dataDocumentStore = useMemo(() => new IndexedDbDataDocumentStore(), [])
  const initialDataDocument = useMemo(
    () => createEmptyDataDocument(documentId(crypto.randomUUID()), new Date().toISOString()),
    [],
  )
  const [dataDocument, setDataDocument] = useState(initialDataDocument)
  const [isLoaded, setIsLoaded] = useState(false)
  const [path, setPath] = useState(() => routeFromBrowserPath(window.location.pathname))
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
    const updatePath = () => setPath(routeFromBrowserPath(window.location.pathname))
    window.addEventListener('popstate', updatePath)
    return () => window.removeEventListener('popstate', updatePath)
  }, [])

  const navigate = (nextPath: string, replace = false) => {
    const normalizedPath = normalizePath(nextPath)
    const browserPath = browserPathFromRoute(normalizedPath)
    if (window.location.pathname !== browserPath) {
      window.history[replace ? 'replaceState' : 'pushState']({}, '', browserPath)
    }
    setPath(normalizedPath)
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

  const clearData = () => {
    const nextDataDocument = createEmptyDataDocument(dataDocument.documentId, new Date().toISOString())
    setDataDocument(nextDataDocument)
    void dataDocumentStore.save(nextDataDocument).catch((error: unknown) => console.error('Could not clear the local Data document.', error))
    navigate('/progression')
  }

  const route = path === '/session/active' && learningData.activeSession === undefined ? '/progression' : path

  useEffect(() => {
    if (route !== path || browserPathFromRoute(route) !== window.location.pathname) navigate(route, true)
  }, [path, route])

  return (
    <InterfaceLanguageProvider
      interfaceLanguage={learningData.preferences.interfaceLanguage}
      setInterfaceLanguage={setInterfaceLanguage}
    >
      {isLoaded ? (
        <AppShell hasActiveSession={learningData.activeSession !== undefined} onContinueSession={() => navigate('/session/active')} onOpenProgression={() => navigate('/progression')} onOpenSessionSetup={startNewSession} onOpenSettings={() => navigate('/settings')} onOpenVocabulary={() => navigate('/vocabulary')}>
          {route === '/progression' || route === '/vocabulary' || route.startsWith('/sessions/') || route.startsWith('/vocabulary/') ? (
            <ProgressionView learningData={learningData} onStartSession={startNewSession} />
          ) : route === '/session/new' ? (
            <SessionSetupView learningData={learningData} onBack={() => navigate('/progression')} onSessionStarted={startSession} />
          ) : route === '/settings' ? (
            <SettingsView onClearData={clearData} />
          ) : (
            <ActiveSessionView
              learningData={learningData}
              onAssessEntry={assessActiveSessionEntry}
              onEndSession={endActiveSession}
              onManuallySetWordState={manuallySetActiveSessionEntryWordState}
              onRevealEntry={revealActiveSessionEntry}
              onSelectNextCandidatePage={selectNextActiveSessionCandidatePage}
              onShowCandidate={showActiveSessionCandidate}
              onShowEntry={showActiveSessionEntry}
            />
          )}
        </AppShell>
      ) : (
        <LoadingView />
      )}
    </InterfaceLanguageProvider>
  )
}

function normalizePath(pathname: string): string {
  if (pathname === '/' || !['/progression', '/session/new', '/session/active', '/settings', '/vocabulary'].some((path) => pathname === path || pathname.startsWith(`${path}/`))) return '/progression'
  return pathname
}

function routeFromBrowserPath(pathname: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  return normalizePath(pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname)
}

function browserPathFromRoute(route: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${route}`
}

function LoadingView() {
  const { t } = useInterfaceLanguage()

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6 text-slate-700">
      <p>{t('loading')}</p>
    </main>
  )
}
