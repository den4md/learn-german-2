export const dataDocumentSchemaVersion = 1

export type InterfaceLanguage = 'en' | 'de' | 'ru'

export interface DataDocument {
  schemaVersion: typeof dataDocumentSchemaVersion
  documentId: string
  updatedAt: string
  interfaceLanguage: InterfaceLanguage
}

export function createEmptyDataDocument(): DataDocument {
  return {
    schemaVersion: dataDocumentSchemaVersion,
    documentId: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
    interfaceLanguage: 'en',
  }
}
