import { normalizeDataDocument } from '../domain/data-document'
import type { DataDocument } from '../domain/data-document'
import type { DataDocumentStore } from './data-document-store'

const databaseName = 'learn-german'
const databaseVersion = 1
const dataDocumentStoreName = 'data-document'
const dataDocumentKey = 'current'

export class IndexedDbDataDocumentStore implements DataDocumentStore {
  async load(): Promise<DataDocument | undefined> {
    const database = await this.openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(dataDocumentStoreName, 'readonly')
      const request = transaction.objectStore(dataDocumentStoreName).get(dataDocumentKey)

      request.addEventListener('success', () => {
        const dataDocument = request.result as DataDocument | undefined
        resolve(dataDocument === undefined ? undefined : normalizeDataDocument(dataDocument))
      })
      request.addEventListener('error', () => reject(request.error))
    })
  }

  async save(dataDocument: DataDocument): Promise<void> {
    const database = await this.openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(dataDocumentStoreName, 'readwrite')
      transaction.objectStore(dataDocumentStoreName).put(normalizeDataDocument(dataDocument), dataDocumentKey)

      transaction.addEventListener('complete', () => resolve())
      transaction.addEventListener('error', () => reject(transaction.error))
      transaction.addEventListener('abort', () => reject(transaction.error))
    })
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, databaseVersion)

      request.addEventListener('upgradeneeded', () => {
        if (!request.result.objectStoreNames.contains(dataDocumentStoreName)) {
          request.result.createObjectStore(dataDocumentStoreName)
        }
      })
      request.addEventListener('success', () => resolve(request.result))
      request.addEventListener('error', () => reject(request.error))
    })
  }
}
