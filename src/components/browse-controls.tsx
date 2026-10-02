import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { orderingDirections, orderingSources } from '../domain/constants'
import type { OrderingDirection, OrderingSource } from '../domain/constants'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

export function CollapsibleControls({ title, badge, defaultExpanded = false, children }: { title: string; badge?: ReactNode; defaultExpanded?: boolean; children: ReactNode }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return <details className="group border-t border-slate-200" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-3 text-lg font-bold text-slate-950 outline-none focus-visible:ring-4 focus-visible:ring-blue-100 [&::-webkit-details-marker]:hidden">
      <span className="flex min-w-0 flex-wrap items-center gap-3">{title}{badge}</span>
      <svg aria-hidden="true" className="size-4 shrink-0 text-blue-700 group-open:rotate-90" fill="none" viewBox="0 0 16 16"><path d="m6 3 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
    </summary>
    <div className="grid min-w-0 gap-6 pb-4 pt-3">{children}</div>
  </details>
}

export function FavouriteFilter({ selectedValues, onToggle }: { selectedValues: boolean[]; onToggle(value: boolean): void }) {
  const { t } = useInterfaceLanguage()
  return <fieldset>
    <legend className="text-sm font-semibold text-slate-700">{t('favouriteStatus')}</legend>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
      {[true, false].map((value) => <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700" key={String(value)}>
        <input checked={selectedValues.includes(value)} className="accent-blue-700" type="checkbox" onChange={() => onToggle(value)} />
        <span aria-hidden="true" className={value ? 'text-lg leading-none text-amber-500' : 'text-lg leading-none text-slate-500'}>{value ? '★' : '☆'}</span>
        {t(value ? 'includeFavourites' : 'includeNonFavourites')}
      </label>)}
    </div>
  </fieldset>
}

export function SortingOptions({ source, direction, onChange, onMoveEarlier, onMoveLater }: { source: OrderingSource; direction: OrderingDirection; onChange(direction: OrderingDirection): void; onMoveEarlier?: () => void; onMoveLater?: () => void }) {
  const { t } = useInterfaceLanguage()
  const name = useId()
  const directions = source === orderingSources.favouriteStatus || source === orderingSources.lastUpdated
    ? [orderingDirections.none, orderingDirections.descending, orderingDirections.ascending] as const
    : [orderingDirections.none, orderingDirections.ascending, orderingDirections.descending] as const
  return <fieldset className="min-w-0 rounded-xl border border-slate-200 px-4 pb-4">
    <legend className="px-1 text-sm font-semibold text-slate-800">{t(sourceMessageKeys[source])}</legend>
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <div className="flex min-w-0 flex-wrap gap-x-5 gap-y-3">
        {directions.map((value) => <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700" key={value}>
          <input checked={direction === value} className="accent-blue-700" name={name} type="radio" value={value} onChange={() => onChange(value)} />
          {t(value === orderingDirections.none ? 'noSorting' : directionMessageKeys[source][value])}
        </label>)}
      </div>
      <div className="flex shrink-0 gap-2">
        <button aria-label={`${t('moveSortingEarlier')}: ${t(sourceMessageKeys[source])}`} className="rounded-lg border border-slate-300 px-3 py-1 text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:opacity-40" disabled={onMoveEarlier === undefined} type="button" onClick={onMoveEarlier}><span aria-hidden="true">↑</span></button>
        <button aria-label={`${t('moveSortingLater')}: ${t(sourceMessageKeys[source])}`} className="rounded-lg border border-slate-300 px-3 py-1 text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:opacity-40" disabled={onMoveLater === undefined} type="button" onClick={onMoveLater}><span aria-hidden="true">↓</span></button>
      </div>
    </div>
  </fieldset>
}

const sourceMessageKeys = { [orderingSources.cefrLevel]: 'cefrLevels', [orderingSources.wordType]: 'wordTypes', [orderingSources.vocabularyItem]: 'germanTranslation', [orderingSources.favouriteStatus]: 'favouriteStatus', [orderingSources.lastUpdated]: 'lastUpdated' } as const
const directionMessageKeys = {
  [orderingSources.cefrLevel]: { [orderingDirections.ascending]: 'ascendingCefrLevels', [orderingDirections.descending]: 'descendingCefrLevels' },
  [orderingSources.wordType]: { [orderingDirections.ascending]: 'adjectivesFirst', [orderingDirections.descending]: 'verbsFirst' },
  [orderingSources.vocabularyItem]: { [orderingDirections.ascending]: 'ascendingAlphabetically', [orderingDirections.descending]: 'descendingAlphabetically' },
  [orderingSources.favouriteStatus]: { [orderingDirections.ascending]: 'nonFavouritesFirst', [orderingDirections.descending]: 'favouritesFirst' },
  [orderingSources.lastUpdated]: { [orderingDirections.ascending]: 'oldestFirst', [orderingDirections.descending]: 'newestFirst' },
} as const
