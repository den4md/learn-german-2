import { useEffect, useState } from 'react'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

export function BackToTop({ aboveCreateButton = false }: { aboveCreateButton?: boolean }) {
  const { t } = useInterfaceLanguage()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updateVisibility = () => {
      const viewportHeight = window.innerHeight
      setIsVisible(document.documentElement.scrollHeight >= viewportHeight * 2 && window.scrollY >= viewportHeight)
    }

    const resizeObserver = new ResizeObserver(updateVisibility)
    resizeObserver.observe(document.documentElement)
    resizeObserver.observe(document.body)
    window.addEventListener('scroll', updateVisibility, { passive: true })
    window.addEventListener('resize', updateVisibility)
    updateVisibility()

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
    }
  }, [])

  if (!isVisible) return null

  return (
    <button
      aria-label={t('backToTop')}
      className={`fixed ${aboveCreateButton ? 'bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+4.5rem)]' : 'bottom-[max(1.5rem,env(safe-area-inset-bottom))]'} right-[max(1.5rem,env(safe-area-inset-right))] z-10 flex size-12 items-center justify-center rounded-xl border border-blue-800 bg-blue-700 text-white shadow-lg shadow-slate-950/15 hover:bg-blue-800 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-200`}
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}
      title={t('backToTop')}
      type="button"
    >
      <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 19V5m-7 7 7-7 7 7" />
      </svg>
    </button>
  )
}
