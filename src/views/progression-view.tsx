import { LanguageSelector } from '../components/language-selector'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

export function ProgressionView() {
  const { t } = useInterfaceLanguage()

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-12 sm:px-10">
      <header className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold tracking-wide text-blue-700">A1-C1</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">{t('title')}</h1>
        </div>
        <LanguageSelector />
      </header>

      <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-lg font-medium text-slate-950">{t('welcome')}</p>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">{t('nextStep')}</p>
      </section>
    </main>
  )
}
