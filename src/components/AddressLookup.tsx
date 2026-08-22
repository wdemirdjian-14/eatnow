import { useEffect, useRef, useState } from 'react'
import { api, ApiError, type GeocodeHit } from '../lib/api'

/**
 * Recherche d'adresse qui renseigne les coordonnées.
 *
 * Sans coordonnées, un restaurant est introuvable dans la recherche par
 * distance et absent de la carte : les faire saisir à la main revenait à
 * demander à un restaurateur d'aller les chercher ailleurs. La recherche part
 * dès qu'on cesse de taper, et le choix d'une proposition remplit d'un coup
 * l'adresse, le code postal, la ville et les coordonnées.
 */
export function AddressLookup({
  value, onPick, label = 'Adresse', placeholder = '12 rue de la Paix, Paris',
}: {
  value: string
  onPick: (hit: { address: string; postalCode?: string; city?: string; lat: number; lng: number }) => void
  label?: string
  placeholder?: string
}) {
  const [q, setQ] = useState(value)
  const [hits, setHits] = useState<GeocodeHit[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  /** Empêche une réponse tardive d'écraser une recherche plus récente. */
  const seq = useRef(0)

  useEffect(() => { setQ(value) }, [value])

  useEffect(() => {
    const text = q.trim()
    if (text.length < 5 || !open) { setHits([]); return }
    // Nominatim limite à une requête par seconde : on attend la fin de la frappe.
    const timer = window.setTimeout(async () => {
      const mine = ++seq.current
      setBusy(true)
      setError(null)
      try {
        const { results } = await api.geocode(text)
        if (seq.current === mine) setHits(results)
      } catch (e) {
        if (seq.current === mine) {
          setError(e instanceof ApiError ? e.message : 'Recherche d’adresse indisponible.')
          setHits([])
        }
      } finally {
        if (seq.current === mine) setBusy(false)
      }
    }, 600)
    return () => window.clearTimeout(timer)
  }, [q, open])

  /** Première ligne de l'adresse complète renvoyée par le service. */
  const streetOf = (h: GeocodeHit) => h.label.split(',').slice(0, 2).join(',').trim()

  return (
    <div className="addr">
      <label className="field">
        <span>{label}</span>
        <input
          className="input"
          value={q}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
      </label>

      {open && (busy || hits.length > 0 || error) && (
        <div className="addr__panel">
          {busy && <p className="tiny muted addr__msg">Recherche de l’adresse…</p>}
          {error && <p className="tiny addr__msg" style={{ color: 'var(--coral-dark)' }}>⚠️ {error}</p>}
          {hits.map((h, i) => (
            <button
              key={`${h.lat},${h.lng},${i}`}
              type="button"
              className="addr__hit"
              onClick={() => {
                onPick({
                  address: streetOf(h),
                  postalCode: h.postalCode,
                  city: h.city,
                  lat: h.lat,
                  lng: h.lng,
                })
                setQ(streetOf(h))
                setOpen(false)
                setHits([])
              }}
            >
              <span className="addr__hit-label">{h.label}</span>
              <span className="tiny muted mono">{h.lat.toFixed(5)}, {h.lng.toFixed(5)}</span>
            </button>
          ))}
          {!busy && !error && hits.length === 0 && (
            <p className="tiny muted addr__msg">Aucune adresse trouvée.</p>
          )}
        </div>
      )}
    </div>
  )
}
