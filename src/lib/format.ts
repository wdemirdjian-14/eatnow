import type { Lang } from '../types'

const LOCALE: Record<Lang, string> = {
  fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', de: 'de-DE', pt: 'pt-PT',
  nl: 'nl-NL', ru: 'ru-RU', tr: 'tr-TR', hy: 'hy-AM', ar: 'ar-MA', zh: 'zh-CN',
  ja: 'ja-JP', ko: 'ko-KR',
}

export function money(value: number, lang: Lang = 'fr'): string {
  return new Intl.NumberFormat(LOCALE[lang] ?? 'fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

export function priceRangeLabel(n: number): string {
  return '€'.repeat(n)
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Dernière connexion en langage courant : « il y a 3 j », « jamais ».
 *
 * Le serveur horodate en UTC au format SQLite (« 2026-08-22 07:31:04 ») ;
 * sans le « Z » explicite, le navigateur lirait cette date comme locale et
 * afficherait deux heures d'écart en été.
 */
export function lastSeen(iso: string | undefined): string {
  if (!iso) return 'jamais'
  const d = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`)
  if (Number.isNaN(d.getTime())) return '—'
  const min = Math.floor((Date.now() - d.getTime()) / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  if (min < 60 * 24) return `il y a ${Math.floor(min / 60)} h`
  const days = Math.floor(min / (60 * 24))
  if (days < 31) return `il y a ${days} j`
  return d.toLocaleDateString('fr-FR')
}

/** Date et heure complètes d'un horodatage serveur, pour les fiches détaillées. */
export function stamp(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}
