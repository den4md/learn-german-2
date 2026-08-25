import type { SessionId, VocabularyItemId } from './identifiers'
import type { CefrLevel, WordType } from './vocabulary'
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
  selfAssessment?: SelfAssessment
  selfAssessedAt?: string
}

export interface SessionData {
  id: SessionId
  type: SessionType
  settings: SessionSettingsData
  entries: SessionEntryData[]
  currentEntryIndex: number
  startedAt: string
  lastActionAt: string
  endedAt?: string
}

export class SessionSettings {
  private readonly data: SessionSettingsData

  private constructor(data: SessionSettingsData) {
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

  get selfAssessedAt(): string | undefined {
    return this.data.selfAssessedAt
  }

  withShownAt(shownAt: string): SessionEntry {
    if (this.data.shownAt !== undefined) {
      return this
    }
    return new SessionEntry({ ...this.data, shownAt })
  }

  withSelfAssessment(selfAssessment: SelfAssessment, selfAssessedAt: string): SessionEntry {
    return new SessionEntry({ ...this.data, selfAssessment, selfAssessedAt })
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
    return new Session({
      id,
      type,
      settings: settings.toData(),
      entries: vocabularyItemIds.map((vocabularyItemId) => ({ vocabularyItemId })),
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

  get isComplete(): boolean {
    return this.data.entries.every((entry) => entry.selfAssessment !== undefined)
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

  assessEntry(index: number, selfAssessment: SelfAssessment, assessedAt: string): Session {
    const entry = this.entryAt(index)
    assertSelfAssessmentMatchesSessionType(this.data.type, selfAssessment)
    const entries = this.data.entries.map((candidate, entryIndex) =>
      entryIndex === index ? entry.withSelfAssessment(selfAssessment, assessedAt).toData() : candidate,
    )
    const nextEntryIndex = entries.findIndex((candidate) => candidate.selfAssessment === undefined)

    return new Session({
      ...this.data,
      entries,
      currentEntryIndex: nextEntryIndex === -1 ? index : nextEntryIndex,
      lastActionAt: assessedAt,
    })
  }

  end(endedAt: string): Session {
    return new Session({ ...this.data, lastActionAt: endedAt, endedAt })
  }

  toData(): SessionData {
    return {
      ...this.data,
      settings: SessionSettings.fromData(this.data.settings).toData(),
      entries: this.data.entries.map((entry) => SessionEntry.fromData(entry).toData()),
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
