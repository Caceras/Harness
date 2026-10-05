import { cp, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { clientBuildEnvironmentDefines } from '../../scripts/client-build-environment.ts'
import { productWebBundleIsolation } from './product-isolation.ts'

const src = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url))
const STANDALONE_ERROR = 'apps/web is not a standalone application: bare Vite cannot inject window.__DSH_BOOT__. '
  + 'From a repository checkout, run `pnpm dsh web`; an installed package uses `dsh web`. '
  + 'For client-plugin HMR, run `pnpm run dev:web`, which starts `dsh web` and the rebuild watchers together.'
const DEFAULT_CLIENT_TITLE = 'DSH Local Build'

/** Escape build-time text before placing it in the HTML title element. */
function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Project the public build title into the initial HTML document. */
function clientDocumentTitle(): Plugin {
  const title = escapeHtmlText(process.env.DSH_CLIENT_TITLE ?? DEFAULT_CLIENT_TITLE)
  return {
    name: 'dsh-client-document-title',
    transformIndexHtml(html) {
      return html.replace('<title>DSH Local Build</title>', `<title>${title}</title>`)
    },
  }
}

/** Keep the redistribution license beside the bundled brand font. */
function brandFontLicense(): Plugin {
  return {
    name: 'dsh-brand-font-license',
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'assets/fonts/Montserrat-OFL.txt',
        source: await readFile(src('../../packages/client/ui-theme/src/styles/Montserrat-OFL.txt')),
      })
    },
  }
}

/** Client build profile whose document carries the Harnessie install metadata. */
const HARNESSIE_PROFILE = 'harnessie'

/** Harnessie install metadata replacing the default favicon pair. */
const HARNESSIE_HEAD = [
  '<link rel="icon" type="image/png" sizes="32x32" href="./harnessie/icons/favicon-32.png" />',
  '<link rel="icon" type="image/png" sizes="64x64" href="./harnessie/icons/favicon-64.png" />',
  '<link rel="apple-touch-icon" href="./harnessie/icons/apple-touch-icon.png" />',
  '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />',
  '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#151517" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  // The install offer can arrive before the client plugins load; keep it for the sidebar Install action.
  '<script>addEventListener(\'beforeinstallprompt\', (event) => { event.preventDefault(); window.__harnessieInstallPrompt = event }, { once: true }); if (\'serviceWorker\' in navigator) addEventListener(\'load\', () => { void navigator.serviceWorker.register(\'./sw.js\') })</script>',
].join('\n    ')

/**
 * In a `harnessie` client build, swap the favicon pair for the Harnessie icon
 * links and service-worker registration, then copy `brand/harnessie` over the
 * output: the manifest replaces the default one, the worker lands at the
 * output root so its scope covers the application, and the icons stay under
 * `harnessie/`. Other profiles leave the document and output untouched.
 * @returns the profile-gated Vite plugin.
 */
function harnessieDocument(): Plugin {
  const enabled = process.env.DSH_CLIENT_BUILD_PROFILE === HARNESSIE_PROFILE
  const brand = src('./brand/harnessie')
  let outputDirectory = ''
  return {
    name: 'dsh-harnessie-document',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir)
    },
    transformIndexHtml: {
      // After Vite's asset pass, so the injected output-relative URLs stay verbatim.
      order: 'post',
      handler(html) {
        if (!enabled) return html
        const favicons = /\n {4}<link rel="icon"[^\n]*\n {4}<link rel="icon"[^\n]*/
        if (!favicons.test(html)) throw new Error('vite: index.html lost its favicon pair')
        return html.replace(favicons, `\n    ${HARNESSIE_HEAD}`)
      },
    },
    async writeBundle() {
      if (!enabled) return
      await cp(resolve(brand, 'icons'), resolve(outputDirectory, 'harnessie/icons'), { recursive: true })
      await cp(resolve(brand, 'manifest.webmanifest'), resolve(outputDirectory, 'manifest.webmanifest'))
      await cp(resolve(brand, 'sw.js'), resolve(outputDirectory, 'sw.js'))
    },
  }
}

/** Fail before a Vite dev or preview server can expose the boot-manifest-free shell. */
function rejectStandaloneServe(): Plugin {
  return {
    name: 'dsh-reject-standalone-web-serve',
    config(_config, env) {
      if (env.command === 'serve') throw new Error(STANDALONE_ERROR)
    },
  }
}

/**
 * Emit preview.html beside index.html: the built index page with one module
 * script — the worker bootstrap entry — spliced ahead of its entry tag. Both
 * pages share every chunk; the extra tag is the only difference, so the
 * static worker deployment ships the served page verbatim plus its
 * bootstrap.
 */
function emitPreviewPage(): Plugin {
  let bootstrapFile: string | undefined
  let write = true
  let written = false
  let outputDirectory = ''
  return {
    name: 'dsh-emit-preview-page',
    configResolved(config) {
      write = config.build.write
      outputDirectory = resolve(config.root, config.build.outDir)
    },
    buildStart() {
      bootstrapFile = undefined
      written = false
    },
    generateBundle(_options, bundle) {
      if (!write) return
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk' && item.isEntry && item.name === 'bootstrap') bootstrapFile = item.fileName
      }
      if (bootstrapFile === undefined) throw new Error('vite: preview bootstrap entry missing from the bundle')
    },
    writeBundle() { written = true },
    async closeBundle() {
      if (!write || !written || bootstrapFile === undefined) return
      const page = await readFile(resolve(outputDirectory, 'index.html'), 'utf8')
      const anchor = page.indexOf('<script type="module"')
      if (anchor === -1) throw new Error('vite: built index.html lost its module entry tag')
      const tag = `<script type="module" crossorigin src="./${bootstrapFile}"></script>`
      await writeFile(resolve(outputDirectory, 'preview.html'), `${page.slice(0, anchor)}${tag}${page.slice(anchor)}`)
    },
  }
}

/**
 * Vendor-chunk membership, by exact npm package name — the heavy render
 * families (math, highlight, markdown) that change only on dependency bumps.
 * Only packages workspace code imports DIRECTLY need listing: their private
 * transitive dependencies (oniguruma machinery, character tables, …) are
 * imported solely by these and rollup's chunk coloring pulls them into
 * vendor automatically. A dependency shared with index-side code falls back
 * to index — a few kB of dilution, never a correctness problem. Anything not
 * listed (react family, the vendored cordis workspace, tiny helpers like
 * anser/clsx, all workspace code) stays in the default `index` chunk, so
 * editing shell code re-hashes only index and returning clients keep the
 * cached vendor chunk.
 *
 * Every member must be React-free. A package that
 * imports react/jsx-runtime must never be listed — rollup folds a module
 * shared between the entry and a manual chunk into the manual chunk, so one
 * react-importing member would drag the single shared react copy into
 * vendor. The React side of markdown/math rendering is workspace code and
 * rides index.
 */
const VENDOR_PACKAGES: ReadonlySet<string> = new Set([
  // math
  'katex',
  // syntax highlight (@shikijs/langs is handled separately below —
  // lazy grammars must not land here)
  'shiki',
  // markdown parse pipeline (micromark/mdast; the incremental React renderer
  // over it is workspace code)
  'mdast-util-from-markdown',
  'mdast-util-gfm',
  'mdast-util-math',
  'micromark-core-commonmark',
  'micromark-extension-gfm',
  'micromark-extension-math',
  'micromark-factory-space',
  'micromark-util-character',
  'micromark-util-classify-character',
  'micromark-util-sanitize-uri',
  'micromark-util-symbol',
  'micromark-util-types',
])

/**
 * Boot grammars statically imported by ui-primitives' highlight.ts
 * (`@shikijs/langs/typescript` → `dist/typescript.mjs`, etc.). They live in
 * the same package as the lazy read-card grammars, but unlike those they are
 * part of the initial load and belong in the vendor chunk; the lazy ones must
 * stay unassigned so each keeps its own on-demand chunk.
 */
const BOOT_GRAMMAR_FILES: readonly string[] = [
  'dist/typescript.mjs',
  'dist/shellscript.mjs',
  'dist/json.mjs',
]

/** Font asset extensions routed to assets/fonts/ (KaTeX's woff2/woff/ttf faces). */
const FONT_EXTENSIONS: readonly string[] = ['.woff2', '.woff', '.ttf']

/**
 * npm package name of a resolved module id: the segment after the last
 * `node_modules/`. pnpm nests the real package under an inner node_modules.
 */
function npmPackageOf(id: string): string | undefined {
  const parts = id.split('/node_modules/')
  if (parts.length === 1) return undefined
  const [first, second] = parts[parts.length - 1].split('/')
  if (first.startsWith('.')) return undefined // .pnpm store segment, not a package
  if (first.startsWith('@')) return second === undefined ? undefined : `${first}/${second}`
  return first
}

export default defineConfig({
  // Relative asset URLs: preview.html mounts the same output under any base
  // directory, and the served index resolves identically from the site root.
  base: './',
  plugins: [
    rejectStandaloneServe(), clientDocumentTitle(), harnessieDocument(), brandFontLicense(), react(), emitPreviewPage(),
    productWebBundleIsolation(src('../..'), src('.')),
  ],
  build: {
    // The worker bootstrap holds its page at top-level await; Vite's default
    // `modules` target (es2020-era) rejects that syntax.
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        index: src('./index.html'),
        // Standalone entry, not an index.html script tag: Vite folds every
        // module tag of one page into a single synthetic entry, and only a
        // separate input keeps the shared page chunks bootstrap-free.
        bootstrap: src('./src/preview.ts'),
      },
      output: {
        // The worker-preview surface groups under dist/preview/ (the page
        // itself stays at dist/preview.html), so the published payload can
        // exclude it as one directory.
        entryFileNames(chunk): string {
          return chunk.name === 'bootstrap' ? 'preview/[name]-[hash].js' : 'assets/[name]-[hash].js'
        },
        // Output layout: the two main chunks stay at assets/ root; lazy
        // @shikijs/langs grammar chunks group under assets/langs/; fonts
        // (all KaTeX faces referenced by vendor.css) group under
        // assets/fonts/. Sourcemaps need no arrangement: rollup writes each
        // .map next to its js and references it by bare relative filename.
        chunkFileNames(chunk): string {
          // Grammar chunks are recognized by their member modules, not the
          // facade: shared embedded-grammar chunks (e.g. html+javascript,
          // split out because php/ruby/mdx embed them) have no facade at all.
          // index and vendor are excluded by name — vendor legitimately
          // carries the three boot grammars.
          if (chunk.name === 'index' || chunk.name === 'vendor') return 'assets/[name]-[hash].js'
          const isLangChunk = chunk.moduleIds.some(id => id.includes('/node_modules/@shikijs/langs/'))
          return isLangChunk ? 'assets/langs/[name]-[hash].js' : 'assets/[name]-[hash].js'
        },
        assetFileNames(asset): string {
          const fileName = asset.names[0] ?? ''
          const isFont = FONT_EXTENSIONS.some(ext => fileName.endsWith(ext))
          return isFont ? 'assets/fonts/[name]-[hash][extname]' : 'assets/[name]-[hash][extname]'
        },
        manualChunks(id: string): string | undefined {
          const pkg = npmPackageOf(id)
          if (pkg === undefined) return undefined // workspace + vendored cordis: index
          if (pkg === '@shikijs/langs') {
            return BOOT_GRAMMAR_FILES.some(file => id.endsWith(`/${file}`)) ? 'vendor' : undefined
          }
          return VENDOR_PACKAGES.has(pkg) ? 'vendor' : undefined
        },
      },
    },
  },
  worker: {
    // The preview worker rides dist/preview/ with the rest of that surface.
    rollupOptions: { output: { entryFileNames: 'preview/[name]-[hash].js' } },
  },
  resolve: {
    // One instance per shared npm identity: a bare specifier otherwise resolves
    // from the importer's directory, so a diverging range ships a second React
    // and splits hook and element identity. Entries are package ids — they cover
    // react/jsx-runtime and react-dom/client — and resolve from this package's
    // node_modules, so react must stay a devDependency here and any watcher must
    // run vite from this directory (scripts/dev-web.ts). Workspace packages need
    // no entry: pnpm links each of them to a single directory.
    dedupe: ['react', 'react-dom'],
    // Workspace packages are consumed as built lib products: each resolves
    // through its own package.json exports from the importer's directory, and
    // CSS still rides Vite's pipeline because the client build preset emits it
    // beside the bundle. Plugin packages never enter this graph; they arrive as
    // runtime bundles through the client module system. The remaining alias
    // browserizes the vendored Cordis Loader's only Node import.
    alias: [
      { find: /^node:module$/, replacement: src('./src/node-module-stub.ts') },
    ],
  },
  define: {
    ...clientBuildEnvironmentDefines(process.env),
    // vendored loader internal.ts: fromInternal() probes the Node major —
    // "0.0.0" takes neither branch, returning undefined (exactly the empty
    // internal slot the shell boot fills with the client module loader).
    'process.versions.node': '"0.0.0"',
    'process.execArgv': '[]',
    // vendored loader index.ts: envData falls to its default branch.
    'process.env.CORDIS_SHARED': 'undefined',
  },
})
