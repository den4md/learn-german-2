import { LanguageSelector } from '../components/language-selector'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

export function SettingsView({ onClearData }: { onClearData(): void }) {
  const { t } = useInterfaceLanguage()

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold tracking-tight text-slate-950">{t('settings')}</h2>
      <div className="mt-8 border-t border-slate-100 pt-6"><LanguageSelector /></div>
      <div className="mt-8 border-t border-slate-100 pt-6">
        <h3 className="text-lg font-bold text-slate-950">{t('clearData')}</h3>
        <p className="mt-2 max-w-xl leading-7 text-slate-600">{t('clearDataDescription')}</p>
        <button className="mt-5 rounded-xl border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-red-100" type="button" onClick={() => { if (window.confirm(t('clearDataConfirmation'))) onClearData() }}>{t('clearData')}</button>
      </div>
    </section>
  )
}
