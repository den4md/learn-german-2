import type { Session } from '../domain/session'

export function sessionCardRoute(session: Session, index: number): string {
  const position = !session.isUnlimited && index === session.entries.length ? 'finish' : String(index + 1)
  return `/session/active?session=${encodeURIComponent(session.id)}&card=${position}`
}

export function sessionCardIndex(session: Session, search: string): number {
  const card = new URLSearchParams(search).get('card')
  if (card === 'finish' && session.isComplete) return session.entries.length
  const index = card === null ? session.toData().currentEntryIndex : /^\d+$/.test(card) ? Number(card) - 1 : -1
  const hasNextPosition = session.isUnlimited ? session.candidateVocabularyItemIds.length > 0 || session.isCandidatePageComplete : session.isComplete
  const lastPosition = hasNextPosition ? session.entries.length : session.entries.length - 1
  if (Number.isSafeInteger(index) && index >= 0 && index <= lastPosition) return index
  const unansweredIndex = session.entries.findIndex((entry) => !entry.isCompleted)
  return unansweredIndex === -1 ? lastPosition : unansweredIndex
}
