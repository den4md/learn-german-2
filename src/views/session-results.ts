import { sessionEndReasons, sessionTypes } from '../domain/constants'
import type { SessionEndReason, SessionType } from '../domain/constants'
import type { LearningData } from '../domain/learning-data'
import type { SessionData } from '../domain/session'

export type SessionStatus = 'active' | SessionEndReason
export const sessionStatuses: SessionStatus[] = ['active', ...Object.values(sessionEndReasons)]

export const sessionSizes = ['limited', 'unlimited'] as const

export interface SessionResultState {
  types: SessionType[]
  statuses: SessionStatus[]
  from: string
  to: string
  sizes: Array<(typeof sessionSizes)[number]>
  order: 'newest' | 'oldest'
  page: number
}

export function emptySessionResultState(): SessionResultState {
  return { types: [], statuses: [], from: '', to: '', sizes: [], order: 'newest', page: 1 }
}

export function sessionResultStateFromSearch(search: string): SessionResultState {
  const parameters = new URLSearchParams(search)
  const from = validDateParameter(parameters.get('from'))
  const to = validDateParameter(parameters.get('to'))
  const sizes = sessionSizes.filter((size) => parameters.getAll('size').includes(size))
  const page = Number(parameters.get('page'))
  return {
    types: Object.values(sessionTypes).filter((type) => parameters.getAll('type').includes(type)),
    statuses: sessionStatuses.filter((status) => parameters.getAll('status').includes(status)),
    from: from && to && to < from ? to : from,
    to: from && to && to < from ? from : to,
    sizes,
    order: parameters.get('order') === 'oldest' ? 'oldest' : 'newest',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  }
}

export function sessionSearchFromResultState(state: SessionResultState): string {
  const parameters = new URLSearchParams()
  Object.values(sessionTypes).filter((type) => state.types.includes(type)).forEach((type) => parameters.append('type', type))
  sessionStatuses.filter((status) => state.statuses.includes(status)).forEach((status) => parameters.append('status', status))
  const reversedDates = state.from && state.to && state.to < state.from
  if (state.from) parameters.set('from', reversedDates ? state.to : state.from)
  if (state.to) parameters.set('to', reversedDates ? state.from : state.to)
  sessionSizes.filter((size) => state.sizes.includes(size)).forEach((size) => parameters.append('size', size))
  if (state.order !== 'newest') parameters.set('order', state.order)
  if (state.page > 1) parameters.set('page', String(state.page))
  const search = parameters.toString()
  return search ? `?${search}` : ''
}

export function allSessionData(learningData: LearningData): SessionData[] {
  const activeSession = learningData.activeSession
  return [...learningData.sessions.map((session) => session.toData()), ...(activeSession === undefined ? [] : [activeSession.toData()])]
}

export function filterAndSortSessions(sessions: SessionData[], state: SessionResultState): SessionData[] {
  return sessions.filter((session) => {
    const status = session.endedAt === undefined ? 'active' : session.endReason ?? sessionEndReasons.userEnded
    if (state.types.length > 0 && !state.types.includes(session.type)) return false
    if (state.statuses.length > 0 && !state.statuses.includes(status)) return false
    if (state.sizes.length > 0 && !state.sizes.includes(session.settings.itemLimit === undefined ? 'unlimited' : 'limited')) return false
    if (state.from || state.to) {
      const startedAt = new Date(session.startedAt)
      const localDate = `${String(startedAt.getFullYear()).padStart(4, '0')}-${String(startedAt.getMonth() + 1).padStart(2, '0')}-${String(startedAt.getDate()).padStart(2, '0')}`
      if (state.from && localDate < state.from) return false
      if (state.to && localDate > state.to) return false
    }
    return true
  }).sort((left, right) => {
    const dateDifference = new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime()
    return (state.order === 'oldest' ? dateDifference : -dateDifference) || left.id.localeCompare(right.id)
  })
}

function validDateParameter(value: string | null): string {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return ''
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : ''
}
