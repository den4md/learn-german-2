import type { DataDocument } from '../domain/data-document'

export interface DataDocumentStore {
  load(): Promise<DataDocument | undefined>
  save(dataDocument: DataDocument): Promise<void>
}
