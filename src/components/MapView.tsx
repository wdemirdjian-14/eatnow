import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import type { Lang, Restaurant } from '../types'
import { CUISINE_LABEL } from '../types'
import { formatDistance } from '../lib/geo'
import { priceRangeLabel } from '../lib/format'
import { t } from '../i18n/ui'

export interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

/**
 * Carte des restaurants, façon plan interactif.
 *
 * Fond de plan OpenStreetMap via Leaflet : aucune clé d'API, aucun compte à
 * ouvrir, et des tuiles servies en HTTPS. Le marqueur porte l'emoji du
 * restaurant plutôt qu'une épingle générique — on identifie le type de
 * cuisine d'un coup d'œil.
 */
export function MapView({
  restaurants, center, lang, distances, onSearchArea, onLocate, locating, compact,
}: {
  restaurants: Restaurant[]
  center: { lat: number; lng: number }
  lang: Lang
  distances: Map<string, number>
  /** Relance la recherche sur la zone affichée. */
  onSearchArea: (bounds: Bounds) => void
  onLocate: () => void
  locating: boolean
  /** Bandeau réduit, posé au-dessus de la liste des résultats. */
  compact?: boolean
}) {
  const holder = useRef<HTMLDivElement | null>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const [moved, setMoved] = useState(false)
  const [selected, setSelected] = useState<Restaurant | null>(null)

  // --- création de la carte, une seule fois ---
  useEffect(() => {
    if (!holder.current || map.current) return
    const m = L.map(holder.current, {
      center: [center.lat, center.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    // Tout déplacement propose de relancer la recherche sur la zone visible.
    m.on('moveend zoomend', () => setMoved(true))
    map.current = m
    return () => { m.remove(); map.current = null }
  }, [center.lat, center.lng])

  // --- recentrage quand la position de référence change ---
  useEffect(() => {
    if (!map.current) return
    map.current.setView([center.lat, center.lng], map.current.getZoom() ?? 14)
    setMoved(false)
  }, [center.lat, center.lng])

  // Le marqueur porte le rang du restaurant dans la liste : on retrouve
  // immédiatement, sous la carte, la fiche correspondant à une pastille.
  const markerIcon = useMemo(
    () => (r: Restaurant, rank: number) =>
      L.divIcon({
        className: 'map-pin-wrap',
        html:
          `<div class="map-pin${r.published ? ' published' : ''}"><span>${rank}</span></div>`,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
      }),
    [],
  )

  // --- marqueurs, redessinés à chaque changement de résultats ---
  useEffect(() => {
    const lg = layer.current
    if (!lg) return
    lg.clearLayers()
    restaurants.forEach((r, i) => {
      L.marker([r.lat, r.lng], { icon: markerIcon(r, i + 1), title: r.name })
        .on('click', () => setSelected(r))
        .addTo(lg)
    })
    L.circleMarker([center.lat, center.lng], {
      radius: 7, color: '#fff', weight: 3, fillColor: '#C50C29', fillOpacity: 1,
    }).addTo(lg)
  }, [restaurants, center.lat, center.lng, markerIcon])

  function searchHere() {
    const m = map.current
    if (!m) return
    const b = m.getBounds()
    onSearchArea({
      north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest(),
    })
    setMoved(false)
  }

  return (
    <div className={`map-shell ${compact ? 'compact' : ''}`}>
      <div ref={holder} className="map-canvas" role="application" aria-label="Carte des restaurants" />

      <div className="map-actions">
        {moved && (
          <button className="btn sm" onClick={searchHere}>🔄 Rechercher dans cette zone</button>
        )}
        <button className="btn outline sm" onClick={onLocate} disabled={locating}>
          {locating ? '…' : `📍 ${t('home.locate', lang)}`}
        </button>
      </div>

      {selected && (
        <div className="map-card">
          <button className="map-card__close" onClick={() => setSelected(null)} aria-label="Fermer">✕</button>
          <div className="row gap-s">
            <span style={{ fontSize: '1.8rem' }} aria-hidden>{selected.emoji}</span>
            <div className="stack" style={{ flex: 1, minWidth: 0 }}>
              <b>{selected.name}</b>
              <span className="tiny muted">
                {selected.cuisines.map((c) => CUISINE_LABEL[c]).join(' · ')} ·{' '}
                <span className="mono">{priceRangeLabel(selected.priceRange)}</span>
              </span>
              <span className="tiny muted">
                ★ {selected.rating.toFixed(1)}
                {distances.has(selected.id) && ` · ${formatDistance(distances.get(selected.id)!)}`}
                {selected.published && ' · 🌍 carte traduite'}
              </span>
            </div>
          </div>
          <Link className="btn sm block" to={`/r/${selected.slug}`} style={{ marginTop: '.6rem' }}>
            {t('card.see', lang)}
          </Link>
        </div>
      )}
    </div>
  )
}
