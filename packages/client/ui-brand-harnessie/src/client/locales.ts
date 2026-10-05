/** `brandHarnessie` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'brandHarnessie'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'name': 'Harnessie',
  'headline': '今天想做点什么？',
  'install.label': '安装应用',
  'install.help': '打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。',
  'install.close': '知道了',
}

/** Key domain of the `brandHarnessie` namespace (zh is the source of truth). */
export type BrandHarnessieKey = keyof typeof zh

/** English dictionary. */
export const en: Record<BrandHarnessieKey, string> = {
  'name': 'Harnessie',
  'headline': 'What should we work on?',
  'install.label': 'Install app',
  'install.help': "Open your browser's menu and choose Install app or Add to Home screen.",
  'install.close': 'Got it',
}
