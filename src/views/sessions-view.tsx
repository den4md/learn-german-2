import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { sessionTypes } from '../domain/constants'
import type { LearningData } from '../domain/learning-data'
import { ResultPagination, resultPageSize } from '../components/result-pagination'
import { SessionRow, sessionStatusMessageKeys, sessionTypeMessageKeys } from '../components/session-row'
import { useInterfaceLanguage } from '../i18n/interface-language-context'
import {
  allSessionData,
  emptySessionResultState,
  filterAndSortSessions,
  sessionResultStateFromSearch,
  sessionSearchFromResultState,
  sessionStatuses,
} from './session-results'
import type { SessionResultState } from './session-results'

interface SessionsViewProps {
  learningData: LearningData
  locationSearch: string
  onNavigate(route: string, replace?: boolean): void
  onOpenDetails(sessionId: string): void
  onContinue(): void
}

export function SessionsView({ learningData, locationSearch, onNavigate, onOpenDetails, onContinue }: SessionsViewProps) {
  const { t } = useInterfaceLanguage()
  const routeState = useMemo(() => sessionResultStateFromSearch(locationSearch), [locationSearch])
  const sessions = filterAndSortSessions(allSessionData(learningData), routeState)
  const pageCount = Math.max(1, Math.ceil(sessions.length / resultPageSize))
  const currentPage = Math.min(routeState.page, pageCount)
  const canonicalSearch = sessionSearchFromResultState({ ...routeState, page: currentPage })
  const visibleSessions = sessions.slice((currentPage - 1) * resultPageSize, currentPage * resultPageSize)
  const activeFilterGroupCount = [routeState.types.length > 0, routeState.statuses.length > 0, Boolean(routeState.from || routeState.to), routeState.size !== 'all'].filter(Boolean).length

  useEffect(() => {
    if (locationSearch !== canonicalSearch) onNavigate(`/sessions${canonicalSearch}`, true)
  }, [canonicalSearch, locationSearch, onNavigate])

  const changeResultState = (change: Partial<SessionResultState>) => {
    onNavigate(`/sessions${sessionSearchFromResultState({ ...routeState, ...change, page: 1 })}`)
  }
  const changePage = (page: number) => onNavigate(`/sessions${sessionSearchFromResultState({ ...routeState, page })}`)

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">{t('sessions')}</h2>
        <details className="group mt-6 border-t border-slate-200">
          <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg py-3 text-sm font-semibold text-blue-700 outline-none hover:text-blue-800 focus-visible:ring-4 focus-visible:ring-blue-100 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 flex-wrap items-center gap-3">
              <span>{t('filtersAndSorting')}</span>
              {activeFilterGroupCount > 0 ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium">{t('activeFilterGroups')}: {activeFilterGroupCount}</span> : null}
              {routeState.order === 'oldest' ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium">{t('oldestStartedFirst')}</span> : null}
            </span>
            <svg aria-hidden="true" className="mt-0.5 size-4 shrink-0 group-open:rotate-90" fill="none" viewBox="0 0 16 16"><path d="m6 3 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
          </summary>
          <div className="grid gap-6 pt-3">
            <div className="grid gap-6 md:grid-cols-2">
              <fieldset>
                <legend className="text-sm font-semibold text-slate-700">{t('sessionType')}</legend>
                <div className="mt-3 flex flex-wrap gap-3">
                  {Object.values(sessionTypes).map((type) => <label className="flex items-center gap-2 text-sm text-slate-700" key={type}><input checked={routeState.types.includes(type)} onChange={() => changeResultState({ types: routeState.types.includes(type) ? routeState.types.filter((value) => value !== type) : [...routeState.types, type] })} type="checkbox" />{t(sessionTypeMessageKeys[type])}</label>)}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-semibold text-slate-700">{t('sessionStatus')}</legend>
                <div className="mt-3 flex flex-wrap gap-3">
                  {sessionStatuses.map((status) => <label className="flex items-center gap-2 text-sm text-slate-700" key={status}><input checked={routeState.statuses.includes(status)} onChange={() => changeResultState({ statuses: routeState.statuses.includes(status) ? routeState.statuses.filter((value) => value !== status) : [...routeState.statuses, status] })} type="checkbox" />{t(status === 'active' ? 'sessionActiveStatus' : sessionStatusMessageKeys[status])}</label>)}
                </div>
              </fieldset>
            </div>
            <fieldset key={`${routeState.from}/${routeState.to}`}>
              <legend className="text-sm font-semibold text-slate-700">{t('sessionStartDate')}</legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <SessionDateInput label={t('dateFrom')} value={routeState.from} onCommit={(from) => changeResultState({ from })} />
                <SessionDateInput label={t('dateTo')} value={routeState.to} onCommit={(to) => changeResultState({ to })} />
              </div>
              <p className="mt-2 text-sm text-slate-500">{t('sessionDateRangeHint')}</p>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                {t('sessionSize')}
                <select className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={routeState.size} onChange={(event) => changeResultState({ size: event.target.value as SessionResultState['size'] })}>
                  <option value="all">{t('allSessions')}</option><option value="limited">{t('limited')}</option><option value="unlimited">{t('unlimited')}</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                {t('sorting')}
                <select className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={routeState.order} onChange={(event) => changeResultState({ order: event.target.value as SessionResultState['order'] })}>
                  <option value="newest">{t('newestStartedFirst')}</option><option value="oldest">{t('oldestStartedFirst')}</option>
                </select>
              </label>
            </div>
          </div>
        </details>
        {canonicalSearch ? <button className="mt-5 w-fit rounded-lg font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={() => onNavigate(`/sessions${sessionSearchFromResultState(emptySessionResultState())}`)} type="button">{t('resetFilters')}</button> : null}
      </section>
      <section aria-labelledby="sessions-results-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-8">
          <h3 className="text-xl font-bold tracking-tight text-slate-950" id="sessions-results-title">{t('sessions')}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">{sessions.length}</span>
        </div>
        <ResultPagination currentPage={currentPage} pageCount={pageCount} onChangePage={changePage} />
        {visibleSessions.length === 0 ? <p className="border-t border-slate-100 px-6 py-8 text-slate-600 sm:px-8">{t(allSessionData(learningData).length === 0 ? 'noSessions' : 'noSessionMatches')}</p> : (
          <ol className="divide-y divide-slate-100 border-t border-slate-100">
            {visibleSessions.map((session) => <SessionRow key={session.id} onContinue={onContinue} onOpenDetails={onOpenDetails} session={session} />)}
          </ol>
        )}
        <ResultPagination currentPage={currentPage} pageCount={pageCount} onChangePage={changePage} />
      </section>
    </div>
  )
}

function SessionDateInput({ label, value, onCommit }: { label: string; value: string; onCommit(value: string): void }) {
  const { t } = useInterfaceLanguage()
  const inputId = useId()
  const [draft, setDraft] = useState(value)
  const keyboardEditing = useRef(false)
  return (
    <div className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700">
      <label htmlFor={inputId}>{label}</label>
      <span className="flex min-w-0 gap-2">
        <input
          id={inputId}
          className="min-w-0 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          type="date"
          value={draft}
          onKeyDown={(event) => { if (event.key !== 'Tab') keyboardEditing.current = !(event.altKey && event.key === 'ArrowDown') }}
          onPointerDown={() => { keyboardEditing.current = false }}
          onChange={(event) => {
            setDraft(event.target.value)
            if (!keyboardEditing.current && event.target.validity.valid && event.target.value !== value) onCommit(event.target.value)
          }}
          onBlur={(event) => {
            keyboardEditing.current = false
            if (event.target.validity.valid && event.target.value !== value) onCommit(event.target.value)
          }}
        />
        {draft ? <button aria-label={`${t('clearDate')}: ${label}`} className="shrink-0 rounded-lg border border-slate-300 px-3 font-normal text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={() => { setDraft(''); onCommit('') }} type="button">×</button> : null}
      </span>
    </div>
  )
}
