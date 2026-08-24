import { createContext, useContext } from 'react'
import type { PropsWithChildren } from 'react'
import type { InterfaceLanguage } from '../domain/preferences'
import { messages } from './messages'
import type { MessageKey } from './messages'

interface InterfaceLanguageContextValue {
  interfaceLanguage: InterfaceLanguage
  setInterfaceLanguage(interfaceLanguage: InterfaceLanguage): void
  t(messageKey: MessageKey): string
}

const InterfaceLanguageContext = createContext<InterfaceLanguageContextValue | undefined>(undefined)

interface InterfaceLanguageProviderProps extends PropsWithChildren {
  interfaceLanguage: InterfaceLanguage
  setInterfaceLanguage(interfaceLanguage: InterfaceLanguage): void
}

export function InterfaceLanguageProvider({
  interfaceLanguage,
  setInterfaceLanguage,
  children,
}: InterfaceLanguageProviderProps) {
  return (
    <InterfaceLanguageContext.Provider
      value={{
        interfaceLanguage,
        setInterfaceLanguage,
        t: (messageKey) => messages[interfaceLanguage][messageKey],
      }}
    >
      {children}
    </InterfaceLanguageContext.Provider>
  )
}

export function useInterfaceLanguage(): InterfaceLanguageContextValue {
  const context = useContext(InterfaceLanguageContext)

  if (context === undefined) {
    throw new Error('useInterfaceLanguage must be used inside InterfaceLanguageProvider')
  }

  return context
}
