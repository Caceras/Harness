declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

/** Compiled stylesheet text applied by a plugin-owned lifecycle effect. */
declare module '*.css?inline' {
  const source: string
  export default source
}

/** Bundled PNG artwork, inlined as a data URL. */
declare module '*.png' {
  const url: string
  export default url
}
