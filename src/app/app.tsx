import { useEffect, useMemo, useState } from 'react'
import { documentId } from '../domain/identifiers'
import { createEmptyDataDocument } from '../domain/data-document'
import type { InterfaceLanguage } from '../domain/preferences'
import { InterfaceLanguageProvider, useInterfaceLanguage } from '../i18n/interface-language-context'
import { IndexedDbDataDocumentStore } from '../storage/indexed-db-data-document-store'
import { ProgressionView } from '../views/progression-view'

export function App() {
  const dataDocumentStore = useMemo(() => new IndexedDbDataDocumentStore(), [])
  const initialDataDocument = useMemo(
    () => createEmptyDataDocument(documentId(crypto.randomUUID()), new Date().toISOString()),
    [],
  )
  const [dataDocument, setDataDocument] = useState(initialDataDocument)
  const [isLoaded, setIsLoaded] = useState(false)

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
    const nextDataDocument = {
      ...dataDocument,
      updatedAt: new Date().toISOString(),
      learningData: {
        ...dataDocument.learningData,
        preferences: {
          ...dataDocument.learningData.preferences,
          interfaceLanguage,
        },
      },
    }

    setDataDocument(nextDataDocument)
    void dataDocumentStore.save(nextDataDocument).catch((error: unknown) => {
      console.error('Could not save the local Data document.', error)
    })
  }

  return (
    <InterfaceLanguageProvider
      interfaceLanguage={dataDocument.learningData.preferences.interfaceLanguage}
      setInterfaceLanguage={setInterfaceLanguage}
    >
      {isLoaded ? <ProgressionView /> : <LoadingView />}
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
