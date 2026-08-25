export const cefrLevels = {
  a1: 'A1',
  a2: 'A2',
  b1: 'B1',
  b2: 'B2',
  c1: 'C1',
} as const

export const allCefrLevels = [
  cefrLevels.a1,
  cefrLevels.a2,
  cefrLevels.b1,
  cefrLevels.b2,
  cefrLevels.c1,
] as const

export type CefrLevel = (typeof cefrLevels)[keyof typeof cefrLevels]

export const wordTypes = {
  noun: 'noun',
  adjective: 'adjective',
  verb: 'verb',
} as const

export const allWordTypes = [wordTypes.noun, wordTypes.adjective, wordTypes.verb] as const

export type WordType = (typeof wordTypes)[keyof typeof wordTypes]

export const nounGenders = {
  male: 'Male',
  female: 'Female',
  neutral: 'Neutral',
  plural: 'Plural',
} as const

export type NounGender = (typeof nounGenders)[keyof typeof nounGenders]

export const verbHelperVerbs = {
  haben: 'haben',
  sein: 'sein',
} as const

export type VerbHelperVerb = (typeof verbHelperVerbs)[keyof typeof verbHelperVerbs]

export const verbConjugationTypes = {
  regular: 'Regular',
  irregular: 'Irregular',
} as const

export type VerbConjugationType =
  (typeof verbConjugationTypes)[keyof typeof verbConjugationTypes]

export const wordStates = {
  new: 'new',
  learning: 'learning',
  known: 'known',
  excluded: 'excluded',
} as const

export type WordState = (typeof wordStates)[keyof typeof wordStates]
export type KnowledgeCheckSelfAssessment = WordState

export const recallSelfAssessments = {
  correct: 'correct',
  incorrect: 'incorrect',
} as const

export type RecallSelfAssessment =
  (typeof recallSelfAssessments)[keyof typeof recallSelfAssessments]
export type SelfAssessment = KnowledgeCheckSelfAssessment | RecallSelfAssessment

export const sessionTypes = {
  knowledgeCheck: 'knowledge-check',
  learning: 'learning',
  repetition: 'repetition',
} as const

export type SessionType = (typeof sessionTypes)[keyof typeof sessionTypes]

export const cardSides = {
  german: 'de',
  russian: 'ru',
} as const

export type CardSide = (typeof cardSides)[keyof typeof cardSides]

export const favouriteStatusFilters = {
  all: 'all',
  favourites: 'favourites',
  nonFavourites: 'non-favourites',
} as const

export type FavouriteStatusFilter =
  (typeof favouriteStatusFilters)[keyof typeof favouriteStatusFilters]

export const orderingSources = {
  cefrLevel: 'cefr-level',
  wordType: 'word-type',
  vocabularyItem: 'vocabulary-item',
  favouriteStatus: 'favourite-status',
} as const

export type OrderingSource = (typeof orderingSources)[keyof typeof orderingSources]

export const orderingDirections = {
  none: 'none',
  ascending: 'ascending',
  descending: 'descending',
  shuffle: 'shuffle',
} as const

export type OrderingDirection = (typeof orderingDirections)[keyof typeof orderingDirections]

export const nounGermanSideHeaderFields = {
  gender: 'gender',
  plural: 'plural',
} as const

export const allNounGermanSideHeaderFields = [
  nounGermanSideHeaderFields.gender,
  nounGermanSideHeaderFields.plural,
] as const

export type NounGermanSideHeaderField =
  (typeof nounGermanSideHeaderFields)[keyof typeof nounGermanSideHeaderFields]

export const verbGermanSideHeaderFields = {
  helperVerb: 'helper-verb',
  conjugationType: 'conjugation-type',
  present: 'present',
  preterite: 'preterite',
  perfect: 'perfect',
} as const

export const allVerbGermanSideHeaderFields = [
  verbGermanSideHeaderFields.helperVerb,
  verbGermanSideHeaderFields.conjugationType,
  verbGermanSideHeaderFields.present,
  verbGermanSideHeaderFields.preterite,
  verbGermanSideHeaderFields.perfect,
] as const

export type VerbGermanSideHeaderField =
  (typeof verbGermanSideHeaderFields)[keyof typeof verbGermanSideHeaderFields]

export const interfaceLanguages = {
  english: 'en',
  german: 'de',
  russian: 'ru',
} as const

export const allInterfaceLanguages = [
  interfaceLanguages.english,
  interfaceLanguages.german,
  interfaceLanguages.russian,
] as const

export type InterfaceLanguage = (typeof interfaceLanguages)[keyof typeof interfaceLanguages]

export const dailyStreakDayStatuses = {
  valid: 'valid',
  pauseProtected: 'pause-protected',
  broken: 'broken',
} as const

export type DailyStreakDayStatus =
  (typeof dailyStreakDayStatuses)[keyof typeof dailyStreakDayStatuses]
