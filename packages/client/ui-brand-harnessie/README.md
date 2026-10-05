---
description: "Harnessie brand occupants for the sidebar and conversation hero plus the Harnessie palette, active only in harnessie builds; for users and maintainers deploying or replacing the Harnessie identity."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-harnessie

English | [中文](README.zh.md)

## Summary

This package gives a `harnessie` client build the Harnessie identity: the bunny mascot and the Harnessie name in the sidebar, the bunny and a Harnessie headline on the empty conversation, a hopping bunny while a turn runs, an Install action in the sidebar foot, and a cyan and teal palette for links, info buttons, focus rings, and message bubbles. Other build profiles keep the shell fallbacks and the default palette. It does not affect model requests.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount this plugin in the browser roster of a Harnessie deployment, then build the client with `DSH_CLIENT_BUILD_PROFILE=harnessie` so the occupants register. The shipped Web roster already mounts it beside the official brand package.

### Choosing the profile

`DSH_CLIENT_BUILD_PROFILE` selects which brand renders. A `harnessie` build fills `sidebar.brand.mark`, `sidebar.brand.name`, `conversation.hero.brand.mark`, and `conversation.hero.headline`, adds the `harnessie-install` entry to `sidebar.footer.action`, registers the `brandHarnessie` dictionary, and applies the palette; any other value registers nothing, so the official package or the shell fallbacks decide the presentation. Pair the profile with `DSH_CLIENT_TITLE=Harnessie` for the browser title:

```sh
DSH_CLIENT_BUILD_PROFILE=harnessie DSH_CLIENT_TITLE=Harnessie pnpm run build
```

The same profile makes the Web application build ship the Harnessie install manifest, PNG icons, and service worker; [`deploy/harnessie`](../../../deploy/harnessie/Dockerfile) builds the container image this way.

### Installing the app

The Install action opens the browser's own install dialog when the browser has offered one through `beforeinstallprompt`; the document's head script keeps an offer that arrives before the plugins load. Without an offer, the action explains the browser-menu route. It is hidden while the page runs as an installed app window and after the browser reports a completed installation. A deferred dialog opens once; the next offer arrives on a later page load.

### Replacing the brand

A deployment with another identity leaves this package out and composes its own package that occupies the same slots. Occupying a slot is the only composition route; there is no brand configuration surface here.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The sidebar mark and name install as one declaration-aware registration set, and the hero mark installs on its own declaration: nested `ctx.slots.inject()` calls wait on each declarer, so the sets work whether this row activates before or after them and withdraw cleanly when a declaration collapses. The mascot is a PNG inlined into the bundle as a data URL. The palette is a `?inline` stylesheet appended to the document head by a plugin-owned effect together with the `--harnessie-mascot` image URL; it redefines the `--dsw-static-deepseek-*` scale under `html body`, which outranks the theme's own `body` rules, and paints the mascot over the running-status icon inside `[data-chat-running]`, matched by its CSS-module class suffix `_runningIcon`. [`src/client/install.ts`](src/client/install.ts) holds the install state the action reads through its `useInstallState` hook. The browser half is [`src/client/index.ts`](src/client/index.ts); the node half is an empty Loader seat.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these pages when the brand surface is not enough. They move from the slots this package occupies to the shell that renders them.

- [ui-sidebar](../ui-sidebar/README.md) — declares `sidebar.brand.mark` and `sidebar.brand.name` and renders their fallbacks.
- [ui-conversation](../ui-conversation/README.md) — declares `conversation.hero.brand.mark` in the hero.
- [ui-brand-official](../ui-brand-official/README.md) — the official occupants for the same sidebar slots.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package contributes browser presentation only; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits define how the Harnessie presentation is supplied. They are current package constraints, not a task backlog.

- **The running mark follows a class name** — the chat's running icon has no slot, so the bunny replaces it through the `_runningIcon` CSS-module class suffix; if that naming changes, the default whale shows again.
- **Desktop onboarding art stays default** — the onboarding screenshots have no slot.
- **The browser title is independent** — `DSH_CLIENT_TITLE` selects title text at build time rather than through a UI slot.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
