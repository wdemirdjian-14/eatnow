import { writeFileSync } from 'node:fs'

const R0 = 62, R1 = 15, turns = 3, steps = 300
const pts = []
for (let i = 0; i <= steps; i++) {
  const t = i / steps
  const a = t * turns * Math.PI * 2 - Math.PI / 2
  const r = R0 + (R1 - R0) * t
  pts.push([(100 + r * Math.cos(a)).toFixed(1), (100 + r * Math.sin(a)).toFixed(1)])
}
const d = 'M ' + pts[0].join(' ') + pts.slice(1).map(p => ' L ' + p.join(' ')).join('')

writeFileSync('src/components/spiralPath.ts',
`// Généré par scripts/gen-logo.mjs — spirale d'Archimède (${turns} tours, r ${R0}→${R1}).
export const SPIRAL_PATH =
  '${d}'

export const GREETINGS =
  "Bonjour · Hello · Hola · Ciao · Olá · Hallo · Hej · Cześć · Merhaba · Γεια σου · Привет · مرحبا · שלום · नमस्ते · สวัสดี · Xin chào · 안녕하세요 · こんにちは · 你好 · Salam · Jambo · Aloha · "
`)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Eatnow">
  <defs>
    <linearGradient id="en-plate" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#C50C29"/><stop offset="1" stop-color="#A50A22"/>
    </linearGradient>
    <path id="en-spiral" d="${d}"/>
  </defs>
  <circle cx="100" cy="100" r="88" fill="url(#en-plate)"/>
  <circle cx="100" cy="100" r="74" fill="none" stroke="#F4C95D" stroke-width="2.5" opacity=".75"/>
  <g fill="#FFFFFF">
    <rect x="20" y="72" width="6.4" height="34" rx="3.2"/><rect x="28.6" y="72" width="6.4" height="34" rx="3.2"/>
    <path d="M17 100h21c0 8-3.6 12-6.4 13.6V166a4.1 4.1 0 1 1-8.2 0v-52.4C20.6 112 17 108 17 100Z"/>
    <path d="M183 72c-8 4-13 14-13 26s5 16 9 16.6V166a4.1 4.1 0 1 1-8.2 0V72Z"/>
  </g>
  <text font-family="Inter, Outfit, Helvetica, Arial, sans-serif" font-size="7.4" font-weight="600" letter-spacing=".4" fill="#FFF3F4">
    <textPath href="#en-spiral" startOffset="0">Bonjour · Hello · Hola · Ciao · Olá · Hallo · Hej · Cześć · Merhaba · Γεια σου · Привет · مرحبا · שלום · नमस्ते · สวัสดี · Xin chào · 안녕하세요 · こんにちは · 你好 · Salam · Jambo · Aloha</textPath>
  </text>
</svg>
`
writeFileSync('public/logo.svg', svg)

// Favicon : même marque, sans le texte (illisible sous 64 px).
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Eatnow">
  <defs>
    <linearGradient id="en-plate" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#D42C46"/><stop offset="1" stop-color="#84232E"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="88" fill="url(#en-plate)"/>
  <circle cx="100" cy="100" r="74" fill="none" stroke="#F4C95D" stroke-width="3" opacity=".8"/>
  <path d="${d}" fill="none" stroke="#FFF3F4" stroke-width="5" stroke-linecap="round" opacity=".9"/>
  <g fill="#FFFFFF">
    <rect x="20" y="72" width="6.4" height="34" rx="3.2"/><rect x="28.6" y="72" width="6.4" height="34" rx="3.2"/>
    <path d="M17 100h21c0 8-3.6 12-6.4 13.6V166a4.1 4.1 0 1 1-8.2 0v-52.4C20.6 112 17 108 17 100Z"/>
    <path d="M183 72c-8 4-13 14-13 26s5 16 9 16.6V166a4.1 4.1 0 1 1-8.2 0V72Z"/>
  </g>
</svg>
`
writeFileSync('public/favicon.svg', favicon)
console.log('logo ok')
