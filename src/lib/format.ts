import type { Lang } from '../types'

const LOCALE: Record<Lang, string> = {
  fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', de: 'de-DE', pt: 'pt-PT',
  nl: 'nl-NL', ru: 'ru-RU', tr: 'tr-TR', ar: 'ar-MA', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
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
