import { useEffect, useRef, useState } from 'react'
import type { SessionFinishingCountdown } from '../app/session-finishing-countdown'
import { useAppPopup } from '../components/app-popup'
import { KeyboardHint } from '../components/keyboard-hint'
import { useIsPopupMenuOpen } from '../components/popup-menu'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

export function SessionFinishingView({ countdown, onFinish }: { countdown: SessionFinishingCountdown; onFinish(): void }) {
  const { t } = useInterfaceLanguage()
  const { isPopupOpen } = useAppPopup()
  const isMenuOpen = useIsPopupMenuOpen()
  const [isPageActive, setIsPageActive] = useState(() => document.visibilityState === 'visible' && document.hasFocus())
  const [remainingMs, setRemainingMs] = useState(() => countdown.remainingAt(performance.now()))
  const hasFinished = useRef(false)
  const finishAction = useRef(onFinish)
  finishAction.current = onFinish
  const screen = useRef<HTMLElement>(null)
  const isPaused = !isPageActive || isPopupOpen || isMenuOpen

  const finish = () => {
    if (hasFinished.current) return
    hasFinished.current = true
    finishAction.current()
  }

  useEffect(() => {
    screen.current?.focus({ preventScroll: true })
    const updateActivity = () => setIsPageActive(document.visibilityState === 'visible' && document.hasFocus())
    document.addEventListener('visibilitychange', updateActivity)
    window.addEventListener('focus', updateActivity)
    window.addEventListener('blur', updateActivity)
    return () => {
      document.removeEventListener('visibilitychange', updateActivity)
      window.removeEventListener('focus', updateActivity)
      window.removeEventListener('blur', updateActivity)
    }
  }, [])

  useEffect(() => {
    if (countdown.durationMs === 0) { finish(); return }
    if (isPaused) return
    countdown.resume(performance.now())
    const tick = () => {
      const remaining = countdown.remainingAt(performance.now())
      setRemainingMs(remaining)
      if (remaining === 0) finish()
    }
    tick()
    const interval = window.setInterval(tick, 50)
    return () => {
      window.clearInterval(interval)
      countdown.pause(performance.now())
    }
  }, [countdown, isPaused])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isPaused || event.key !== ' ' || event.target instanceof Element && event.target.closest('a, button, input, select, textarea, summary, [role="menu"], [role="menuitem"]')) return
      event.preventDefault()
      finish()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPaused])

  const progress = countdown.durationMs === 0 ? 100 : (1 - remainingMs / countdown.durationMs) * 100
  return <section aria-labelledby="session-finishing-title" className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm outline-none sm:py-16" ref={screen} tabIndex={-1}>
    <h3 className="text-xl font-bold text-slate-950" id="session-finishing-title">{t('sessionAlmostFinished')}</h3>
    <p className="mt-3 text-slate-600">{t('sessionFinishingIn').replace('{seconds}', String(Math.ceil(remainingMs / 1000)))}</p>
    <div aria-label={t('sessionFinishProgress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-slate-100" role="progressbar"><div className="h-full bg-blue-700 transition-[width] duration-75 ease-linear motion-reduce:transition-none" style={{ width: `${progress}%`, transitionDuration: isPaused ? '0ms' : undefined }} /></div>
    <p className="mt-3 text-sm text-slate-600">{t(isPaused ? 'sessionFinishingPaused' : 'sessionFinishingReview')}</p>
    <button className="mt-6 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-200" onClick={finish} type="button">{t('finishSession')}</button>
    <div className="session-space-hint"><KeyboardHint keyName="space" /></div>
  </section>
}
