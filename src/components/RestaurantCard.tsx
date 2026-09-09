import { Link } from 'react-router-dom'
import { CUISINE_LABEL, LANG_META, type Lang, type Restaurant } from '../types'
import { formatDistance } from '../lib/geo'
import { priceRangeLabel } from '../lib/format'
import { resolve } from '../lib/translate'
import { activeLangs } from '../store/store'
import { t } from '../i18n/ui'
import { FavoriteButton } from './FavoriteButton'

/**
 * Vignette d'un restaurant dans les résultats.
 *
 * La photo porte la reconnaissance, les drapeaux disent d'un coup d'œil dans
 * quelles langues la carte est lisible — c'est la promesse d'Eatnow — et le
 * numéro fait le lien avec la pastille correspondante sur la carte.
 */
export function RestaurantCard({
  r, distance, lang, dishCount, rank,
}: {
  r: Restaurant
  distance?: number
  lang: Lang
  dishCount: number
  /** Rang dans les résultats, repris sur la carte géographique. */
  rank?: number
}) {
  const langs = activeLangs(r)

  return (
    <Link to={`/r/${r.slug}`} className="resto-card" style={{ ['--h' as string]: r.hue }}>
      <div className="resto-cover">
        {r.photo
          ? <img src={r.photo} alt="" loading="lazy" />
          : <span className="resto-cover__emoji" aria-hidden>{r.emoji}</span>}

        {rank !== undefined && <span className="resto-rank">{rank}</span>}
        <FavoriteButton id={r.id} label={r.name} />
        {distance !== undefined && <span className="dist">{formatDistance(distance)}</span>}
      </div>

      <div className="resto-body">
        <div className="row gap-s" style={{ alignItems: 'flex-start' }}>
          <h3 style={{ flex: 1, minWidth: 0 }}>{r.name}</h3>
          <span className="rating"><i>★</i>{r.rating.toFixed(1)}</span>
        </div>

        <div className="resto-meta">
          <span>🍽️ {r.cuisines.map((c) => CUISINE_LABEL[c]).join(' · ')}</span>
          <span className="mono">💶 {priceRangeLabel(r.priceRange)}</span>
        </div>

        {(r.address || r.city) && (
          <div className="resto-meta">
            <span>📍 {[r.address, r.city].filter(Boolean).join(', ')}</span>
          </div>
        )}

        <p className="small muted resto-desc">{resolve(r.description, lang, r.sourceLang)}</p>

        <div className="resto-foot">
          {r.published ? (
            <span className="flag-row" title={`Carte traduite en ${langs.length} langues`}>
              {/* Quatre drapeaux tiennent sur une ligne à côté du nombre de
                  plats ; au-delà le compteur dit le reste. */}
              {langs.slice(0, 4).map((l) => (
                <span key={l} className="flag-chip">{LANG_META[l].flag}</span>
              ))}
              {langs.length > 4 && <span className="flag-chip more">+{langs.length - 4}</span>}
            </span>
          ) : (
            <span className="badge grey">Carte non traduite</span>
          )}
          <span className="spacer" />
          <span className="tiny muted">{dishCount} plats</span>
        </div>

        <span className="resto-cta">{t('card.see', lang)} →</span>
      </div>
    </Link>
  )
}
