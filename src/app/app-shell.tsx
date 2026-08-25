import type { PropsWithChildren } from 'react'
import { LanguageSelector } from '../components/language-selector'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

export function AppShell({ children }: PropsWithChildren) {
  const { t } = useInterfaceLanguage()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a
        className="sr-only rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white focus:absolute focus:left-4 focus:top-4 focus:not-sr-only focus:z-10 focus:outline-none focus:ring-4 focus:ring-blue-200"
        href="#main-content"
      >
        {t('skipToMainContent')}
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 px-6 py-6 sm:px-10 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-semibold tracking-wide text-blue-700">A1-C1</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {t('title')}
            </h1>
          </div>
          <LanguageSelector />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-10 sm:py-12" id="main-content">
        {children}
      </main>
    </div>
  )
}
