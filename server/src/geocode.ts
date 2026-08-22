import { config } from './config.js'

/**
 * Géocodage d'adresses via Nominatim (OpenStreetMap).
 *
 * L'appel passe par le serveur, jamais par le navigateur : la politique
 * d'usage de Nominatim exige un `User-Agent` identifiant l'application, et
 * relayer ici évite d'ouvrir la CSP du client à un domaine tiers. Le cache et
 * l'espacement des requêtes tiennent la cadence maximale d'une par seconde
 * que le service impose.
 */

export interface GeocodeHit {
  label: string
  lat: number
  lng: number
  postalCode?: string
  city?: string
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const CACHE_MAX = 500
const CACHE_TTL_MS = 24 * 3600 * 1000
/** Cadence imposée par Nominatim : une requête par seconde au maximum. */
const MIN_INTERVAL_MS = 1100

const cache = new Map<string, { at: number; hits: GeocodeHit[] }>()
let lastCall = 0

/** Attend le temps nécessaire pour ne pas dépasser la cadence autorisée. */
async function throttle(): Promise<void> {
  const wait = lastCall + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCall = Date.now()
}

interface NominatimRow {
  lat: string
  lon: string
  display_name: string
  address?: Record<string, string>
}

export async function geocode(query: string, limit = 5): Promise<GeocodeHit[]> {
  const key = query.trim().toLowerCase()
  if (!key) return []

  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.hits

  await throttle()

  const url = new URL(ENDPOINT)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url, {
    headers: {
      // Exigé par la politique d'usage : identifier l'application et un
      // contact. Une requête anonyme se fait refuser.
      'User-Agent': `Eatnow/${config.version} (${config.smtp.appUrl})`,
      'Accept-Language': 'fr',
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Nominatim a répondu ${res.status}.`)

  const rows = (await res.json()) as NominatimRow[]
  const hits: GeocodeHit[] = rows.map((r) => {
    const a = r.address ?? {}
    return {
      label: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
      postalCode: a.postcode,
      // Nominatim nomme la commune différemment selon sa taille.
      city: a.city ?? a.town ?? a.village ?? a.municipality,
    }
  })

  // Purge la plus ancienne entrée : le cache sert le confort de saisie, pas
  // un référentiel, et ne doit pas grossir sans fin.
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
  cache.set(key, { at: Date.now(), hits })
  return hits
}
