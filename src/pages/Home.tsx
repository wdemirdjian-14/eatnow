import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { CUISINES, CUISINE_LABEL, type Cuisine } from '../types'
import { FALLBACK_POSITIONS, distanceKm, locate, type Position } from '../lib/geo'
import { priceRangeLabel } from '../lib/format'
import { t } from '../i18n/ui'
import { RestaurantCard } from '../components/RestaurantCard'
import { Logo } from '../components/Logo'
import { InstallPrompt } from '../components/InstallPrompt'

type Sort = 'distance' | 'rating' | 'price'

export function Home() {
  const { state, lang } = useStore()

  const [q, setQ] = useState('')
  const [pos, setPos] = useState<Position>(FALLBACK_POSITIONS[0])
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const [prices, setPrices] = useState<number[]>([])
  const [translatedOnly, setTranslatedOnly] = useState(false)
  const [radius, setRadius] = useState(5)
  const [sort, setSort] = useState<Sort>('distance')

  const dishCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of state.dishes) m.set(d.restaurantId, (m.get(d.restaurantId) ?? 0) + 1)
    return m
  }, [state.dishes])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return state.restaurants
      .map((r) => ({ r, d: distanceKm(pos.lat, pos.lng, r.lat, r.lng) }))
      .filter(({ r, d }) => {
        if (d > radius) return false
        if (translatedOnly && !r.published) return false
        if (cuisines.length && !r.cuisines.some((c) => cuisines.includes(c))) return false
        if (prices.length && !prices.includes(r.priceRange)) return false
        if (needle) {
          const hay = [
            r.name, r.city, r.address, r.postalCode,
            ...r.cuisines.map((c) => CUISINE_LABEL[c]),
            r.description.source,
          ].join(' ').toLowerCase()
          if (!hay.includes(needle)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sort === 'rating') return b.r.rating - a.r.rating
        if (sort === 'price') return a.r.priceRange - b.r.priceRange || a.d - b.d
        return a.d - b.d
      })
  }, [state.restaurants, q, pos, radius, translatedOnly, cuisines, prices, sort])

  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  async function askLocation() {
    setLocating(true)
    setGeoError(null)
    try {
      setPos(await locate())
    } catch (e) {
      setGeoError(e instanceof Error ? e.message : 'Position indisponible.')
    } finally {
      setLocating(false)
    }
  }

  const activeFilters = cuisines.length + prices.length + (translatedOnly ? 1 : 0)

  return (
    <>
      <section className="hero">
        <Logo size={420} id="hero" className="hero-logo" />
        <div className="wrap inner">
          <span className="badge sun">🌍 13 langues · allergènes inclus</span>
          <h1 style={{ marginTop: '.8rem' }}>{t('home.tagline', lang)}</h1>
          <p className="lead">{t('home.sub', lang)}</p>

          <div className="searchbar">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('home.search', lang)}
              aria-label={t('home.search', lang)}
            />
            <button className="btn sun" onClick={askLocation} disabled={locating}>
              {locating ? t('home.locating', lang) : `📍 ${t('home.locate', lang)}`}
            </button>
          </div>

          <div className="hero-stats">
            <div><b>{state.restaurants.length}</b><span>restaurants référencés</span></div>
            <div><b>{state.restaurants.filter((r) => r.published).length}</b><span>cartes traduites</span></div>
            <div><b>{state.dishes.length}</b><span>plats avec allergènes</span></div>
          </div>
        </div>
      </section>

      <main className="wrap stack gap-l" style={{ paddingTop: '1.6rem' }}>
        <InstallPrompt />

        <section className="card filters" aria-label={t('home.filters', lang)}>
          <div className="line">
            <span className="lbl">{t('home.position', lang)}</span>
            <select
              className="select" style={{ width: 'auto' }}
              value={FALLBACK_POSITIONS.some((p) => p.label === pos.label) ? pos.label : '__me'}
              onChange={(e) => {
                const found = FALLBACK_POSITIONS.find((p) => p.label === e.target.value)
                if (found) setPos(found)
              }}
            >
              {!FALLBACK_POSITIONS.some((p) => p.label === pos.label) && (
                <option value="__me">📍 Ma position</option>
              )}
              {FALLBACK_POSITIONS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
            </select>
            <label className="row gap-s small" style={{ marginLeft: 'auto' }}>
              {t('home.radius', lang)}
              <input
                type="range" min={1} max={30} step={1} value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
              <b className="mono">{radius} km</b>
            </label>
          </div>
          {geoError && <p className="notice warn">⚠️ {geoError} Choisissez un point de départ ci-dessus.</p>}

          <div className="line">
            <span className="lbl">{t('home.cuisine', lang)}</span>
            {CUISINES.map((c) => (
              <button
                key={c} className="chip sm" aria-pressed={cuisines.includes(c)}
                onClick={() => toggle(cuisines, c, setCuisines)}
              >
                {CUISINE_LABEL[c]}
              </button>
            ))}
          </div>

          <div className="line">
            <span className="lbl">{t('home.price', lang)}</span>
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p} className="chip sm mono" aria-pressed={prices.includes(p)}
                onClick={() => toggle(prices, p, setPrices)}
              >
                {priceRangeLabel(p)}
              </button>
            ))}
            <span className="spacer" />
            <label className="row gap-s small">
              {t('home.sort', lang)}
              <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="distance">{t('home.sort.distance', lang)}</option>
                <option value="rating">{t('home.sort.rating', lang)}</option>
                <option value="price">{t('home.sort.price', lang)}</option>
              </select>
            </label>
          </div>

          <div className="highlight-filter row gap-s wrap-flex">
            <label className="switch">
              <input
                type="checkbox" checked={translatedOnly}
                onChange={(e) => setTranslatedOnly(e.target.checked)}
              />
              <span className="track" />
              <b>{t('home.translatedOnly', lang)}</b>
            </label>
            <span className="small muted">
              Seuls les restaurants inscrits à Eatnow publient leur carte traduite et leurs allergènes.
            </span>
            {activeFilters > 0 && (
              <button
                className="btn ghost sm" style={{ marginLeft: 'auto' }}
                onClick={() => { setCuisines([]); setPrices([]); setTranslatedOnly(false) }}
              >
                {t('home.reset', lang)} ({activeFilters})
              </button>
            )}
          </div>
        </section>

        <div className="row gap-s">
          <h2>{results.length} {t('home.results', lang)}</h2>
          <span className="muted small">· dans un rayon de {radius} km autour de {pos.label}</span>
        </div>

        {results.length === 0 ? (
          <p className="empty">{t('home.none', lang)}</p>
        ) : (
          <div className="grid-restos">
            {results.map(({ r, d }) => (
              <RestaurantCard key={r.id} r={r} distance={d} lang={lang} dishCount={dishCount.get(r.id) ?? 0} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
