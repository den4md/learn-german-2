import type { SessionId, VocabularyItemId } from './identifiers'
import type { CefrLevel, WordState, WordType } from './vocabulary'
import {
  allCefrLevels,
  allNounGermanSideHeaderFields,
  allVerbGermanSideHeaderFields,
  allWordTypes,
  cardSides,
  favouriteStatusFilters,
  orderingDirections,
  orderingSources,
  recallSelfAssessments,
  sessionEndReasons,
  sessionTypes,
  wordStates,
} from './constants'
import type {
  CardSide,
  FavouriteStatusFilter,
  NounGermanSideHeaderField,
  OrderingDirection,
  OrderingSource,
  RecallSelfAssessment,
  SelfAssessment,
  SessionType,
  SessionEndReason,
  VerbGermanSideHeaderField,
} from './constants'

export type {
  CardSide,
  FavouriteStatusFilter,
  KnowledgeCheckSelfAssessment,
  NounGermanSideHeaderField,
  OrderingDirection,
  OrderingSource,
  RecallSelfAssessment,
  SelfAssessment,
  SessionType,
  SessionEndReason,
  VerbGermanSideHeaderField,
} from './constants'

export interface OrderingSourceData {
  source: OrderingSource
  direction: OrderingDirection
}

export interface SessionSettingsData {
  cefrLevels: CefrLevel[]
  wordTypes: WordType[]
  favouriteStatusFilter: FavouriteStatusFilter
  orderingSources: OrderingSourceData[]
  itemLimit?: number
  firstCardSide: CardSide
  nounGermanSideHeaderFields: NounGermanSideHeaderField[]
  verbGermanSideHeaderFields: VerbGermanSideHeaderField[]
}

export interface SessionEntryData {
  vocabularyItemId: VocabularyItemId
  shownAt?: string
  revealedAt?: string
  selfAssessment?: SelfAssessment
  manualWordState?: WordState
  selfAssessedAt?: string
}

export interface SessionData {
  id: SessionId
  type: SessionType
  settings: SessionSettingsData
  entries: SessionEntryData[]
  candidateVocabularyItemIds?: VocabularyItemId[]
  currentEntryIndex: number
  startedAt: string
  lastActionAt: string
  endedAt?: string
  endReason?: SessionEndReason
}

export const unlimitedSessionCandidatePageSize = 10

export class SessionSettings {
  private readonly data: SessionSettingsData

  private constructor(data: SessionSettingsData) {
    if (data.itemLimit !== undefined && (!Number.isSafeInteger(data.itemLimit) || data.itemLimit <= 0)) {
      throw new Error('The Item limit must be a positive whole number.')
    }
    this.data = data
  }

  static createDefault(): SessionSettings {
    return new SessionSettings({
      cefrLevels: [...allCefrLevels],
      wordTypes: [...allWordTypes],
      favouriteStatusFilter: favouriteStatusFilters.all,
      orderingSources: [
        { source: orderingSources.cefrLevel, direction: orderingDirections.ascending },
        { source: orderingSources.wordType, direction: orderingDirections.none },
        { source: orderingSources.vocabularyItem, direction: orderingDirections.ascending },
      ],
      firstCardSide: cardSides.german,
      nounGermanSideHeaderFields: [...allNounGermanSideHeaderFields],
      verbGermanSideHeaderFields: [...allVerbGermanSideHeaderFields],
    })
  }

  static fromData(data: SessionSettingsData): SessionSettings {
    return new SessionSettings(copySessionSettingsData(data))
  }

  toData(): SessionSettingsData {
    return copySessionSettingsData(this.data)
  }

  get itemLimit(): number | undefined {
    return this.data.itemLimit
  }
}

export class SessionEntry {
  private readonly data: SessionEntryData

  private constructor(data: SessionEntryData) {
    this.data = data
  }

  static fromData(data: SessionEntryData): SessionEntry {
    return new SessionEntry({ ...data })
  }

  get vocabularyItemId(): VocabularyItemId {
    return this.data.vocabularyItemId
  }

  get shownAt(): string | undefined {
    return this.data.shownAt
  }

  get selfAssessment(): SelfAssessment | undefined {
    return this.data.selfAssessment
  }

  get manualWordState(): WordState | undefined {
    return this.data.manualWordState
  }

  get revealedAt(): string | undefined {
    return this.data.revealedAt
  }

  get selfAssessedAt(): string | undefined {
    return this.data.selfAssessedAt
  }

  get isCompleted(): boolean {
    return this.data.selfAssessment !== undefined || this.data.manualWordState !== undefined
  }

  withShownAt(shownAt: string): SessionEntry {
    if (this.data.shownAt !== undefined) {
      return this
    }
    return new SessionEntry({ ...this.data, shownAt })
  }

  withRevealedAt(revealedAt: string): SessionEntry {
    if (this.data.revealedAt !== undefined) {
      return this
    }
    return new SessionEntry({ ...this.data, revealedAt })
  }

  withSelfAssessment(selfAssessment: SelfAssessment, selfAssessedAt: string): SessionEntry {
    return new SessionEntry({ ...this.data, selfAssessment, manualWordState: undefined, selfAssessedAt })
  }

  withManualWordState(wordState: WordState, selfAssessedAt: string): SessionEntry {
    return new SessionEntry({ ...this.data, selfAssessment: undefined, manualWordState: wordState, selfAssessedAt })
  }

  toData(): SessionEntryData {
    return { ...this.data }
  }
}

export class Session {
  private readonly data: SessionData

  private constructor(data: SessionData) {
    this.data = data
  }

  static start(
    id: SessionId,
    type: SessionType,
    settings: SessionSettings,
    vocabularyItemIds: VocabularyItemId[],
    startedAt: string,
  ): Session {
    const itemLimit = settings.itemLimit
    if (vocabularyItemIds.length === 0) {
      throw new Error('There are no Vocabulary items that match the Session settings.')
    }

    if (itemLimit === undefined) {
      return new Session({
        id,
        type,
        settings: settings.toData(),
        entries: [],
        candidateVocabularyItemIds: vocabularyItemIds.slice(0, unlimitedSessionCandidatePageSize),
        currentEntryIndex: 0,
        startedAt,
        lastActionAt: startedAt,
      })
    }

    return new Session({
      id,
      type,
      settings: settings.toData(),
      entries: vocabularyItemIds.slice(0, itemLimit).map((vocabularyItemId) => ({ vocabularyItemId })),
      currentEntryIndex: 0,
      startedAt,
      lastActionAt: startedAt,
    })
  }

  static fromData(data: SessionData): Session {
    return new Session({
      ...data,
      settings: SessionSettings.fromData(data.settings).toData(),
      entries: (data.entries ?? []).map((entry) => SessionEntry.fromData(entry).toData()),
      candidateVocabularyItemIds: data.candidateVocabularyItemIds === undefined ? undefined : [...data.candidateVocabularyItemIds],
      currentEntryIndex: data.currentEntryIndex ?? 0,
    })
  }

  get id(): SessionId {
    return this.data.id
  }

  get type(): SessionType {
    return this.data.type
  }

  get entries(): SessionEntry[] {
    return this.data.entries.map(SessionEntry.fromData)
  }

  get candidateVocabularyItemIds(): VocabularyItemId[] {
    return this.data.candidateVocabularyItemIds === undefined ? [] : [...this.data.candidateVocabularyItemIds]
  }

  get isUnlimited(): boolean {
    return this.data.settings.itemLimit === undefined
  }

  get isEnded(): boolean {
    return this.data.endedAt !== undefined
  }

  get isComplete(): boolean {
    return !this.isUnlimited && this.entries.every((entry) => entry.isCompleted)
  }

  get isCandidatePageComplete(): boolean {
    return this.isUnlimited && this.candidateVocabularyItemIds.length === 0 && this.entries.every((entry) => entry.isCompleted)
  }

  entryAt(index: number): SessionEntry {
    const entry = this.data.entries[index]
    if (entry === undefined) {
      throw new Error('The Session entry does not exist.')
    }
    return SessionEntry.fromData(entry)
  }

  showEntry(index: number, shownAt: string): Session {
    const entries = this.data.entries.map((entry, entryIndex) =>
      entryIndex === index ? SessionEntry.fromData(entry).withShownAt(shownAt).toData() : entry,
    )
    this.entryAt(index)
    return new Session({ ...this.data, entries, currentEntryIndex: index, lastActionAt: shownAt })
  }

  showCandidate(vocabularyItemId: VocabularyItemId, shownAt: string): Session {
    if (!this.isUnlimited || !this.candidateVocabularyItemIds.includes(vocabularyItemId)) {
      throw new Error('The Vocabulary item is not in the current Candidate page.')
    }
    const entries = [...this.data.entries, { vocabularyItemId, shownAt }]
    return new Session({
      ...this.data,
      entries,
      candidateVocabularyItemIds: this.candidateVocabularyItemIds.filter((id) => id !== vocabularyItemId),
      currentEntryIndex: entries.length - 1,
      lastActionAt: shownAt,
    })
  }

  revealEntry(index: number, revealedAt: string): Session {
    const entry = this.entryAt(index)
    const entries = this.data.entries.map((candidate, entryIndex) =>
      entryIndex === index ? entry.withRevealedAt(revealedAt).toData() : candidate,
    )
    return new Session({ ...this.data, entries, currentEntryIndex: index, lastActionAt: revealedAt })
  }

  dropCandidate(vocabularyItemId: VocabularyItemId, droppedAt: string): Session {
    if (!this.isUnlimited) {
      throw new Error('Only an Unlimited session has a Candidate page.')
    }
    return new Session({
      ...this.data,
      candidateVocabularyItemIds: this.candidateVocabularyItemIds.filter((id) => id !== vocabularyItemId),
      lastActionAt: droppedAt,
    })
  }

  selectNextCandidatePage(vocabularyItemIds: VocabularyItemId[], selectedAt: string): Session {
    if (!this.isCandidatePageComplete) {
      throw new Error('Complete the current Candidate page before selecting another.')
    }
    if (vocabularyItemIds.length === 0) {
      return this.complete(selectedAt)
    }
    const presentedVocabularyItemIds = new Set(this.data.entries.map((entry) => entry.vocabularyItemId))
    if (vocabularyItemIds.some((id) => presentedVocabularyItemIds.has(id))) {
      throw new Error('A Candidate page cannot contain a Vocabulary item already presented in the Session.')
    }
    return new Session({
      ...this.data,
      candidateVocabularyItemIds: vocabularyItemIds.slice(0, unlimitedSessionCandidatePageSize),
      lastActionAt: selectedAt,
    })
  }

  assessEntry(index: number, selfAssessment: SelfAssessment, assessedAt: string): Session {
    const entry = this.entryAt(index)
    if (entry.revealedAt === undefined) {
      throw new Error('Reveal the other card side before recording a Self-assessment.')
    }
    assertSelfAssessmentMatchesSessionType(this.data.type, selfAssessment)
    const entries = this.data.entries.map((candidate, entryIndex) =>
      entryIndex === index ? entry.withSelfAssessment(selfAssessment, assessedAt).toData() : candidate,
    )
    const nextEntryIndex = entries.findIndex((candidate) => !SessionEntry.fromData(candidate).isCompleted)

    return new Session({
      ...this.data,
      entries,
      currentEntryIndex: nextEntryIndex === -1 ? index : nextEntryIndex,
      lastActionAt: assessedAt,
    })
  }

  manuallySetEntryWordState(index: number, wordState: WordState, assessedAt: string): Session {
    const entry = this.entryAt(index)
    if (entry.revealedAt === undefined) {
      throw new Error('Reveal the other card side before completing an entry with a manual Word-state change.')
    }
    const entries = this.data.entries.map((candidate, entryIndex) =>
      entryIndex === index ? entry.withManualWordState(wordState, assessedAt).toData() : candidate,
    )
    const nextEntryIndex = entries.findIndex((candidate) => !SessionEntry.fromData(candidate).isCompleted)

    return new Session({
      ...this.data,
      entries,
      currentEntryIndex: nextEntryIndex === -1 ? index : nextEntryIndex,
      lastActionAt: assessedAt,
    })
  }

  complete(endedAt: string): Session {
    return new Session({ ...this.data, candidateVocabularyItemIds: undefined, lastActionAt: endedAt, endedAt, endReason: sessionEndReasons.completed })
  }

  end(endedAt: string): Session {
    return new Session({ ...this.data, candidateVocabularyItemIds: undefined, lastActionAt: endedAt, endedAt, endReason: sessionEndReasons.userEnded })
  }

  toData(): SessionData {
    return {
      ...this.data,
      settings: SessionSettings.fromData(this.data.settings).toData(),
      entries: this.data.entries.map((entry) => SessionEntry.fromData(entry).toData()),
      candidateVocabularyItemIds: this.data.candidateVocabularyItemIds === undefined ? undefined : [...this.data.candidateVocabularyItemIds],
    }
  }
}

export function isRecallSelfAssessment(
  selfAssessment: SelfAssessment,
): selfAssessment is RecallSelfAssessment {
  return (
    selfAssessment === recallSelfAssessments.correct ||
    selfAssessment === recallSelfAssessments.incorrect
  )
}

function assertSelfAssessmentMatchesSessionType(
  sessionType: SessionType,
  selfAssessment: SelfAssessment,
): void {
  const isKnowledgeCheckAssessment =
    selfAssessment === wordStates.known ||
    selfAssessment === wordStates.learning ||
    selfAssessment === wordStates.new ||
    selfAssessment === wordStates.excluded

  if ((sessionType === sessionTypes.knowledgeCheck) !== isKnowledgeCheckAssessment) {
    throw new Error('The Self-assessment does not match the Session type.')
  }
}

function copySessionSettingsData(data: SessionSettingsData): SessionSettingsData {
  return {
    ...data,
    cefrLevels: [...data.cefrLevels],
    wordTypes: [...data.wordTypes],
    orderingSources: data.orderingSources.map((source) => ({ ...source })),
    nounGermanSideHeaderFields: [...data.nounGermanSideHeaderFields],
    verbGermanSideHeaderFields: [...data.verbGermanSideHeaderFields],
  }
}
