import { LanguageSelector } from '../components/language-selector'
import { useInterfaceLanguage } from '../i18n/interface-language-context'
import { useAppPopup } from '../components/app-popup'
import { learningScoreThresholds, sessionFinishDelays } from '../domain/preferences'
import type { Preferences, SessionFinishDelaySeconds } from '../domain/preferences'

export function SettingsView({ onClearData, preferences, onChangeSessionFinishDelay, onChangeLearningScoreThreshold }: { onClearData(): void; preferences: Preferences; onChangeSessionFinishDelay(seconds: SessionFinishDelaySeconds): void; onChangeLearningScoreThreshold(threshold: number): void }) {
  const { t } = useInterfaceLanguage()
  const { confirmAction } = useAppPopup()

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold tracking-tight text-slate-950">{t('settings')}</h2>
      <div className="mt-8 border-t border-slate-100 pt-6"><LanguageSelector /></div>
      <div className="mt-8 border-t border-slate-100 pt-6">
        <label className="text-lg font-bold text-slate-950">{t('learningScoreThreshold')}<select aria-describedby="learning-score-threshold-description" className="mt-3 block rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base font-normal text-slate-950 focus:outline-none focus:ring-4 focus:ring-blue-100" value={preferences.learningScoreThreshold} onChange={(event) => onChangeLearningScoreThreshold(Number(event.target.value))}>{learningScoreThresholds.map((threshold) => <option key={threshold} value={threshold}>{threshold}</option>)}</select></label>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600" id="learning-score-threshold-description">{t('learningScoreThresholdDescription')}</p>
      </div>
      <div className="mt-8 border-t border-slate-100 pt-6">
        <label className="text-lg font-bold text-slate-950">{t('sessionFinishDelay')}<select className="mt-3 block rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base font-normal text-slate-950 focus:outline-none focus:ring-4 focus:ring-blue-100" value={preferences.sessionFinishDelaySeconds} onChange={(event) => onChangeSessionFinishDelay(Number(event.target.value) as SessionFinishDelaySeconds)}>{sessionFinishDelays.map((seconds) => <option key={seconds} value={seconds}>{seconds === 0 ? t('endImmediately') : t('secondsDuration').replace('{seconds}', String(seconds))}</option>)}</select></label>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{t('sessionFinishDelayDescription')}</p>
      </div>
      <div className="mt-8 border-t border-slate-100 pt-6">
        <h3 className="text-lg font-bold text-slate-950">{t('clearData')}</h3>
        <p className="mt-2 max-w-xl leading-7 text-slate-600">{t('clearDataDescription')}</p>
        <button className="mt-5 rounded-xl border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-red-100" type="button" onClick={async () => { if (await confirmAction({ title: t('clearData'), description: t('clearDataConfirmation'), actionLabel: t('clearData'), cancelLabel: t('cancel'), destructive: true })) onClearData() }}>{t('clearData')}</button>
      </div>
    </section>
  )
}
