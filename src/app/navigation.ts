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
  private hasUnsavedChanges = false
  private isSaving = false
  private discardChangesMessage = ''
  private onLocationChange: (location: RouteLocation) => void = () => {}

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

  connect(onLocationChange: (location: RouteLocation) => void): () => void {
    this.onLocationChange = onLocationChange
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

  allowNavigation(): boolean {
    if (this.isSaving || this.restoringEntryId !== undefined) return false
    return !this.hasUnsavedChanges || this.browser.confirm(this.discardChangesMessage)
  }

  navigate = (nextRoute: string, replace = false, vocabularyEditReturnPath?: string, sessionDetailsReturnPath?: string): boolean => {
    if (this.restoringEntryId !== undefined) return false
    const nextLocation = { ...this.locationFromRoute(nextRoute), vocabularyEditReturnPath, sessionDetailsReturnPath }
    if (nextLocation.path !== this.currentLocation.path) {
      if (!this.allowNavigation()) return false
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
    this.navigate(`/vocabulary/${id}/edit`, false, returnPath)
  }

  private updateLocation = (): void => {
    const state = this.browser.history.state
    if (this.restoringEntryId !== undefined) {
      const hasRestoredEntry = state?.navigationEntryId === this.restoringEntryId && state?.navigationStackId === this.navigationStackId
      this.restoringEntryId = undefined
      // Older or externally created entries may not have reliable indices.
      if (!hasRestoredEntry) this.restoreWithNewEntry()
      return
    }

    const isNewEntry = this.browser.history.length > this.historyLength
    const nextIndex = !isNewEntry && state?.navigationStackId === this.navigationStackId && Number.isSafeInteger(state?.navigationIndex)
      ? state.navigationIndex as number
      : undefined
    const nextLocation = this.readLocation()
    const isSameView = nextLocation.path === this.currentLocation.path
    if (!isSameView && !this.allowNavigation()) {
      if (nextIndex !== undefined && nextIndex !== this.navigationIndex) {
        this.restoringEntryId = this.navigationEntryId
        this.browser.history.go(this.navigationIndex - nextIndex)
      } else {
        this.restoreWithNewEntry()
      }
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
