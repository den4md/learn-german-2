import { useEffect, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

interface AppShellProps extends PropsWithChildren {
  hasActiveSession: boolean
  onContinueSession(): void
  onOpenProgression(): void
  onOpenSessionSetup(): void
  onOpenSettings(): void
  onOpenVocabulary(): void
}

export function AppShell({ children, hasActiveSession, onContinueSession, onOpenProgression, onOpenSessionSetup, onOpenSettings, onOpenVocabulary }: AppShellProps) {
  const { t } = useInterfaceLanguage()
  const menuRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuRef.current?.open) {
        menuRef.current.open = false
        menuRef.current.querySelector('summary')?.focus()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const select = (action: () => void) => {
    menuRef.current!.open = false
    action()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a
        className="sr-only rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white focus:absolute focus:left-4 focus:top-4 focus:not-sr-only focus:z-10 focus:outline-none focus:ring-4 focus:ring-blue-200"
        href="#main-content"
      >
        {t('skipToMainContent')}
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{t('title')}</h1>
            <p className="mt-1 text-sm font-medium text-blue-700">Made by <a className="underline decoration-blue-300 underline-offset-2 focus:outline-none focus:ring-4 focus:ring-blue-100" href="https://github.com/den4md">@den4md</a> and Codex</p>
          </div>
          <details className="relative" ref={menuRef}>
            <summary aria-label={t('openNavigation')} className="flex cursor-pointer list-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xl font-bold leading-none text-slate-700 marker:content-none active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100"><span aria-hidden="true">≣</span></summary>
            <nav aria-label={t('navigation')} className="absolute right-0 z-10 mt-2 grid w-60 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-300/40">
              <MenuButton disabled={!hasActiveSession} onClick={() => select(onContinueSession)}>{t('continueSession')}</MenuButton>
              <MenuButton onClick={() => select(onOpenSessionSetup)}>{t('startSession')}</MenuButton>
              <MenuButton onClick={() => select(onOpenProgression)}>{t('progressionTitle')}</MenuButton>
              <MenuButton onClick={() => select(onOpenVocabulary)}>{t('navigationVocabulary')}</MenuButton>
              <MenuButton onClick={() => select(onOpenSettings)}>{t('settings')}</MenuButton>
            </nav>
          </details>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-10 sm:py-12" id="main-content">
        {children}
      </main>
    </div>
  )
}

function MenuButton({ children, disabled, onClick }: { children: string; disabled?: boolean; onClick(): void }) {
  return <button className="rounded-lg px-3 py-2.5 text-left font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" disabled={disabled} type="button" onClick={onClick}>{children}</button>
}
