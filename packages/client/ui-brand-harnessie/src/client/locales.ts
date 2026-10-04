/** `brandHarnessie` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'brandHarnessie'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  name: 'Harnessie',
}

/** Key domain of the `brandHarnessie` namespace (zh is the source of truth). */
export type BrandHarnessieKey = keyof typeof zh

/** English dictionary. */
export const en: Record<BrandHarnessieKey, string> = {
  name: 'Harnessie',
}
