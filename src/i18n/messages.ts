import type { InterfaceLanguage } from '../domain/preferences'
import { interfaceLanguages } from '../domain/constants'

const englishMessages = {
  languageLabel: 'Interface language',
  loading: 'Loading learning data...',
  title: 'Learn German',
  welcome: 'Your vocabulary learning space is ready.',
  nextStep: 'The next step is to import the default vocabulary set and build the first session.',
} as const

export type MessageKey = keyof typeof englishMessages
export type Messages = Record<MessageKey, string>

export const messages: Record<InterfaceLanguage, Messages> = {
  [interfaceLanguages.english]: englishMessages,
  [interfaceLanguages.german]: {
    languageLabel: 'Sprache der Benutzeroberfläche',
    loading: 'Lerndaten werden geladen...',
    title: 'Deutsch lernen',
    welcome: 'Dein Bereich zum Vokabellernen ist bereit.',
    nextStep: 'Als Nächstes werden der Standardwortschatz importiert und die erste Sitzung erstellt.',
  },
  [interfaceLanguages.russian]: {
    languageLabel: 'Язык интерфейса',
    loading: 'Загрузка данных обучения...',
    title: 'Учить немецкий',
    welcome: 'Ваше пространство для изучения слов готово.',
    nextStep: 'Далее нужно импортировать стандартный набор слов и создать первую сессию.',
  },
}
