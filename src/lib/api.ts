import type { AppState, Lang, Restaurant } from '../types'

/**
 * Client de l'API Eatnow.
 *
 * L'authentification repose sur un cookie de session `httpOnly` : aucun jeton
 * ne transite par JavaScript, donc rien à voler en cas de faille XSS. Le
 * cookie étant `SameSite=Strict`, un site tiers ne peut pas déclencher de
 * requête authentifiée ; l'en-tête `X-Eatnow-Client` ajoute une seconde
 * barrière qu'un formulaire HTML classique ne peut pas franchir.
 */

/** Base de l'API. Vide = même origine, ce qui est le cas en production. */
const BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? 'GET'
  const headers = new Headers(init.headers)
  if (method !== 'GET') {
    headers.set('Content-Type', 'application/json')
    headers.set('X-Eatnow-Client', '1')
  }

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' })
  } catch {
    // Coupure réseau : l'appelant décide s'il peut se rabattre sur le cache.
    throw new ApiError(0, 'Serveur injoignable.')
  }

  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error ?? `Erreur ${res.status}.`
    throw new ApiError(res.status, message)
  }
  return body as T
}

export interface SessionUser {
  id: string
  login: string
  name: string
  role: 'admin' | 'owner'
  restaurantId: string | null
  impersonating: boolean
  realUser: { id: string; name: string; login: string } | null
}

/** Annuaire public : tout ce qu'il faut pour la recherche et les cartes. */
export type PublicState = Pick<AppState, 'restaurants' | 'categories' | 'dishes' | 'menus'>

/** Complément réservé à la session : comptes et facturation. */
export type SessionState = Pick<AppState, 'owners' | 'purchases'>

export interface MenuPayload {
  categories: AppState['categories']
  dishes: AppState['dishes']
  menus: AppState['menus']
}

/** Création d'un restaurant et de son compte, par un administrateur. */
export interface NewRestaurant {
  name: string
  city: string
  address: string
  postalCode: string
  lat?: number
  lng?: number
  phone: string
  website?: string
  cuisines: string[]
  priceRange: number
  emoji: string
  hours: string
  plan: string
  ownerName: string
  ownerLogin: string
  ownerPassword: string
}

export const api = {
  createRestaurant: (payload: NewRestaurant) =>
    request<{ restaurant: Restaurant }>('/api/admin/restaurants', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (login: string, password: string) =>
    request<{ user: SessionUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }),

  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<{ user: SessionUser | null }>('/api/auth/me'),

  impersonate: (ownerId: string) =>
    request<{ user: SessionUser }>('/api/auth/impersonate', {
      method: 'POST',
      body: JSON.stringify({ ownerId }),
    }),

  stopImpersonating: () =>
    request<{ user: SessionUser }>('/api/auth/stop-impersonating', { method: 'POST' }),

  publicState: () => request<PublicState>('/api/public/state'),

  sessionState: () => request<SessionState>('/api/state'),

  updateRestaurant: (id: string, patch: Partial<Restaurant>) =>
    request<{ restaurant: Restaurant }>(`/api/restaurants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  /** Remplace la carte entière : atomique côté serveur. */
  replaceMenu: (id: string, payload: MenuPayload) =>
    request<{ ok: true }>(`/api/restaurants/${id}/menu`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  /** Le tarif est décidé par le serveur ; le client ne l'envoie jamais. */
  purchaseLang: (id: string, lang: Lang) =>
    request<{ alreadyOwned: boolean; amount: number; restaurant: Restaurant }>(
      `/api/restaurants/${id}/languages`,
      { method: 'POST', body: JSON.stringify({ lang }) },
    ),

  setRestaurantPhoto: (id: string, dataUrl: string | null) =>
    request<{ photo: string | null }>(`/api/restaurants/${id}/photo`, {
      method: 'POST',
      body: JSON.stringify({ dataUrl }),
    }),

  setDishPhoto: (dishId: string, dataUrl: string | null) =>
    request<{ photo: string | null }>(`/api/dishes/${dishId}/photo`, {
      method: 'POST',
      body: JSON.stringify({ dataUrl }),
    }),
}
