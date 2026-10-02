import { useInterfaceLanguage } from '../i18n/interface-language-context'

export const resultPageSize = 50

export function ResultPagination({ currentPage, pageCount, onChangePage }: { currentPage: number; pageCount: number; onChangePage(page: number): void }) {
  const { t } = useInterfaceLanguage()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:px-8">
      <p aria-live="polite" className="text-sm text-slate-600">{t('page')} {currentPage} / {pageCount}</p>
      <div className="flex gap-2">
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" disabled={currentPage === 1} onClick={() => onChangePage(currentPage - 1)} type="button">{t('previousPage')}</button>
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-45 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" disabled={currentPage === pageCount} onClick={() => onChangePage(currentPage + 1)} type="button">{t('nextPage')}</button>
      </div>
    </div>
  )
}
