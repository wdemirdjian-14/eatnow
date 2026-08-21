import { useCallback, useEffect, useState } from 'react'

const KEY = 'eatnow.favoris.v1'

/**
 * Favoris du client, conservés sur son appareil.
 *
 * Un convive n'a pas de compte : ses favoris n'ont donc pas de propriétaire
 * côté serveur. Le stockage local est ici le bon niveau — et il fonctionne
 * hors connexion, comme le reste de la carte.
 */
function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

/** Prévient les autres composants montés dans le même onglet. */
const CHANGED = 'eatnow:favoris'

export function useFavorites() {
  const [ids, setIds] = useState<string[]>(read)

  useEffect(() => {
    const sync = () => setIds(read())
    window.addEventListener(CHANGED, sync)
    // `storage` couvre les autres onglets du même navigateur.
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGED, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggle = useCallback((id: string) => {
    const next = read().includes(id) ? read().filter((x) => x !== id) : [...read(), id]
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* mode privé */ }
    setIds(next)
    window.dispatchEvent(new Event(CHANGED))
  }, [])

  return { ids, isFavorite: (id: string) => ids.includes(id), toggle }
}
