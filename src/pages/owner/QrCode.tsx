import { useMemo, useState } from 'react'
import { activeLangs, useStore } from '../../store/store'
import { LANG_META, type Lang } from '../../types'
import { QR_CENTER_MARK, download, qrSvg, svgToPngBlob } from '../../lib/qr'

/** « Scannez pour voir la carte », dans les langues gérées par Eatnow. */
const SCAN_ME: Record<Lang, string> = {
  fr: 'Scannez pour voir la carte dans votre langue',
  en: 'Scan to read the menu in your language',
  es: 'Escanea para ver la carta en tu idioma',
  it: 'Inquadra per leggere il menu nella tua lingua',
  de: 'Scannen Sie die Karte in Ihrer Sprache',
  pt: 'Digitalize para ver a carta no seu idioma',
  nl: 'Scan om de kaart in uw taal te lezen',
  ru: 'Отсканируйте, чтобы открыть меню на вашем языке',
  tr: 'Menüyü kendi dilinizde okumak için tarayın',
  hy: 'Սկանավորեք՝ ճաշացանկը ձեր լեզվով կարդալու համար',
  ar: 'امسح الرمز لقراءة القائمة بلغتك',
  zh: '扫码查看您语言的菜单',
  ja: 'スキャンしてお好みの言語でメニューを表示',
  ko: '스캔하여 원하는 언어로 메뉴 보기',
}

export function OwnerQrCode() {
  const { currentOwner } = useStore()
  const r = currentOwner()!.restaurant

  const [origin, setOrigin] = useState(() =>
    typeof window === 'undefined' ? 'https://eatnow.walautao.fr' : window.location.origin,
  )
  const [withLogo, setWithLogo] = useState(true)
  const [copied, setCopied] = useState(false)

  const url = `${origin.replace(/\/$/, '')}/#/r/${r.slug}`
  const langs = activeLangs(r)

  const svg = useMemo(
    () => qrSvg(url, { size: 512, center: withLogo ? { svg: QR_CENTER_MARK, ratio: 0.2 } : null }),
    [url, withLogo],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  async function downloadPng() {
    try {
      download(`eatnow-${r.slug}-qr.png`, await svgToPngBlob(svg, 1024))
    } catch {
      /* le SVG reste disponible */
    }
  }

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h2>Mon QR code</h2>
          <p>
            Posez-le sur vos tables, vitrines ou sets : vos clients ouvrent votre carte
            directement dans leur langue, sans rien installer.
          </p>
        </div>
      </div>

      <section className="card pad stack gap-m no-print">
        <div className="qr-layout">
          <div
            className="qr-preview"
            aria-label={`QR code vers la carte de ${r.name}`}
            dangerouslySetInnerHTML={{ __html: svg }}
          />

          <div className="stack gap-s" style={{ flex: '1 1 260px', minWidth: 0 }}>
            <label className="field">
              <span>Adresse encodée</span>
              <input className="input" value={url} readOnly onFocus={(e) => e.target.select()} />
            </label>

            <label className="field">
              <span>Domaine de votre application</span>
              <input
                className="input" value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="https://eatnow.walautao.fr"
              />
              <span className="tiny muted">
                Pré-rempli avec l’adresse d’où vous consultez cette page. Modifiez-la si vous
                imprimez depuis un autre environnement.
              </span>
            </label>

            <label className="switch">
              <input type="checkbox" checked={withLogo} onChange={(e) => setWithLogo(e.target.checked)} />
              <span className="track" />
              <span className="small">Pastille Eatnow au centre</span>
            </label>

            <div className="row gap-s wrap-flex">
              <button className="btn sm" onClick={copy}>{copied ? '✅ Copié' : '🔗 Copier le lien'}</button>
              <button
                className="btn outline sm"
                onClick={() => download(`eatnow-${r.slug}-qr.svg`, new Blob([svg], { type: 'image/svg+xml' }))}
              >
                ⬇️ SVG (impression)
              </button>
              <button className="btn outline sm" onClick={downloadPng}>⬇️ PNG</button>
              <button className="btn sun sm" onClick={() => window.print()}>🖨️ Imprimer le chevalet</button>
            </div>

            <p className="notice">
              💡 Le SVG s’imprime sans perte à n’importe quelle taille. Prévoyez au moins
              3 cm de côté pour un scan confortable à bout de bras.
            </p>
          </div>
        </div>
      </section>

      {/* Chevalet de table : seul élément conservé à l'impression. */}
      <section className="qr-card print-only">
        <p className="qr-card__eyebrow">{r.emoji} {r.name}</p>
        <div className="qr-card__code" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="qr-card__lead">{SCAN_ME.fr}</p>
        <ul className="qr-card__langs">
          {langs.filter((l) => l !== 'fr').slice(0, 6).map((l) => (
            <li key={l} dir={LANG_META[l].rtl ? 'rtl' : undefined}>
              <span aria-hidden>{LANG_META[l].flag}</span> {SCAN_ME[l]}
            </li>
          ))}
        </ul>
        <p className="qr-card__brand">Eatnow · {url.replace(/^https?:\/\//, '')}</p>
      </section>
    </>
  )
}
