// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { apply, inject } from '../src/client/index.ts'
import { HarnessieBrandMark, HarnessieBrandName, HarnessieHeroMark } from '../src/client/Brand.tsx'
import { en, NS, zh } from '../src/client/locales.ts'
import { apply as hostApply } from '../src/index.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  document.head.querySelectorAll('style[data-plugin]').forEach((tag) => { tag.remove() })
})

const HOLES = [
  'sidebar.brand.mark',
  'sidebar.brand.name',
  'conversation.hero.brand.mark',
] as const

const PALETTE = 'style[data-plugin="@deepseek-ai/dsh-client-ui-brand-harnessie"]'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const slots = ctx.get('slots') as SlotRegistry
  const disposeLocale = vi.fn()
  const register = vi.fn(() => disposeLocale)
  ctx.provide('locale', { register } as never)
  const declareHoles = () => slots.register({
    name: 'root',
    children: Object.fromEntries(HOLES.map(name => [name, { kind: 'single', scope: 'root' }])),
  } as never, () => null)
  const disposeHoles = declareHoles()
  return { ctx, slots, register, disposeLocale, declareHoles, disposeHoles }
}

describe('Harnessie browser-brand plugin', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares the slot and locale services it uses', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers nothing outside the harnessie build profile', async () => {
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'official')
    const subject = await bench()
    await subject.ctx.plugin({ inject: [...inject], apply }).await()
    for (const hole of HOLES) expect(subject.slots.entries(hole)).toHaveLength(0)
    expect(subject.register).not.toHaveBeenCalled()
    expect(document.head.querySelector(PALETTE)).toBeNull()
  })

  it('fills every brand slot, the dictionary, and the palette, then removes them on teardown', async () => {
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'harnessie')
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    for (const hole of HOLES) expect(subject.slots.entries(hole)).toHaveLength(1)
    expect(subject.register).toHaveBeenCalledWith(NS, { zh, en })
    expect(document.head.querySelector(PALETTE)).not.toBeNull()

    subject.disposeHoles()
    for (const hole of HOLES) expect(subject.slots.entries(hole)).toHaveLength(0)
    subject.declareHoles()
    await Promise.resolve()
    for (const hole of HOLES) expect(subject.slots.entries(hole)).toHaveLength(1)

    await fiber.dispose()
    for (const hole of HOLES) expect(subject.slots.entries(hole)).toHaveLength(0)
    expect(subject.disposeLocale).toHaveBeenCalledTimes(1)
    expect(document.head.querySelector(PALETTE)).toBeNull()
  })

  it('renders the mascot at the requested sidebar edge and the translated name', () => {
    const mark = render(<HarnessieBrandMark size={24} />)
    const image = mark.container.querySelector('img')
    expect(image?.getAttribute('width')).toBe('24')
    expect(image?.getAttribute('alt')).toBe('')
    expect(image?.getAttribute('src')).toMatch(/png/)

    const name = render(<HarnessieBrandName t={key => en[key as keyof typeof en]} />)
    expect(name.container.textContent).toBe('Harnessie')
  })

  it('scales the hero mascot for its upright silhouette and keeps the host geometry class', () => {
    const bare = render(<HarnessieHeroMark size={34} />)
    const bareImage = bare.container.querySelector('img')
    expect(bareImage?.getAttribute('width')).toBe('48')
    expect(bareImage?.className.split(' ')).toHaveLength(1)
    bare.unmount()

    const hosted = render(<HarnessieHeroMark size={34} className="host" />)
    expect(hosted.container.querySelector('img')?.className.split(' ')).toContain('host')
  })
})
