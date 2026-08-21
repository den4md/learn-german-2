import type { InterfaceLanguage } from '../domain/data-document'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

const languageNames: Record<InterfaceLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
  ru: 'Русский',
}

export function LanguageSelector() {
  const { interfaceLanguage, setInterfaceLanguage, t } = useInterfaceLanguage()

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <span>{t('languageLabel')}</span>
      <select
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        value={interfaceLanguage}
        onChange={(event) => setInterfaceLanguage(event.target.value as InterfaceLanguage)}
      >
        {Object.entries(languageNames).map(([language, name]) => (
          <option key={language} value={language}>
            {name}
          </option>
        ))}
      </select>
    </label>
  )
}
