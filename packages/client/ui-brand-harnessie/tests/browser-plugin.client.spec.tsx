// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { apply, inject } from '../src/client/index.ts'
import { HarnessieBrandMark, HarnessieBrandName, HarnessieHeadline, HarnessieHeroMark } from '../src/client/Brand.tsx'
import { HarnessieInstallAction, type InstallActionProps, type InstallInjected } from '../src/client/InstallAction.tsx'
import { InstallPromptStore, type BeforeInstallPromptEvent, type InstallSnapshot } from '../src/client/install.ts'
import { en, NS, zh } from '../src/client/locales.ts'
import { apply as hostApply } from '../src/index.ts'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches: false })),
  })
})

afterEach(() => {
  cleanup()
  window.__harnessieInstallPrompt = undefined
  vi.unstubAllEnvs()
  document.head.querySelectorAll('style[data-plugin]').forEach((tag) => { tag.remove() })
})

const HOLES = [
  'sidebar.brand.mark',
  'sidebar.brand.name',
  'conversation.hero.brand.mark',
  'conversation.hero.headline',
  'sidebar.footer.action',
] as const

const LIST_HOLES: ReadonlySet<string> = new Set(['sidebar.footer.action'])

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
    children: Object.fromEntries(HOLES.map(name => [name, { kind: LIST_HOLES.has(name) ? 'list' : 'single', scope: 'root' }])),
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
    expect(document.head.querySelector(PALETTE)?.textContent).toContain('--harnessie-mascot: url("')
    const installFace = subject.slots.entries('sidebar.footer.action')[0]?.inject?.()
    expect(installFace).toMatchObject({
      install: expect.any(Function) as InstallInjected['install'],
      hooks: { installState: expect.any(InstallPromptStore) as InstallPromptStore },
    })

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

  it('renders the headline in the host layout without the default preview badge', () => {
    const headline = render(<HarnessieHeadline className="host" t={key => en[key as keyof typeof en]} />)
    expect(headline.container.firstElementChild?.className).toBe('host')
    expect(headline.container.textContent).toBe('What should we work on?')
  })
})

type FakeInstallPrompt = BeforeInstallPromptEvent & { readonly prompt: Mock<() => Promise<void>> }

function installPrompt(outcome: 'accepted' | 'dismissed'): FakeInstallPrompt {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome }),
  })
}

describe('install prompt store', () => {
  it('adopts a prompt the head script captured and reports an installed window', () => {
    const early = installPrompt('accepted')
    window.__harnessieInstallPrompt = early
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList)
    const store = new InstallPromptStore(window)
    expect(store.getSnapshot()).toEqual({ installed: true, promptable: true })
    expect(window.__harnessieInstallPrompt).toBeUndefined()
  })

  it('defers the browser offer, opens it once, and records the outcome', async () => {
    const store = new InstallPromptStore(window)
    const detach = store.attach()
    const changes = vi.fn()
    const unsubscribe = store.subscribe(changes)
    expect(await store.install()).toBe(false)

    const dismissed = installPrompt('dismissed')
    window.dispatchEvent(dismissed)
    expect(dismissed.defaultPrevented).toBe(true)
    expect(store.getSnapshot()).toEqual({ installed: false, promptable: true })
    expect(await store.install()).toBe(true)
    expect(dismissed.prompt).toHaveBeenCalledOnce()
    expect(store.getSnapshot()).toEqual({ installed: false, promptable: false })

    window.dispatchEvent(installPrompt('accepted'))
    expect(await store.install()).toBe(true)
    expect(store.getSnapshot().installed).toBe(true)
    expect(changes).toHaveBeenCalled()

    unsubscribe()
    detach()
    window.dispatchEvent(installPrompt('accepted'))
    expect(store.getSnapshot().promptable).toBe(false)
  })

  it('marks the app installed when the browser finishes an installation', () => {
    const store = new InstallPromptStore(window)
    const detach = store.attach()
    window.dispatchEvent(installPrompt('accepted'))
    window.dispatchEvent(new Event('appinstalled'))
    expect(store.getSnapshot()).toEqual({ installed: true, promptable: false })
    detach()
  })
})

describe('Harnessie install action', () => {
  function props(snapshot: InstallSnapshot, install: () => Promise<boolean>, wide: boolean): InstallActionProps {
    const useInstallState = ((selector?: (value: InstallSnapshot) => unknown) =>
      selector === undefined ? snapshot : selector(snapshot)) as InstallActionProps['useInstallState']
    return { wide, t: (key: string) => en[key as keyof typeof en], useInstallState, install }
  }

  it('renders nothing inside the installed app', () => {
    const view = render(<HarnessieInstallAction {...props({ installed: true, promptable: false }, vi.fn(), true)} />)
    expect(view.container.innerHTML).toBe('')
  })

  it('opens the browser dialog when one was offered', async () => {
    const install = vi.fn(() => Promise.resolve(true))
    const view = render(<HarnessieInstallAction {...props({ installed: false, promptable: true }, install, true)} />)
    expect(view.getByText('Install app')).toBeTruthy()
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Install app' })) })
    expect(install).toHaveBeenCalledOnce()
    expect(view.queryByRole('dialog')).toBeNull()
  })

  it('explains the browser-menu route when no dialog was offered, and closes the explanation', async () => {
    const view = render(<HarnessieInstallAction {...props({ installed: false, promptable: false }, () => Promise.resolve(false), false)} />)
    expect(view.queryByText('Install app')).toBeNull()
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Install app' })) })
    expect(view.getByRole('dialog', { name: 'Install app' }).textContent).toContain(en['install.help'])
    fireEvent.click(view.getByRole('button', { name: en['install.close'] }))
    expect(view.queryByRole('dialog')).toBeNull()

    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Install app' })) })
    fireEvent.click(view.getByRole('button', { name: en['install.dismiss'] }))
    expect(view.queryByRole('dialog')).toBeNull()
  })
})
