import { useEffect, useRef, useState } from 'react'
import { wordStates, wordTypes } from '../domain/constants'
import type { WordState } from '../domain/constants'
import type { VocabularyItemId } from '../domain/identifiers'
import { getWordType } from '../domain/vocabulary'
import type { ResolvedVocabularyItemData } from '../domain/vocabulary'
import { useInterfaceLanguage } from '../i18n/interface-language-context'
import { PopupMenu } from './popup-menu'

interface VocabularyItemRowProps {
  item: ResolvedVocabularyItemData
  onChangeFavouriteStatus(vocabularyItemId: VocabularyItemId, isFavourite: boolean): void
  onChangeWordState(vocabularyItemId: VocabularyItemId, wordState: WordState): void
  onEditVocabularyItem(vocabularyItemId: VocabularyItemId): void
}

export function VocabularyItemRow({ item, onChangeFavouriteStatus, onChangeWordState, onEditVocabularyItem }: VocabularyItemRowProps) {
  const { t } = useInterfaceLanguage()
  const [menuPage, setMenuPage] = useState<'actions' | 'states'>('actions')
  const [pendingMenuFocus, setPendingMenuFocus] = useState<'actions' | 'states' | undefined>()
  const changeWordStateButton = useRef<HTMLButtonElement>(null)
  const firstWordStateButton = useRef<HTMLButtonElement>(null)
  const wordType = getWordType(item)

  const showWordStates = () => {
    setMenuPage('states')
    setPendingMenuFocus('states')
  }

  const showActions = () => {
    setMenuPage('actions')
    setPendingMenuFocus('actions')
  }

  useEffect(() => {
    if (pendingMenuFocus === 'actions') changeWordStateButton.current?.focus()
    if (pendingMenuFocus === 'states') firstWordStateButton.current?.focus()
    if (pendingMenuFocus !== undefined) setPendingMenuFocus(undefined)
  }, [menuPage, pendingMenuFocus])

  return <li className="px-6 py-5 sm:px-8">
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2"><p className="font-semibold text-slate-950">{getGermanHeadword(item)}</p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{t(wordStateMessageKeys[item.wordState])}</span></div>
      <div className="flex shrink-0 items-center gap-2">
        <button aria-label={t(item.isFavourite ? 'removeFavourite' : 'addFavourite')} className={`rounded-lg border border-slate-300 px-3 py-2 text-lg leading-none active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100 ${item.isFavourite ? 'text-yellow-500' : 'text-slate-500'}`} onClick={() => onChangeFavouriteStatus(item.id, !item.isFavourite)} type="button"><span aria-hidden="true">{item.isFavourite ? '★' : '☆'}</span></button>
        <PopupMenu menuAriaLabel={t('moreActions')} menuClassName="absolute right-0 z-10 mt-2 grid w-52 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-300/40" onClose={() => setMenuPage('actions')} triggerAriaLabel={t('moreActions')} triggerClassName="rounded-lg border border-slate-300 px-3 py-2 text-lg font-bold leading-none text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" triggerContent={<span aria-hidden="true">•••</span>}>
          {(onSelect) => menuPage === 'actions' ? <><button className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100" ref={changeWordStateButton} role="menuitem" onClick={showWordStates} type="button">{t('changeWordState')}</button><button className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100" role="menuitem" onClick={() => { onSelect(); onEditVocabularyItem(item.id) }} type="button">{t('edit')}</button></> : <>{Object.values(wordStates).map((wordState, index) => <button className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100" key={wordState} ref={index === 0 ? firstWordStateButton : undefined} role="menuitem" onClick={() => { setMenuPage('actions'); onSelect(); onChangeWordState(item.id, wordState) }} type="button">{t(wordStateMessageKeys[wordState])}</button>)}<button className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100" role="menuitem" onClick={showActions} type="button">{t('back')}</button></>}
        </PopupMenu>
      </div>
    </div>
    <div>
      <p className="mt-1 text-sm text-slate-600">{item.translations.join(', ')}</p>
      <p className="mt-2 text-sm font-medium text-blue-700">{item.level} · {t(wordTypeMessageKeys[wordType])}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-600"><div><dt>{t('learningScore')}</dt><dd className="mt-1 font-semibold text-slate-950">{item.learningScore} / 10</dd></div><div><dt>{t('cardShows')}</dt><dd className="mt-1 font-semibold text-slate-950">{item.learningStatistics.cardShows}</dd></div><div><dt>{t('correctAssessments')}</dt><dd className="mt-1 font-semibold text-slate-950">{item.learningStatistics.correctAssessments}</dd></div><div><dt>{t('incorrectAssessments')}</dt><dd className="mt-1 font-semibold text-slate-950">{item.learningStatistics.incorrectAssessments}</dd></div></dl>
    </div>
  </li>
}

const wordTypeMessageKeys = { [wordTypes.adjective]: 'adjective', [wordTypes.noun]: 'noun', [wordTypes.verb]: 'verb' } as const
const wordStateMessageKeys = { [wordStates.new]: 'wordStateNew', [wordStates.learning]: 'wordStateLearning', [wordStates.known]: 'wordStateKnown', [wordStates.excluded]: 'wordStateExcluded' } as const

function getGermanHeadword(item: ResolvedVocabularyItemData): string {
  return 'nominative' in item ? item.nominative : 'positive' in item ? item.positive : item.infinitive
}
