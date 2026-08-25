import { useEffect, useMemo, useState } from 'react'
import { documentId } from '../domain/identifiers'
import type { VocabularyItemId } from '../domain/identifiers'
import { createEmptyDataDocument } from '../domain/data-document'
import { LearningData } from '../domain/learning-data'
import type { Session } from '../domain/session'
import type { InterfaceLanguage } from '../domain/preferences'
import { InterfaceLanguageProvider, useInterfaceLanguage } from '../i18n/interface-language-context'
import { IndexedDbDataDocumentStore } from '../storage/indexed-db-data-document-store'
import { ProgressionView } from '../views/progression-view'
import { SessionSetupView } from '../views/session-setup-view'
import { ActiveSessionView } from '../views/active-session-view'
import { AppShell } from './app-shell'

export function App() {
  const dataDocumentStore = useMemo(() => new IndexedDbDataDocumentStore(), [])
  const initialDataDocument = useMemo(
    () => createEmptyDataDocument(documentId(crypto.randomUUID()), new Date().toISOString()),
    [],
  )
  const [dataDocument, setDataDocument] = useState(initialDataDocument)
  const [isLoaded, setIsLoaded] = useState(false)
  const [view, setView] = useState<'progression' | 'session-setup' | 'active-session'>('progression')
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
          if (LearningData.fromData(storedDataDocument.learningData).activeSession !== undefined) {
            setView('active-session')
          }
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
    setView('active-session')
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
      setView('progression')
    }
  }

  const selectNextActiveSessionCandidatePage = (vocabularyItemIds: VocabularyItemId[]) => {
    const nextLearningData = learningData.selectNextActiveSessionCandidatePage(vocabularyItemIds, new Date().toISOString())
    saveLearningData(nextLearningData)
    if (nextLearningData.activeSession === undefined) {
      setView('progression')
    }
  }

  return (
    <InterfaceLanguageProvider
      interfaceLanguage={learningData.preferences.interfaceLanguage}
      setInterfaceLanguage={setInterfaceLanguage}
    >
      {isLoaded ? (
        <AppShell>
          {view === 'progression' ? (
            <ProgressionView learningData={learningData} onStartSession={() => setView('session-setup')} />
          ) : view === 'session-setup' ? (
            <SessionSetupView learningData={learningData} onBack={() => setView('progression')} onSessionStarted={startSession} />
          ) : (
            <ActiveSessionView
              learningData={learningData}
              onAssessEntry={assessActiveSessionEntry}
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

function LoadingView() {
  const { t } = useInterfaceLanguage()

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6 text-slate-700">
      <p>{t('loading')}</p>
    </main>
  )
}
