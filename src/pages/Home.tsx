import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { CUISINES, CUISINE_LABEL, type Cuisine } from '../types'
import { FALLBACK_POSITIONS, distanceKm, locate, type Position } from '../lib/geo'
import { priceRangeLabel } from '../lib/format'
import { t } from '../i18n/ui'
import { RestaurantCard } from '../components/RestaurantCard'
import { Logo } from '../components/Logo'
import { InstallPrompt } from '../components/InstallPrompt'
import { MapView, type Bounds } from '../components/MapView'
import { QrScanner } from '../components/QrScanner'

type Sort = 'distance' | 'rating' | 'price'

export function Home({ initialView = 'liste' }: { initialView?: 'liste' | 'carte' } = {}) {
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
  const [view, setView] = useState<'liste' | 'carte'>(initialView)
  /** Les filtres restent repliés par défaut : la carte et les résultats
      doivent apparaître sans avoir à faire défiler. */
  const [showFilters, setShowFilters] = useState(false)
  /** Zone géographique imposée par la carte ; remplace le filtre de distance. */
  const [area, setArea] = useState<Bounds | null>(null)
  /** Lecteur de QR code plein écran. */
  const [scanning, setScanning] = useState(false)

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
        if (area) {
          if (r.lat > area.north || r.lat < area.south) return false
          if (r.lng > area.east || r.lng < area.west) return false
        } else if (d > radius) {
          return false
        }
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
  }, [state.restaurants, q, pos, radius, translatedOnly, cuisines, prices, sort, area])

  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  async function askLocation() {
    setLocating(true)
    setGeoError(null)
    try {
      setPos(await locate())
      setArea(null)
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
          <span className="badge sun hide-mobile">🌍 14 langues · allergènes inclus</span>
          <h1 className="hide-mobile" style={{ marginTop: '.8rem' }}>{t('home.tagline', lang)}</h1>
          <p className="lead hide-mobile">{t('home.sub', lang)}</p>
          {/* Sur mobile l'application va droit au but : une ligne, puis la
              recherche et la carte. Le discours reste sur grand écran. */}
          <p className="hero-mini">{t('home.tagline', lang)}</p>

          <div className="searchbar">
            {/* Le QR code est le chemin le plus court vers une carte : posé
                sur la table, il évite toute recherche. */}
            <button
              className="scan-btn" onClick={() => setScanning(true)}
              aria-label={t('home.scan', lang)} title={t('home.scan', lang)}
            >
              <QrIcon />
            </button>
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

          <div className="hero-stats hide-mobile">
            <div><b>{state.restaurants.length}</b><span>restaurants référencés</span></div>
            <div><b>{state.restaurants.filter((r) => r.published).length}</b><span>cartes traduites</span></div>
            <div><b>{state.dishes.length}</b><span>plats avec allergènes</span></div>
          </div>
        </div>
      </section>

      <main className="wrap stack gap-l" style={{ paddingTop: '1.6rem' }}>

        {/* Deux réglages toujours visibles, sans ouvrir les filtres. */}
        <div className="quick-controls">
          <label className="quick-control">
            <span>{t('home.sort', lang)}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="distance">{t('home.sort.distance', lang)}</option>
              <option value="rating">{t('home.sort.rating', lang)}</option>
              <option value="price">{t('home.sort.price', lang)}</option>
            </select>
          </label>
          <label className="quick-control">
            <span>{t('home.radius', lang)}</span>
            <select
              value={area ? 'zone' : String(radius)}
              onChange={(e) => {
                if (e.target.value === 'zone') return
                setArea(null)
                setRadius(Number(e.target.value))
              }}
            >
              {area && <option value="zone">Zone de la carte</option>}
              {[1, 2, 5, 10, 20, 30].map((km) => <option key={km} value={km}>{km} km</option>)}
            </select>
          </label>
        </div>


        <div className="row gap-s wrap-flex">
          <h2>{results.length} {t('home.results', lang)}</h2>
          <span className="muted small">
            {area
              ? '· dans la zone affichée sur la carte'
              : `· dans un rayon de ${radius} km autour de ${pos.label}`}
          </span>
          {area && (
            <button className="btn ghost sm" onClick={() => setArea(null)}>
              ✕ revenir au rayon
            </button>
          )}
          <span className="spacer" />
          <button
            className="chip sm" aria-pressed={showFilters} aria-expanded={showFilters}
            onClick={() => setShowFilters((v) => !v)}
          >
            ⚙️ {t('home.filters', lang)}{activeFilters > 0 && ` (${activeFilters})`}
          </button>
          <div className="view-toggle" role="group" aria-label="Affichage">
            <button className="chip sm" aria-pressed={view === 'liste'} onClick={() => setView('liste')}>
              ☰ Liste
            </button>
            <button className="chip sm" aria-pressed={view === 'carte'} onClick={() => setView('carte')}>
              🗺️ Carte
            </button>
          </div>
        </div>

        {/* La carte précède la liste : on situe les restaurants avant de les
            lire, et les pastilles numérotées renvoient aux vignettes. */}
        <MapView
          restaurants={results.map((x) => x.r)}
          center={{ lat: pos.lat, lng: pos.lng }}
          lang={lang}
          distances={new Map(results.map((x) => [x.r.id, x.d]))}
          onSearchArea={setArea}
          onLocate={() => void askLocation()}
          locating={locating}
          compact={view === 'liste'}
        />

        {view === 'liste' && (
          results.length === 0 ? (
            <p className="empty">{t('home.none', lang)}</p>
          ) : (
            <div className="grid-restos">
              {results.map(({ r, d }, i) => (
                <RestaurantCard
                  key={r.id} r={r} distance={d} lang={lang} rank={i + 1}
                  dishCount={dishCount.get(r.id) ?? 0}
                />
              ))}
            </div>
          )
        )}

        {view === 'carte' && results.length === 0 && (
          <p className="notice warn">{t('home.none', lang)}</p>
        )}

        {/* Invitation à installer : utile, mais elle ne doit pas repousser
            la carte et les résultats sous la pliure. */}
        <InstallPrompt />

        {showFilters && (
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
        )}

      </main>

      {scanning && <QrScanner onClose={() => setScanning(false)} />}
    </>
  )
}

/** Pictogramme QR code, dessiné pour rester net à toutes les tailles. */
function QrIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <g stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </g>
      <path d="M14 14h3v3h-3zM18 18h3v3h-3z" fill="currentColor" />
    </svg>
  )
}
