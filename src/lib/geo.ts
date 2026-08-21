/** Distance à vol d'oiseau entre deux points (formule de haversine), en km. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const la1 = (aLat * Math.PI) / 180
  const la2 = (bLat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(km < 10 ? 1 : 0)} km`
}

export interface Position {
  lat: number
  lng: number
  label: string
}

/** Positions de repli quand la géoloc est refusée ou indisponible. */
export const FALLBACK_POSITIONS: Position[] = [
  { lat: 48.8566, lng: 2.3522, label: 'Paris — Châtelet' },
  { lat: 48.8738, lng: 2.295, label: 'Paris — Étoile' },
  { lat: 48.8462, lng: 2.3752, label: 'Paris — Bastille' },
  { lat: 43.2965, lng: 5.3698, label: 'Marseille — Vieux-Port' },
  { lat: 45.764, lng: 4.8357, label: 'Lyon — Bellecour' },
]

export function locate(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Géolocalisation non disponible sur cet appareil.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'Ma position' }),
      (e) => reject(new Error(e.code === 1 ? 'Autorisation refusée.' : 'Position introuvable.')),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    )
  })
}
