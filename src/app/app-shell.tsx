import type { PropsWithChildren } from 'react'
import { appVersion } from '../app-version'
import { PopupMenu } from '../components/popup-menu'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

interface AppShellProps extends PropsWithChildren {
  hasActiveSession: boolean
  isActiveSessionView: boolean
  onContinueSession(): void
  onOpenProgression(): void
  onOpenSessionSetup(): void
  onOpenSettings(): void
  onOpenVocabulary(): void
}

export function AppShell({ children, hasActiveSession, isActiveSessionView, onContinueSession, onOpenProgression, onOpenSessionSetup, onOpenSettings, onOpenVocabulary }: AppShellProps) {
  const { t } = useInterfaceLanguage()
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-950">
      <a
        className="sr-only rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white focus:absolute focus:left-4 focus:top-4 focus:not-sr-only focus:z-10 focus:outline-none focus:ring-4 focus:ring-blue-200"
        href="#main-content"
      >
        {t('skipToMainContent')}
      </a>
      {isActiveSessionView ? null : <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"><button className="rounded-lg text-left focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={onOpenProgression} type="button">{t('title')}</button></h1>
            <p className="mt-1 text-sm font-medium text-blue-700">Made by <a className="underline decoration-blue-300 underline-offset-2 focus:outline-none focus:ring-4 focus:ring-blue-100" href="https://github.com/den4md">@den4md</a> and Codex</p>
          </div>
          <PopupMenu menuAriaLabel={t('navigation')} menuClassName="absolute right-0 z-10 mt-2 grid w-60 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-300/40" triggerAriaLabel={t('openNavigation')} triggerClassName="flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xl font-bold leading-none text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" triggerContent={<span aria-hidden="true">≣</span>}>
            {(onSelect) => <nav aria-label={t('navigation')}>
              <MenuButton disabled={!hasActiveSession} onClick={() => { onSelect(); onContinueSession() }}>{t('continueSession')}</MenuButton>
              <MenuButton onClick={() => { onSelect(); onOpenSessionSetup() }}>{t('startSession')}</MenuButton>
              <MenuButton onClick={() => { onSelect(); onOpenProgression() }}>{t('progressionTitle')}</MenuButton>
              <MenuButton onClick={() => { onSelect(); onOpenVocabulary() }}>{t('navigationVocabulary')}</MenuButton>
              <MenuButton onClick={() => { onSelect(); onOpenSettings() }}>{t('settings')}</MenuButton>
            </nav>}
          </PopupMenu>
        </div>
      </header>}
      <main className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-10 sm:py-12" id="main-content">
        {children}
      </main>
      <AppFooter />
    </div>
  )
}

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-4 text-sm text-slate-500 sm:px-10">
        Version {appVersion}
      </div>
    </footer>
  )
}

function MenuButton({ children, disabled, onClick }: { children: string; disabled?: boolean; onClick(): void }) {
  return <button className="w-full rounded-lg px-3 py-2.5 text-left font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" disabled={disabled} role="menuitem" type="button" onClick={onClick}>{children}</button>
}
