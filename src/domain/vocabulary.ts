import type { VocabularyItemId } from './identifiers'

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
export type WordType = 'noun' | 'adjective' | 'verb'
export type WordState = 'new' | 'learning' | 'known' | 'excluded'

export interface VocabularyItemBaseData {
  id: VocabularyItemId
  level: CefrLevel
  translations: string[]
}

export interface NounVocabularyItemData extends VocabularyItemBaseData {
  nominative: string
  gender: 'Male' | 'Female' | 'Neuter'
  plural: string
}

export interface AdjectiveVocabularyItemData extends VocabularyItemBaseData {
  positive: string
}

export interface VerbVocabularyItemData extends VocabularyItemBaseData {
  infinitive: string
  helper_verb: 'haben' | 'sein'
  conjugation_type: 'Regular' | 'Irregular'
  present: string
  preterite: string
  perfect: string
}

export type VocabularyItemData =
  | NounVocabularyItemData
  | AdjectiveVocabularyItemData
  | VerbVocabularyItemData

export type VocabularyItemTextData =
  | ({ wordType: 'noun' } & Omit<NounVocabularyItemData, keyof VocabularyItemBaseData>)
  | ({ wordType: 'adjective' } & Omit<AdjectiveVocabularyItemData, keyof VocabularyItemBaseData>)
  | ({ wordType: 'verb' } & Omit<VerbVocabularyItemData, keyof VocabularyItemBaseData>)

export interface LearningStatisticsData {
  cardShows: number
  correctAssessments: number
  incorrectAssessments: number
}

export interface VocabularyLearningRecordData {
  vocabularyItemId: VocabularyItemId
  wordState: WordState
  learningScore: number
  learningStatistics: LearningStatisticsData
  isFavourite: boolean
  germanText?: VocabularyItemTextData
  translations?: string[]
}

export interface DefaultVocabularySetIndexRangeData {
  wordType: WordType
  level: CefrLevel
  firstVocabularyItemId: VocabularyItemId
  lastVocabularyItemId: VocabularyItemId
}

export interface DefaultVocabularySetIndexData {
  ranges: DefaultVocabularySetIndexRangeData[]
}

export type ResolvedVocabularyItemData = VocabularyItemData & {
  wordState: WordState
  learningScore: number
  learningStatistics: LearningStatisticsData
  isFavourite: boolean
}

export class VocabularyItem {
  private readonly data: VocabularyItemData

  private constructor(data: VocabularyItemData) {
    this.data = data
  }

  static fromData(data: VocabularyItemData): VocabularyItem {
    return new VocabularyItem(copyVocabularyItemData(data))
  }

  get id(): VocabularyItemId {
    return this.data.id
  }

  get wordType(): WordType {
    return getWordType(this.data)
  }

  get level(): CefrLevel {
    return this.data.level
  }

  get translations(): string[] {
    return [...this.data.translations]
  }

  toData(): VocabularyItemData {
    return copyVocabularyItemData(this.data)
  }
}

export class VocabularyLearningRecord {
  private readonly data: VocabularyLearningRecordData

  private constructor(data: VocabularyLearningRecordData) {
    this.data = data
  }

  static createNew(vocabularyItemId: VocabularyItemId): VocabularyLearningRecord {
    return new VocabularyLearningRecord({
      vocabularyItemId,
      wordState: 'new',
      learningScore: 0,
      learningStatistics: createEmptyLearningStatistics(),
      isFavourite: false,
    })
  }

  static fromData(data: VocabularyLearningRecordData): VocabularyLearningRecord {
    return new VocabularyLearningRecord(copyVocabularyLearningRecordData(data))
  }

  get vocabularyItemId(): VocabularyItemId {
    return this.data.vocabularyItemId
  }

  get wordState(): WordState {
    return this.data.wordState
  }

  get learningScore(): number {
    return this.data.learningScore
  }

  get learningStatistics(): LearningStatisticsData {
    return { ...this.data.learningStatistics }
  }

  get isFavourite(): boolean {
    return this.data.isFavourite
  }

  withFavouriteStatus(isFavourite: boolean): VocabularyLearningRecord {
    return new VocabularyLearningRecord({ ...this.data, isFavourite })
  }

  toData(): VocabularyLearningRecordData {
    return copyVocabularyLearningRecordData(this.data)
  }
}

export class DefaultVocabularySet {
  private readonly items: VocabularyItem[]

  private constructor(items: VocabularyItem[]) {
    this.items = items
  }

  static fromItems(items: VocabularyItem[]): DefaultVocabularySet {
    return new DefaultVocabularySet(items.map((item) => VocabularyItem.fromData(item.toData())))
  }

  get loadedItems(): VocabularyItem[] {
    return this.items.map((item) => VocabularyItem.fromData(item.toData()))
  }

  findLoadedItem(vocabularyItemId: VocabularyItemId): VocabularyItem | undefined {
    const item = this.items.find((candidate) => candidate.id === vocabularyItemId)
    return item === undefined ? undefined : VocabularyItem.fromData(item.toData())
  }
}

export class DefaultVocabularySetIndex {
  private readonly data: DefaultVocabularySetIndexData

  private constructor(data: DefaultVocabularySetIndexData) {
    this.data = data
  }

  static fromData(data: DefaultVocabularySetIndexData): DefaultVocabularySetIndex {
    return new DefaultVocabularySetIndex({ ranges: data.ranges.map(copyDefaultVocabularySetIndexRangeData) })
  }

  findRanges(wordType: WordType, level: CefrLevel): DefaultVocabularySetIndexRangeData[] {
    return this.data.ranges
      .filter((range) => range.wordType === wordType && range.level === level)
      .map(copyDefaultVocabularySetIndexRangeData)
  }

  toData(): DefaultVocabularySetIndexData {
    return { ranges: this.data.ranges.map(copyDefaultVocabularySetIndexRangeData) }
  }
}

export class ResolvedVocabularyItem {
  private readonly data: ResolvedVocabularyItemData

  private constructor(data: ResolvedVocabularyItemData) {
    this.data = data
  }

  static fromVocabularyItem(
    vocabularyItem: VocabularyItem,
    vocabularyLearningRecord?: VocabularyLearningRecord,
  ): ResolvedVocabularyItem {
    const itemData = vocabularyItem.toData()
    const recordData = vocabularyLearningRecord?.toData()
    const resolvedItemData = applyGermanText(itemData, recordData?.germanText)

    return new ResolvedVocabularyItem({
      ...resolvedItemData,
      translations: recordData?.translations ?? resolvedItemData.translations,
      wordState: recordData?.wordState ?? 'new',
      learningScore: recordData?.learningScore ?? 0,
      learningStatistics: recordData?.learningStatistics ?? createEmptyLearningStatistics(),
      isFavourite: recordData?.isFavourite ?? false,
    })
  }

  get id(): VocabularyItemId {
    return this.data.id
  }

  get wordType(): WordType {
    return getWordType(this.data)
  }

  get wordState(): WordState {
    return this.data.wordState
  }

  get isFavourite(): boolean {
    return this.data.isFavourite
  }

  toData(): ResolvedVocabularyItemData {
    return {
      ...this.data,
      translations: [...this.data.translations],
      learningStatistics: { ...this.data.learningStatistics },
    }
  }
}

export function createEmptyLearningStatistics(): LearningStatisticsData {
  return { cardShows: 0, correctAssessments: 0, incorrectAssessments: 0 }
}

export function getWordType(vocabularyItem: VocabularyItemData): WordType {
  if ('nominative' in vocabularyItem) {
    return 'noun'
  }
  if ('positive' in vocabularyItem) {
    return 'adjective'
  }
  return 'verb'
}

export function resolveVocabularyItems(
  defaultVocabularySet: DefaultVocabularySet,
  userAddedVocabularyItems: VocabularyItem[],
  vocabularyLearningRecords: VocabularyLearningRecord[],
): ResolvedVocabularyItem[] {
  const recordsByVocabularyItemId = new Map(
    vocabularyLearningRecords.map((record) => [record.vocabularyItemId, record]),
  )
  const vocabularyItems = [...defaultVocabularySet.loadedItems, ...userAddedVocabularyItems]

  return vocabularyItems.map((item) =>
    ResolvedVocabularyItem.fromVocabularyItem(item, recordsByVocabularyItemId.get(item.id)),
  )
}

function applyGermanText(
  item: VocabularyItemData,
  germanText: VocabularyItemTextData | undefined,
): VocabularyItemData {
  if (germanText === undefined || getWordType(item) !== germanText.wordType) {
    return item
  }

  const { wordType: _, ...textData } = germanText
  return { ...item, ...textData } as VocabularyItemData
}

function copyVocabularyItemData(data: VocabularyItemData): VocabularyItemData {
  return { ...data, translations: [...data.translations] }
}

function copyVocabularyLearningRecordData(
  data: VocabularyLearningRecordData,
): VocabularyLearningRecordData {
  return {
    ...data,
    learningStatistics: { ...data.learningStatistics },
    germanText: data.germanText === undefined ? undefined : { ...data.germanText },
    translations: data.translations === undefined ? undefined : [...data.translations],
  }
}

function copyDefaultVocabularySetIndexRangeData(
  data: DefaultVocabularySetIndexRangeData,
): DefaultVocabularySetIndexRangeData {
  return { ...data }
}
