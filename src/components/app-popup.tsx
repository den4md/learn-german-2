import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'

interface PopupOptions {
  title: string
  description: string
  actionLabel: string
  cancelLabel?: string
  destructive?: boolean
  returnFocus?: HTMLElement
}

interface PopupRequest {
  id: number
  options: PopupOptions
  resolve(accepted: boolean): void
  returnFocus: HTMLElement | null
}

interface AppPopupContextValue {
  confirmAction(options: PopupOptions & { cancelLabel: string }): Promise<boolean>
  showError(options: Omit<PopupOptions, 'cancelLabel' | 'destructive'>): void
  isPopupOpen: boolean
}

const AppPopupContext = createContext<AppPopupContextValue | undefined>(undefined)

export function AppPopupProvider({ children }: PropsWithChildren) {
  const [popup, setPopup] = useState<PopupRequest>()
  const pendingPopup = useRef<PopupRequest | undefined>(undefined)
  const nextId = useRef(0)

  const open = useCallback((options: PopupOptions): Promise<boolean> => {
    if (pendingPopup.current !== undefined) return Promise.resolve(false)
    return new Promise((resolve) => {
      const request = {
        id: ++nextId.current,
        options,
        resolve,
        returnFocus: options.returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null),
      }
      pendingPopup.current = request
      setPopup(request)
    })
  }, [])

  const close = useCallback((accepted: boolean) => {
    const request = pendingPopup.current
    if (request === undefined) return
    pendingPopup.current = undefined
    setPopup(undefined)
    request.resolve(accepted)
  }, [])

  useEffect(() => () => {
    pendingPopup.current?.resolve(false)
    pendingPopup.current = undefined
  }, [])

  const value = useMemo(() => ({
    confirmAction: open,
    showError: (options: PopupOptions) => { void open(options) },
    isPopupOpen: popup !== undefined,
  }), [open, popup])

  return <AppPopupContext.Provider value={value}>
    <div inert={popup !== undefined}>{children}</div>
    {popup === undefined ? null : <AppPopup key={popup.id} request={popup} onClose={close} />}
  </AppPopupContext.Provider>
}

export function useAppPopup(): AppPopupContextValue {
  const context = useContext(AppPopupContext)
  if (context === undefined) throw new Error('useAppPopup must be used inside AppPopupProvider.')
  return context
}

function AppPopup({ request, onClose }: { request: PopupRequest; onClose(accepted: boolean): void }) {
  const { options, returnFocus } = request
  const titleId = useId()
  const descriptionId = useId()
  const dialog = useRef<HTMLElement>(null)
  const initialButton = useRef<HTMLButtonElement>(null)
  const isConfirmation = options.cancelLabel !== undefined

  useEffect(() => {
    initialButton.current?.focus()
    const previousOverflow = document.body.style.overflow
    const previousPadding = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbarWidth}px`
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      // Capture before the card's window listeners, including when focus was outside.
      event.stopImmediatePropagation()
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose(false)
      } else if (event.key === 'Tab') {
        event.preventDefault()
        const buttons = [...dialog.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const nextIndex = index === -1 ? event.shiftKey ? buttons.length - 1 : 0 : (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length
        buttons[nextIndex]?.focus()
      }
    }
    const keepFocusInside = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.current?.contains(event.target)) initialButton.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('focusin', keepFocusInside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('focusin', keepFocusInside)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPadding
      if (returnFocus?.isConnected && returnFocus.closest('[inert]') === null) returnFocus.focus()
    }
  }, [onClose, returnFocus])

  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-slate-950/40 p-4" onClick={(event) => { if (event.target === event.currentTarget) onClose(false) }}>
    <section aria-describedby={descriptionId} aria-labelledby={titleId} aria-modal="true" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-left shadow-xl" ref={dialog} role={isConfirmation ? 'dialog' : 'alertdialog'}>
      <h3 className="text-lg font-bold text-slate-950" id={titleId}>{options.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700" id={descriptionId}>{options.description}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {isConfirmation ? <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white active:translate-y-px focus:outline-none focus:ring-4 focus:ring-slate-300" ref={initialButton} type="button" onClick={() => onClose(false)}>{options.cancelLabel}</button> : null}
        <button className={`rounded-xl px-4 py-2.5 font-semibold active:translate-y-px focus:outline-none focus:ring-4 ${options.destructive ? 'border border-red-300 bg-white text-red-800 focus:ring-red-100' : 'bg-blue-700 text-white focus:ring-blue-200'}`} ref={isConfirmation ? undefined : initialButton} type="button" onClick={() => onClose(true)}>{options.actionLabel}</button>
      </div>
    </section>
  </div>
}
