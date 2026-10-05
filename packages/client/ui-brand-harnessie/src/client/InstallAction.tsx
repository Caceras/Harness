import { useState } from 'react'
import { IconDownloadOutlineMedium, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { InstallPromptStore } from './install.ts'
import type { NS } from './locales.ts'
import css from './InstallAction.module.css'

/** Registrant share of the Install action. */
export interface InstallInjected {
  /** Install state, bound by the renderer as `useInstallState`. */
  hooks: { installState: InstallPromptStore }
  /** Open the browser's install dialog; resolves false when none was offered. */
  install: () => Promise<boolean>
}

/** Composed props of the sidebar Install action. */
export type InstallActionProps = SidebarFooterActionOwnerProps & PropsLocale<typeof NS> & InjectFace<InstallInjected>

/**
 * Sidebar-foot action that installs Harnessie as an app. It opens the
 * browser's own install dialog when one was offered and otherwise explains the
 * browser-menu route; it disappears inside the installed app.
 * @param props - sidebar width, translation seat, and install state.
 * @returns the action, or nothing when the app already runs installed.
 */
export function HarnessieInstallAction({ wide, t, useInstallState, install }: InstallActionProps) {
  const installed = useInstallState(state => state.installed)
  const [helpOpen, setHelpOpen] = useState(false)
  if (installed) return null
  const label = t('install.label')
  const button = (
    <button
      type="button"
      className={wide ? css.wide : css.rail}
      aria-label={label}
      onClick={() => {
        void install().then((prompted) => { if (!prompted) setHelpOpen(true) })
      }}
    >
      <IconDownloadOutlineMedium size={16} />
      {wide && <span className={css.label}>{label}</span>}
    </button>
  )
  return (
    <div className={css.root}>
      {wide ? button : <Tooltip label={label}>{button}</Tooltip>}
      {helpOpen && (
        <div className={css.help} role="dialog" aria-label={label}>
          <p className={css.helpText}>{t('install.help')}</p>
          <button type="button" className={css.helpClose} onClick={() => { setHelpOpen(false) }}>
            {t('install.close')}
          </button>
        </div>
      )}
    </div>
  )
}
