export class SessionFinishingCountdown {
  readonly durationMs: number
  private remaining: number
  private startedAt: number | undefined

  constructor(durationMs: number) {
    this.durationMs = durationMs
    this.remaining = durationMs
  }

  remainingAt(now: number): number {
    return Math.max(0, this.remaining - (this.startedAt === undefined ? 0 : now - this.startedAt))
  }

  resume(now: number): void {
    this.startedAt ??= now
  }

  pause(now: number): void {
    this.remaining = this.remainingAt(now)
    this.startedAt = undefined
  }

  reset(): void {
    this.remaining = this.durationMs
    this.startedAt = undefined
  }
}
