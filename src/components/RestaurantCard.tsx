import { Link } from 'react-router-dom'
import { CUISINE_LABEL, LANG_META, type Lang, type Restaurant } from '../types'
import { formatDistance } from '../lib/geo'
import { priceRangeLabel } from '../lib/format'
import { resolve } from '../lib/translate'
import { activeLangs } from '../store/store'
import { t } from '../i18n/ui'

export function RestaurantCard({
  r, distance, lang, dishCount,
}: { r: Restaurant; distance?: number; lang: Lang; dishCount: number }) {
  const langs = activeLangs(r)
  return (
    <Link to={`/r/${r.slug}`} className="resto-card" style={{ ['--h' as string]: r.hue }}>
      <div className="resto-cover">
        <span aria-hidden>{r.emoji}</span>
        {distance !== undefined && <span className="dist">{formatDistance(distance)}</span>}
        {r.published && (
          <span className="flags" title={`Carte traduite en ${langs.length} langues`}>
            {langs.slice(0, 5).map((l) => <span key={l}>{LANG_META[l].flag}</span>)}
            {langs.length > 5 && <span className="tiny" style={{ color: '#fff' }}>+{langs.length - 5}</span>}
          </span>
        )}
      </div>

      <div className="resto-body">
        <div className="row gap-s">
          <h3 style={{ flex: 1 }}>{r.name}</h3>
          <span className="rating"><i>★</i>{r.rating.toFixed(1)}</span>
        </div>

        <div className="row gap-xs wrap-flex small muted">
          <span>{r.cuisines.map((c) => CUISINE_LABEL[c]).join(' · ')}</span>
          <span>·</span>
          <span className="mono">{priceRangeLabel(r.priceRange)}</span>
          <span>·</span>
          <span>{r.reviews} {t('card.reviews', lang)}</span>
        </div>

        <p className="small muted" style={{ flex: 1 }}>
          {resolve(r.description, lang, r.sourceLang)}
        </p>

        <div className="row gap-xs wrap-flex">
          {r.published
            ? <span className="badge solid">🌍 {t('card.translated', lang)}</span>
            : <span className="badge grey">Carte non traduite</span>}
          <span className="badge">{dishCount} plats</span>
          <span className="spacer" />
          <span className="small" style={{ color: 'var(--teal-700)', fontWeight: 700 }}>
            {t('card.see', lang)} →
          </span>
        </div>
      </div>
    </Link>
  )
}
