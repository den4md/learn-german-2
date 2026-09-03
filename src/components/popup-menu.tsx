import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent, PropsWithChildren, ReactNode } from 'react'

interface PopupMenuContextValue {
  closeMenu(): void
  openMenuId: string | undefined
  setOpenMenuId(menuId: string | undefined): void
}

const PopupMenuContext = createContext<PopupMenuContextValue | undefined>(undefined)

export function PopupMenuProvider({ children }: PropsWithChildren) {
  const [openMenuId, setOpenMenuId] = useState<string | undefined>()
  const value = useMemo(() => ({ closeMenu: () => setOpenMenuId(undefined), openMenuId, setOpenMenuId }), [openMenuId])

  return <PopupMenuContext.Provider value={value}>{children}</PopupMenuContext.Provider>
}

interface PopupMenuProps {
  children(onSelect: () => void): ReactNode
  menuAriaLabel: string
  menuClassName: string
  onClose?(): void
  triggerAriaLabel: string
  triggerClassName: string
  triggerContent: ReactNode
}

export function PopupMenu({ children, menuAriaLabel, menuClassName, onClose, triggerAriaLabel, triggerClassName, triggerContent }: PopupMenuProps) {
  const context = useContext(PopupMenuContext)
  if (context === undefined) throw new Error('PopupMenu must be used within PopupMenuProvider.')

  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLElement>(null)
  const isOpen = context.openMenuId === menuId
  const [pendingMenuFocus, setPendingMenuFocus] = useState<'first' | 'last' | undefined>()

  const close = (restoreFocus = false) => {
    setPendingMenuFocus(undefined)
    context.closeMenu()
    onClose?.()
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    if (!isOpen) return

    const closeOnPointerDownOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) close()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close(true)
      }
    }

    window.addEventListener('pointerdown', closeOnPointerDownOutside)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnPointerDownOutside)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || pendingMenuFocus === undefined) return

    const menuItems = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
    const menuItem = pendingMenuFocus === 'first' ? menuItems?.[0] : menuItems?.[menuItems.length - 1]
    menuItem?.focus()
    setPendingMenuFocus(undefined)
  }, [isOpen, pendingMenuFocus])

  const open = (menuFocus?: 'first' | 'last') => {
    setPendingMenuFocus(menuFocus)
    context.setOpenMenuId(menuId)
  }

  const toggle = () => {
    if (isOpen) close()
    else open()
  }

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      open(event.key === 'ArrowDown' ? 'first' : 'last')
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggle()
    }
  }

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Tab') close()
  }

  const handleClick = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation()

  return (
    <div className="relative w-fit" ref={rootRef} onClick={handleClick}>
      <button aria-controls={isOpen ? menuId : undefined} aria-expanded={isOpen} aria-haspopup="menu" aria-label={triggerAriaLabel} className={triggerClassName} ref={triggerRef} type="button" onClick={toggle} onKeyDown={handleTriggerKeyDown}>{triggerContent}</button>
      {isOpen ? <section className={menuClassName} id={menuId} ref={menuRef} role="menu" aria-label={menuAriaLabel} onKeyDown={handleMenuKeyDown}>{children(() => close())}</section> : null}
    </div>
  )
}
