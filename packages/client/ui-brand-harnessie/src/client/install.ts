/** Browser install-prompt state behind the sidebar Install action. */

/** Chrome's deferred install prompt (`beforeinstallprompt`), absent from the DOM typings. */
export interface BeforeInstallPromptEvent extends Event {
  /** Show the browser's install dialog; requires a user gesture. */
  prompt(): Promise<void>
  /** Settles with the user's answer to the dialog. */
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    /** Prompt captured by the document's head script before the client plugins load. */
    __harnessieInstallPrompt?: BeforeInstallPromptEvent | undefined
  }
}

/** What the Install action renders from. */
export interface InstallSnapshot {
  /** The page runs as an installed app window. */
  readonly installed: boolean
  /** The browser offered its install dialog, so the action can open it directly. */
  readonly promptable: boolean
}

/**
 * Observable install state for one window. `attach` listens for the browser's
 * install offer and completion; `install` opens the offered dialog once,
 * because a deferred prompt can be shown only one time.
 */
export class InstallPromptStore {
  private deferred: BeforeInstallPromptEvent | undefined
  private snapshot: InstallSnapshot
  private readonly listeners = new Set<() => void>()

  /** @param win - window whose display mode and install events drive the state. */
  constructor(private readonly win: Window) {
    this.deferred = win.__harnessieInstallPrompt
    win.__harnessieInstallPrompt = undefined
    this.snapshot = {
      installed: win.matchMedia('(display-mode: standalone)').matches,
      promptable: this.deferred !== undefined,
    }
  }

  /**
   * Listen for the browser's install offer and for a completed installation.
   * @returns the disposer removing both listeners.
   */
  attach(): () => void {
    const onPrompt = (event: Event): void => {
      event.preventDefault()
      this.deferred = event as BeforeInstallPromptEvent
      this.update({ ...this.snapshot, promptable: true })
    }
    const onInstalled = (): void => {
      this.deferred = undefined
      this.update({ installed: true, promptable: false })
    }
    this.win.addEventListener('beforeinstallprompt', onPrompt)
    this.win.addEventListener('appinstalled', onInstalled)
    return () => {
      this.win.removeEventListener('beforeinstallprompt', onPrompt)
      this.win.removeEventListener('appinstalled', onInstalled)
    }
  }

  /**
   * Subscribe to snapshot changes.
   * @param listener - called after each change.
   * @returns the unsubscribe function.
   */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /**
   * Read the current install state.
   * @returns the current snapshot; the reference changes only when the state does.
   */
  readonly getSnapshot = (): InstallSnapshot => this.snapshot

  /**
   * Open the browser's install dialog when one was offered.
   * @returns false when no dialog was available, so the caller shows manual steps.
   */
  readonly install = async (): Promise<boolean> => {
    const prompt = this.deferred
    if (prompt === undefined) return false
    this.deferred = undefined
    this.update({ ...this.snapshot, promptable: false })
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'accepted') this.update({ installed: true, promptable: false })
    return true
  }

  private update(next: InstallSnapshot): void {
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }
}
