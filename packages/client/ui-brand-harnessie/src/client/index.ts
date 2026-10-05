/** Harnessie occupants for the generic browser-brand slots, plus the Harnessie palette. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import mascot from './assets/harnessie-mascot.png'
import { HarnessieBrandMark, HarnessieBrandName, HarnessieHeadline, HarnessieHeroMark } from './Brand.tsx'
import { HarnessieInstallAction, type InstallInjected } from './InstallAction.tsx'
import { InstallPromptStore } from './install.ts'
import { en, NS, zh, type BrandHarnessieKey } from './locales.ts'
import palette from './theme.css?inline'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Harnessie brand copy. */
    'brandHarnessie': BrandHarnessieKey
  }
}

/** Required services: the UI slot registry and the locale dictionaries. */
export const inject = ['slots', 'locale']

/** Build profile whose artifacts carry the Harnessie identity. */
const PROFILE = 'harnessie'

/**
 * In a `harnessie` build, register the brand dictionary and stylesheet, fill
 * the sidebar mark/name pair, the conversation hero mark and headline, and add
 * the sidebar-foot Install action. Each slot set waits on its declaration, so
 * activation order against the declarers does not matter. Other build profiles
 * register nothing.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  if (process.env.DSH_CLIENT_BUILD_PROFILE !== PROFILE) return
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-brand-harnessie: dictionaries')
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = '@deepseek-ai/dsh-client-ui-brand-harnessie'
    tag.textContent = `${palette}\n:root { --harnessie-mascot: url("${mascot}"); }`
    document.head.appendChild(tag)
    return () => { tag.remove() }
  }, 'ui-brand-harnessie: palette')
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', function* () {
      yield ctx.slots.register({ name: 'sidebar.brand.mark' }, HarnessieBrandMark)
      yield ctx.slots.register({ name: 'sidebar.brand.name', locale: NS }, HarnessieBrandName)
    }))
  ctx.slots.inject('conversation.hero.brand.mark', () =>
    ctx.slots.inject('conversation.hero.headline', function* () {
      yield ctx.slots.register({ name: 'conversation.hero.brand.mark' }, HarnessieHeroMark)
      yield ctx.slots.register({ name: 'conversation.hero.headline', locale: NS }, HarnessieHeadline)
    }))
  const installPrompt = new InstallPromptStore(window)
  ctx.effect(() => installPrompt.attach(), 'ui-brand-harnessie: install prompt')
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'harnessie-install',
    locale: NS,
    inject: (): InstallInjected => ({
      hooks: { installState: installPrompt },
      install: installPrompt.install,
    }),
  }, HarnessieInstallAction))
}
