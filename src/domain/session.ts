import type { SessionId, VocabularyItemId } from './identifiers'
import type { CefrLevel, WordType } from './vocabulary'

export type SessionType = 'knowledge-check' | 'learning' | 'repetition'
export type CardSide = 'german' | 'russian'
export type FavouriteStatusFilter = 'all' | 'favourites' | 'non-favourites'
export type OrderingSource = 'cefr-level' | 'word-type' | 'vocabulary-item' | 'favourite-status'
export type OrderingDirection = 'none' | 'ascending' | 'descending' | 'shuffle'
export type NounGermanSideHeaderField = 'gender' | 'plural'
export type VerbGermanSideHeaderField =
  | 'helper-verb'
  | 'conjugation-type'
  | 'present'
  | 'preterite'
  | 'perfect'
export type KnowledgeCheckSelfAssessment = 'known' | 'learning' | 'new' | 'excluded'
export type RecallSelfAssessment = 'correct' | 'incorrect'
export type SelfAssessment = KnowledgeCheckSelfAssessment | RecallSelfAssessment

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
      cefrLevels: ['A1', 'A2', 'B1', 'B2', 'C1'],
      wordTypes: ['noun', 'adjective', 'verb'],
      favouriteStatusFilter: 'all',
      orderingSources: [
        { source: 'cefr-level', direction: 'ascending' },
        { source: 'word-type', direction: 'none' },
        { source: 'vocabulary-item', direction: 'ascending' },
      ],
      firstCardSide: 'german',
      nounGermanSideHeaderFields: ['gender', 'plural'],
      verbGermanSideHeaderFields: ['helper-verb', 'conjugation-type', 'present', 'preterite', 'perfect'],
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

  withShownAt(shownAt: string): SessionEntry {
    if (this.data.shownAt !== undefined) {
      return this
    }
    return new SessionEntry({ ...this.data, shownAt })
  }

  withSelfAssessment(selfAssessment: SelfAssessment): SessionEntry {
    return new SessionEntry({ ...this.data, selfAssessment })
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
      entryIndex === index ? entry.withSelfAssessment(selfAssessment).toData() : candidate,
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
  return selfAssessment === 'correct' || selfAssessment === 'incorrect'
}

function assertSelfAssessmentMatchesSessionType(
  sessionType: SessionType,
  selfAssessment: SelfAssessment,
): void {
  const isKnowledgeCheckAssessment =
    selfAssessment === 'known' ||
    selfAssessment === 'learning' ||
    selfAssessment === 'new' ||
    selfAssessment === 'excluded'

  if ((sessionType === 'knowledge-check') !== isKnowledgeCheckAssessment) {
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
