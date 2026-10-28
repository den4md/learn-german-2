import type { VocabularyItemId } from '../domain/identifiers'

interface RouteLocation {
  path: string
  search: string
  hash: string
  vocabularyEditReturnPath?: string
  sessionDetailsReturnPath?: string
}

export class AppNavigation {
  private readonly browser: Window
  private readonly basePath: string
  private currentLocation: RouteLocation
  private navigationIndex: number
  private navigationStackId: string
  private navigationEntryId: string
  private historyLength: number
  private restoringEntryId: string | undefined
  private restoration: Promise<void> | undefined
  private onRestored: (() => void) | undefined
  private isConfirming = false
  private hasUnsavedChanges = false
  private isSaving = false
  private discardChangesMessage = ''
  private onLocationChange: (location: RouteLocation) => void = () => {}
  private confirmDiscard: (message: string) => Promise<boolean> = async () => false

  constructor(browser: Window, basePath: string) {
    this.browser = browser
    this.basePath = basePath.replace(/\/$/, '')
    this.currentLocation = this.readLocation()
    const state = browser.history.state
    this.navigationStackId = typeof state?.navigationStackId === 'string' ? state.navigationStackId : browser.crypto.randomUUID()
    this.navigationIndex = Number.isSafeInteger(state?.navigationIndex) ? state.navigationIndex : 0
    this.navigationEntryId = typeof state?.navigationEntryId === 'string' ? state.navigationEntryId : browser.crypto.randomUUID()
    this.historyLength = browser.history.length
  }

  get location(): RouteLocation {
    return this.currentLocation
  }

  get href(): string {
    return `${this.currentLocation.path}${this.currentLocation.search}${this.currentLocation.hash}`
  }

  connect(onLocationChange: (location: RouteLocation) => void, confirmDiscard: (message: string) => Promise<boolean>): () => void {
    this.onLocationChange = onLocationChange
    this.confirmDiscard = confirmDiscard
    this.browser.history.replaceState(this.entryState(), '')
    this.browser.addEventListener('popstate', this.updateLocation)
    this.browser.addEventListener('beforeunload', this.beforeUnload)
    return () => {
      this.browser.removeEventListener('popstate', this.updateLocation)
      this.browser.removeEventListener('beforeunload', this.beforeUnload)
      this.onLocationChange = () => {}
    }
  }

  setUnsavedChanges(hasChanges: boolean, discardChangesMessage: string): void {
    this.hasUnsavedChanges = hasChanges
    this.discardChangesMessage = discardChangesMessage
  }

  setSaving(isSaving: boolean): void {
    this.isSaving = isSaving
  }

  discardChanges(): void {
    this.hasUnsavedChanges = false
  }

  async allowNavigation(): Promise<boolean> {
    if (this.isSaving || this.isConfirming) return false
    while (this.restoration !== undefined) await this.restoration
    if (this.isSaving || this.isConfirming) return false
    if (!this.hasUnsavedChanges) return true
    this.isConfirming = true
    try {
      const accepted = await this.confirmDiscard(this.discardChangesMessage)
      while (this.restoration !== undefined) await this.restoration
      return accepted && !this.isSaving
    } finally {
      this.isConfirming = false
    }
  }

  navigate = async (nextRoute: string, replace = false, vocabularyEditReturnPath?: string, sessionDetailsReturnPath?: string): Promise<boolean> => {
    if (this.isConfirming || this.isSaving) return false
    while (this.restoration !== undefined) await this.restoration
    const nextLocation = { ...this.locationFromRoute(nextRoute), vocabularyEditReturnPath, sessionDetailsReturnPath }
    if (nextLocation.path !== this.currentLocation.path) {
      // Unguarded transitions must stay synchronous with the caller's data update.
      if (this.hasUnsavedChanges && !await this.allowNavigation()) return false
      this.discardChanges()
    }
    const browserUrl = this.browserUrl(nextLocation)
    if (browserUrl !== this.currentBrowserUrl()) {
      if (!replace) {
        this.navigationIndex += 1
        this.navigationEntryId = this.browser.crypto.randomUUID()
      }
      this.browser.history[replace ? 'replaceState' : 'pushState'](this.entryState(nextLocation), '', browserUrl)
      this.historyLength = this.browser.history.length
    }
    this.currentLocation = nextLocation
    this.onLocationChange(nextLocation)
    return true
  }

  canonicalize(path: string): void {
    const nextLocation = { ...this.currentLocation, path }
    if (this.browserUrl(nextLocation) !== this.currentBrowserUrl()) {
      this.navigate(`${path}${nextLocation.search}${nextLocation.hash}`, true, nextLocation.vocabularyEditReturnPath, nextLocation.sessionDetailsReturnPath)
    }
  }

  openVocabularyItemEdit(id: VocabularyItemId): void {
    const returnPath = this.currentLocation.path === '/vocabulary/new'
      ? this.currentLocation.vocabularyEditReturnPath ?? '/vocabulary'
      : this.href
    this.navigate(`/vocabulary/${id}/edit`, false, returnPath, this.currentLocation.sessionDetailsReturnPath)
  }

  private updateLocation = (): void => {
    const state = this.browser.history.state
    if (this.restoringEntryId !== undefined) {
      const hasRestoredEntry = state?.navigationEntryId === this.restoringEntryId && state?.navigationStackId === this.navigationStackId
      this.restoringEntryId = undefined
      // Older or externally created entries may not have reliable indices.
      if (!hasRestoredEntry) this.restoreWithNewEntry()
      this.restoration = undefined
      this.onRestored?.()
      this.onRestored = undefined
      return
    }

    const isNewEntry = this.browser.history.length > this.historyLength
    const nextIndex = !isNewEntry && state?.navigationStackId === this.navigationStackId && Number.isSafeInteger(state?.navigationIndex)
      ? state.navigationIndex as number
      : undefined
    const nextLocation = this.readLocation()
    const isSameView = nextLocation.path === this.currentLocation.path
    if (!isSameView && (this.hasUnsavedChanges || this.isSaving || this.isConfirming)) {
      const isAlreadyConfirming = this.isConfirming
      const targetStackId = this.navigationStackId
      // Restore the editor's history entry before showing a non-blocking popup.
      // Its component stays mounted, so cancellation cannot lose the draft.
      void this.restoreLocation(nextIndex).then(async () => {
        if (isAlreadyConfirming || !await this.allowNavigation()) return
        this.discardChanges()
        if (nextIndex !== undefined && nextIndex !== this.navigationIndex && targetStackId === this.navigationStackId) this.browser.history.go(nextIndex - this.navigationIndex)
        else await this.navigate(`${nextLocation.path}${nextLocation.search}${nextLocation.hash}`, true, nextLocation.vocabularyEditReturnPath, nextLocation.sessionDetailsReturnPath)
      })
      return
    }

    if (!isSameView) this.discardChanges()
    // New native fragment entries follow the current entry, on every view.
    // Untracked older entries start a new stack because their distance is unknown.
    if (nextIndex !== undefined) {
      this.navigationIndex = nextIndex
    } else if (isNewEntry) {
      this.navigationIndex += 1
    } else {
      this.navigationStackId = this.browser.crypto.randomUUID()
      this.navigationIndex = 0
    }
    this.navigationEntryId = nextIndex !== undefined && typeof state?.navigationEntryId === 'string'
      ? state.navigationEntryId
      : this.browser.crypto.randomUUID()
    if (isSameView) {
      nextLocation.vocabularyEditReturnPath ??= this.currentLocation.vocabularyEditReturnPath
      nextLocation.sessionDetailsReturnPath ??= this.currentLocation.sessionDetailsReturnPath
    }
    this.currentLocation = nextLocation
    this.browser.history.replaceState(this.entryState(), '')
    this.historyLength = this.browser.history.length
    this.onLocationChange(nextLocation)
  }

  private beforeUnload = (event: BeforeUnloadEvent): void => {
    if (!this.hasUnsavedChanges && !this.isSaving) return
    event.preventDefault()
    event.returnValue = ''
  }

  private restoreLocation(nextIndex: number | undefined): Promise<void> {
    if (nextIndex === undefined || nextIndex === this.navigationIndex) {
      this.restoreWithNewEntry()
      return Promise.resolve()
    }
    this.restoringEntryId = this.navigationEntryId
    this.restoration = new Promise((resolve) => { this.onRestored = resolve })
    this.browser.history.go(this.navigationIndex - nextIndex)
    return this.restoration
  }

  private restoreWithNewEntry(): void {
    this.navigationStackId = this.browser.crypto.randomUUID()
    this.navigationIndex = 0
    this.navigationEntryId = this.browser.crypto.randomUUID()
    this.browser.history.pushState(this.entryState(), '', this.browserUrl(this.currentLocation))
    this.historyLength = this.browser.history.length
  }

  private entryState(location = this.currentLocation) {
    return {
      ...this.browser.history.state,
      vocabularyEditReturnPath: location.vocabularyEditReturnPath,
      sessionDetailsReturnPath: location.sessionDetailsReturnPath,
      navigationIndex: this.navigationIndex,
      navigationStackId: this.navigationStackId,
      navigationEntryId: this.navigationEntryId,
    }
  }

  private readLocation(): RouteLocation {
    const pathname = this.browser.location.pathname.startsWith(this.basePath)
      ? this.browser.location.pathname.slice(this.basePath.length) || '/'
      : this.browser.location.pathname
    const handoffRoute = pathname === '/' ? new URLSearchParams(this.browser.location.search).get('route') : null
    const state = this.browser.history.state
    const returnPaths = {
      vocabularyEditReturnPath: typeof state?.vocabularyEditReturnPath === 'string' ? state.vocabularyEditReturnPath : undefined,
      sessionDetailsReturnPath: typeof state?.sessionDetailsReturnPath === 'string' ? state.sessionDetailsReturnPath : undefined,
    }
    if (handoffRoute !== null) {
      try {
        const url = new URL(handoffRoute, this.browser.location.origin)
        if (url.origin === this.browser.location.origin) return { ...this.locationFromRoute(handoffRoute), ...returnPaths }
      } catch {
        // Invalid handoff routes fall back to the normal browser location.
      }
    }
    return { path: normalizePath(pathname), search: this.browser.location.search, hash: this.browser.location.hash, ...returnPaths }
  }

  private locationFromRoute(route: string): RouteLocation {
    const url = new URL(route, this.browser.location.origin)
    return { path: normalizePath(url.pathname), search: url.search, hash: url.hash }
  }

  private browserUrl(location: RouteLocation): string {
    return `${this.basePath}${location.path}${location.search}${location.hash}`
  }

  private currentBrowserUrl(): string {
    return `${this.browser.location.pathname}${this.browser.location.search}${this.browser.location.hash}`
  }
}

function normalizePath(pathname: string): string {
  if (pathname === '/') return '/progression'
  if (['/progression', '/session/new', '/session/active', '/settings', '/vocabulary', '/vocabulary/new', '/sessions'].includes(pathname)) return pathname
  if (/^\/sessions\/[^/]+$/.test(pathname)) return pathname
  if (/^\/vocabulary\/-?\d+\/edit$/.test(pathname)) return pathname
  return '/progression'
}
