import { recallSelfAssessments, wordStates } from '../domain/constants'
import type { SelfAssessment } from '../domain/constants'

export type AssessmentAccent = 'excluded' | 'unknown' | 'learning' | 'known'

export function assessmentAccent(assessment: SelfAssessment): AssessmentAccent {
  if (assessment === wordStates.excluded) return 'excluded'
  if (assessment === wordStates.new || assessment === recallSelfAssessments.incorrect) return 'unknown'
  if (assessment === wordStates.known) return 'known'
  return 'learning'
}
