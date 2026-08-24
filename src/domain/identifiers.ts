declare const documentIdBrand: unique symbol
declare const vocabularyItemIdBrand: unique symbol
declare const sessionIdBrand: unique symbol

export type DocumentId = string & { readonly [documentIdBrand]: 'DocumentId' }
export type VocabularyItemId = string & { readonly [vocabularyItemIdBrand]: 'VocabularyItemId' }
export type SessionId = string & { readonly [sessionIdBrand]: 'SessionId' }

export function documentId(value: string): DocumentId {
  return value as DocumentId
}

export function vocabularyItemId(value: string): VocabularyItemId {
  return value as VocabularyItemId
}

export function sessionId(value: string): SessionId {
  return value as SessionId
}
