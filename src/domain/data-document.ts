import type { DocumentId } from './identifiers'
import { createEmptyLearningData } from './learning-data'
import type { LearningDataData } from './learning-data'

export const dataDocumentSchemaVersion = 1

export interface DataDocument {
  schemaVersion: typeof dataDocumentSchemaVersion
  documentId: DocumentId
  updatedAt: string
  learningData: LearningDataData
}

export function createEmptyDataDocument(documentId: DocumentId, updatedAt: string): DataDocument {
  return {
    schemaVersion: dataDocumentSchemaVersion,
    documentId,
    updatedAt,
    learningData: createEmptyLearningData(),
  }
}
