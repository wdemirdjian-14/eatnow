/**
 * Génère les icônes PNG de l'application à partir du logo SVG.
 *
 * Les icônes changent rarement : elles sont versionnées dans le dépôt et ce
 * script n'est pas appelé par `npm run build`. Il a besoin de Playwright
 * (présent uniquement en développement) pour rasteriser le SVG via Chromium :
 *
 *   npm i -D playwright && node scripts/gen-icons.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BRAND = '#C50C29'
const logo = readFileSync('public/logo.svg', 'utf8')
const favicon = readFileSync('public/favicon.svg', 'utf8')

/**
 * `padding` réserve la zone de sécurité des icônes « maskable » : Android
 * recadre l'icône dans un cercle de 80 % du côté, donc le motif doit tenir
 * dans cette zone et le fond couvrir tout le carré.
 */
function page(svg, size, { padding = 0, background = 'transparent' } = {}) {
  const inner = size - padding * 2
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:${background}}
    .box{width:${inner}px;height:${inner}px;margin:${padding}px}
    svg{width:100%;height:100%;display:block}
  </style></head><body><div class="box">${svg}</div></body></html>`
}

const TARGETS = [
  { file: 'public/icon-192.png', size: 192, svg: favicon, opts: {} },
  { file: 'public/icon-512.png', size: 512, svg: logo, opts: {} },
  // Zone de sécurité : 10 % de marge de chaque côté, fond plein.
  { file: 'public/icon-maskable-512.png', size: 512, svg: favicon, opts: { padding: 64, background: BRAND } },
  // iOS n'applique pas de masque et n'aime pas la transparence.
  { file: 'public/apple-touch-icon.png', size: 180, svg: favicon, opts: { padding: 12, background: BRAND } },
]

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
})
for (const { file, size, svg, opts } of TARGETS) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  await p.setContent(page(svg, size, opts))
  const buf = await p.screenshot({ omitBackground: !opts.background })
  writeFileSync(file, buf)
  await p.close()
  console.log(`${file} — ${size}×${size} (${(buf.length / 1024).toFixed(1)} ko)`)
}
await browser.close()
