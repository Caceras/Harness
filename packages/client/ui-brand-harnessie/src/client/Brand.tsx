import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { HeroBrandMarkOwnerProps, HeroHeadlineOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SidebarBrandMarkOwnerProps, SidebarBrandNameOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import mascot from './assets/harnessie-mascot.png'
import type { NS } from './locales.ts'
import css from './Brand.module.css'

/** Hero edge relative to the host-requested size: the upright bunny needs more height than the wide fish it replaces. */
const HERO_SCALE = 1.4

/**
 * Render the bunny mascot at the sidebar's requested square edge.
 * @param props - Host-supplied mark presentation.
 * @returns the decorative mascot image; the sidebar hides the brand row from assistive technology.
 */
export function HarnessieBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return <img className={css.mark} src={mascot} width={size} height={size} alt="" draggable={false} />
}

/**
 * Render the product name beside the sidebar mark.
 * @param props - framework-injected translation seat.
 * @returns the name wordmark.
 */
export function HarnessieBrandName({ t }: SidebarBrandNameOwnerProps & PropsLocale<typeof NS>) {
  return <span className={css.name}>{t('name')}</span>
}

/**
 * Render the bunny mascot leading the empty-conversation headline.
 * @param props - Host-requested edge and geometry class.
 * @returns the decorative mascot image, scaled for its upright silhouette.
 */
export function HarnessieHeroMark({ size, className }: HeroBrandMarkOwnerProps) {
  const edge = Math.round(size * HERO_SCALE)
  return <img
    className={className === undefined ? css.hero : `${className} ${css.hero}`}
    src={mascot}
    width={edge}
    height={edge}
    alt=""
    draggable={false}
  />
}

/**
 * Render the empty-conversation headline in the host's title layout.
 * @param props - host layout class and framework-injected translation seat.
 * @returns the headline text without the default preview badge.
 */
export function HarnessieHeadline({ className, t }: HeroHeadlineOwnerProps & PropsLocale<typeof NS>) {
  return <span className={className}><span>{t('headline')}</span></span>
}
