import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  INCLUDED_LANGS,
  type AppState, type Category, type Dish, type DishOptionGroup, type FixedMenu,
  type I18nField, type Lang, type PurchaseLine, type Restaurant, type SelectionLine,
  type Session,
} from '../types'
import { buildSeedState, findAdmin } from '../data/seed'
import { autoTranslate, field } from '../lib/translate'
import { uid, slugify } from '../lib/format'

const STATE_KEY = 'eatnow.state.v1'
const SESSION_KEY = 'eatnow.session.v1'
const LANG_KEY = 'eatnow.lang.v1'
const SEL_KEY = 'eatnow.selection.v1'

/** Prix mensuel d'une langue supplémentaire, par plan. */
export const LANG_PRICE: Record<Restaurant['plan'], number> = { essai: 12, starter: 12, pro: 9 }

/** Langues publiées pour un restaurant : incluses + achetées. */
export function activeLangs(r: Restaurant): Lang[] {
  return [...new Set([r.sourceLang, ...INCLUDED_LANGS, ...r.purchasedLangs])] as Lang[]
}

/** Applique la traduction automatique sur un champ, sans écraser les forçages. */
function withAuto(f: I18nField, sourceLang: Lang, langs: Lang[]): I18nField {
  const auto: I18nField['auto'] = {}
  for (const l of langs) {
    if (l === sourceLang) continue
    auto[l] = autoTranslate(f.source, sourceLang, l).text
  }
  return { ...f, auto }
}

/**
 * Cible d'un forçage manuel de traduction. Pour les options, `id` porte
 * l'identifiant du groupe ou du choix, qui est unique dans toute la base.
 */
export type ManualTarget =
  | 'restaurant-desc' | 'category'
  | 'dish-name' | 'dish-desc'
  | 'menu-name' | 'menu-desc'
  | 'option-group' | 'option-choice'

/** Applique une transformation de champ à tous les textes d'un plat, options comprises. */
function mapDishFields(d: Dish, go: (f: I18nField) => I18nField): Dish {
  return {
    ...d,
    name: go(d.name),
    description: go(d.description),
    options: d.options.map((g) => ({
      ...g,
      name: go(g.name),
      choices: g.choices.map((c) => ({ ...c, label: go(c.label) })),
    })),
  }
}

interface Store {
  state: AppState
  session: Session
  /** Langue d'affichage du site public. */
  lang: Lang
  setLang: (l: Lang) => void

  loginOwner: (email: string, password: string) => string | null
  loginAdmin: (login: string, password: string) => string | null
  logout: () => void

  currentOwner: () => { owner: AppState['owners'][number]; restaurant: Restaurant } | null
  /** Vrai quand un administrateur agit au nom d'un restaurateur. */
  isImpersonating: boolean
  impersonate: (ownerId: string) => void
  stopImpersonating: () => void

  updateRestaurant: (id: string, patch: Partial<Restaurant>) => void
  setRestaurantField: (id: string, key: 'description', source: string) => void

  addCategory: (restaurantId: string, name: string) => void
  updateCategory: (id: string, patch: Partial<Category> & { source?: string }) => void
  removeCategory: (id: string) => void
  moveCategory: (id: string, dir: -1 | 1) => void

  addDish: (restaurantId: string, categoryId: string) => string
  updateDish: (id: string, patch: Partial<Dish> & { nameSource?: string; descSource?: string }) => void
  removeDish: (id: string) => void

  setDishPhoto: (id: string, photo: string | undefined) => void
  addOptionGroup: (dishId: string, name: string) => void
  updateOptionGroup: (dishId: string, groupId: string, patch: { source?: string; required?: boolean; multiple?: boolean }) => void
  removeOptionGroup: (dishId: string, groupId: string) => void
  addOptionChoice: (dishId: string, groupId: string, label: string) => void
  updateOptionChoice: (dishId: string, groupId: string, choiceId: string, patch: { source?: string; priceDelta?: number }) => void
  removeOptionChoice: (dishId: string, groupId: string, choiceId: string) => void

  addMenu: (restaurantId: string) => string
  updateMenu: (id: string, patch: Partial<FixedMenu> & { nameSource?: string; descSource?: string }) => void
  removeMenu: (id: string) => void

  /** Force (ou efface) une traduction manuelle sur une entité. */
  setManual: (entity: ManualTarget, id: string, lang: Lang, value: string) => void
  /** Relance la traduction automatique sur toute la carte d'un restaurant. */
  retranslate: (restaurantId: string) => void
  purchaseLang: (restaurantId: string, lang: Lang) => void

  /** Sélection du client, en cours de constitution sur une carte. */
  selection: SelectionLine[]
  addToSelection: (dishId: string, restaurantId: string, choiceIds: string[], qty?: number) => void
  setSelectionQty: (lineId: string, qty: number) => void
  removeFromSelection: (lineId: string) => void
  clearSelection: () => void

  resetDemo: () => void
}

const Ctx = createContext<Store | null>(null)

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Prépare l'état de démo : les traductions auto sont calculées une fois au seed. */
function seedWithTranslations(): AppState {
  const s = buildSeedState()
  return translateAll(s)
}

function translateAll(s: AppState): AppState {
  const langsOf = new Map(s.restaurants.map((r) => [r.id, activeLangs(r)] as const))
  const srcOf = new Map(s.restaurants.map((r) => [r.id, r.sourceLang] as const))
  const go = (rid: string, f: I18nField) => withAuto(f, srcOf.get(rid) ?? 'fr', langsOf.get(rid) ?? [])
  return {
    ...s,
    restaurants: s.restaurants.map((r) => ({ ...r, description: go(r.id, r.description) })),
    categories: s.categories.map((c) => ({ ...c, name: go(c.restaurantId, c.name) })),
    dishes: s.dishes.map((d) => mapDishFields(d, (f) => go(d.restaurantId, f))),
    menus: s.menus.map((m) => ({
      ...m, name: go(m.restaurantId, m.name), description: go(m.restaurantId, m.description),
    })),
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => load(STATE_KEY, null as AppState | null) ?? seedWithTranslations())
  const [session, setSession] = useState<Session>(() => load<Session>(SESSION_KEY, { role: 'guest' }))
  const [lang, setLangState] = useState<Lang>(() => load<Lang>(LANG_KEY, 'fr'))
  const [selection, setSelection] = useState<SelectionLine[]>(() => load<SelectionLine[]>(SEL_KEY, []))

  useEffect(() => {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)) } catch { /* quota */ }
  }, [state])
  useEffect(() => {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch { /* quota */ }
  }, [session])
  useEffect(() => {
    try { localStorage.setItem(SEL_KEY, JSON.stringify(selection)) } catch { /* quota */ }
  }, [selection])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(LANG_KEY, JSON.stringify(l)) } catch { /* quota */ }
  }, [])

  /** Retraduit un champ dans le contexte d'un restaurant. */
  const retranslateField = useCallback(
    (s: AppState, restaurantId: string, f: I18nField): I18nField => {
      const r = s.restaurants.find((x) => x.id === restaurantId)
      if (!r) return f
      return withAuto(f, r.sourceLang, activeLangs(r))
    },
    [],
  )

  const api = useMemo<Store>(() => {
    const patchState = (fn: (s: AppState) => AppState) => setState((s) => fn(s))

    return {
      state,
      session,
      lang,
      setLang,

      loginOwner(email, password) {
        const o = state.owners.find(
          (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password,
        )
        if (!o) return 'Identifiants incorrects. Essayez le compte de démonstration.'
        setSession({ role: 'owner', ownerId: o.id })
        return null
      },

      loginAdmin(login, password) {
        const admin = findAdmin(login, password)
        if (!admin) return 'Identifiants administrateur incorrects.'
        setSession({ role: 'admin', login: admin.login })
        return null
      },

      logout() { setSession({ role: 'guest' }) },

      currentOwner() {
        // Un restaurateur voit son espace ; un admin voit celui qu'il a endossé.
        const ownerId =
          session.role === 'owner' ? session.ownerId
          : session.role === 'admin' ? session.impersonating
          : undefined
        if (!ownerId) return null
        const owner = state.owners.find((o) => o.id === ownerId)
        if (!owner) return null
        const restaurant = state.restaurants.find((r) => r.id === owner.restaurantId)
        if (!restaurant) return null
        return { owner, restaurant }
      },

      isImpersonating: session.role === 'admin' && !!session.impersonating,

      impersonate(ownerId) {
        setSession((cur) => (cur.role === 'admin' ? { ...cur, impersonating: ownerId } : cur))
      },

      stopImpersonating() {
        setSession((cur) => (cur.role === 'admin' ? { role: 'admin', login: cur.login } : cur))
      },

      updateRestaurant(id, patch) {
        patchState((s) => ({
          ...s,
          restaurants: s.restaurants.map((r) =>
            r.id === id ? { ...r, ...patch, slug: patch.name ? slugify(patch.name) : r.slug } : r,
          ),
        }))
      },

      setRestaurantField(id, _key, source) {
        patchState((s) => ({
          ...s,
          restaurants: s.restaurants.map((r) =>
            r.id === id
              ? { ...r, description: retranslateField(s, id, { ...r.description, source }) }
              : r,
          ),
        }))
      },

      addCategory(restaurantId, name) {
        patchState((s) => ({
          ...s,
          categories: [
            ...s.categories,
            {
              id: uid('cat'), restaurantId,
              name: retranslateField(s, restaurantId, field(name)),
              order: s.categories.filter((c) => c.restaurantId === restaurantId).length,
            },
          ],
        }))
      },

      updateCategory(id, patch) {
        patchState((s) => ({
          ...s,
          categories: s.categories.map((c) => {
            if (c.id !== id) return c
            const name = patch.source !== undefined
              ? retranslateField(s, c.restaurantId, { ...c.name, source: patch.source })
              : (patch.name ?? c.name)
            return { ...c, ...patch, name }
          }),
        }))
      },

      removeCategory(id) {
        patchState((s) => ({
          ...s,
          categories: s.categories.filter((c) => c.id !== id),
          dishes: s.dishes.filter((d) => d.categoryId !== id),
        }))
      },

      moveCategory(id, dir) {
        patchState((s) => {
          const cat = s.categories.find((c) => c.id === id)
          if (!cat) return s
          const siblings = s.categories
            .filter((c) => c.restaurantId === cat.restaurantId)
            .sort((a, b) => a.order - b.order)
          const i = siblings.findIndex((c) => c.id === id)
          const j = i + dir
          if (j < 0 || j >= siblings.length) return s
          const swapped = siblings.map((c, k) =>
            k === i ? { ...c, order: j } : k === j ? { ...c, order: i } : c,
          )
          const byId = new Map(swapped.map((c) => [c.id, c] as const))
          return { ...s, categories: s.categories.map((c) => byId.get(c.id) ?? c) }
        })
      },

      addDish(restaurantId, categoryId) {
        const id = uid('dish')
        patchState((s) => ({
          ...s,
          dishes: [
            ...s.dishes,
            {
              id, restaurantId, categoryId,
              name: field('Nouveau plat'), description: field(''),
              price: 0, allergens: [], tags: [], available: true, dishOfDay: false, options: [],
              order: s.dishes.filter((d) => d.categoryId === categoryId).length,
            },
          ],
        }))
        return id
      },

      updateDish(id, patch) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) => {
            if (d.id !== id) return d
            const next: Dish = { ...d, ...patch }
            if (patch.nameSource !== undefined) {
              next.name = retranslateField(s, d.restaurantId, { ...d.name, source: patch.nameSource })
            }
            if (patch.descSource !== undefined) {
              next.description = retranslateField(s, d.restaurantId, {
                ...d.description, source: patch.descSource,
              })
            }
            delete (next as Partial<Dish> & { nameSource?: string }).nameSource
            delete (next as Partial<Dish> & { descSource?: string }).descSource
            return next
          }),
        }))
      },

      setDishPhoto(id, photo) {
        patchState((s) => ({ ...s, dishes: s.dishes.map((d) => (d.id === id ? { ...d, photo } : d)) }))
      },

      addOptionGroup(dishId, name) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) => {
            if (d.id !== dishId) return d
            const group: DishOptionGroup = {
              id: uid('grp'),
              name: retranslateField(s, d.restaurantId, field(name)),
              required: false, multiple: false, choices: [],
            }
            return { ...d, options: [...d.options, group] }
          }),
        }))
      },

      updateOptionGroup(dishId, groupId, patch) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) => {
            if (d.id !== dishId) return d
            return {
              ...d,
              options: d.options.map((g) => {
                if (g.id !== groupId) return g
                const name = patch.source !== undefined
                  ? retranslateField(s, d.restaurantId, { ...g.name, source: patch.source })
                  : g.name
                return {
                  ...g, name,
                  required: patch.required ?? g.required,
                  multiple: patch.multiple ?? g.multiple,
                }
              }),
            }
          }),
        }))
      },

      removeOptionGroup(dishId, groupId) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) =>
            d.id === dishId ? { ...d, options: d.options.filter((g) => g.id !== groupId) } : d,
          ),
        }))
      },

      addOptionChoice(dishId, groupId, label) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) => {
            if (d.id !== dishId) return d
            return {
              ...d,
              options: d.options.map((g) =>
                g.id === groupId
                  ? {
                      ...g,
                      choices: [...g.choices, {
                        id: uid('cho'),
                        label: retranslateField(s, d.restaurantId, field(label)),
                        priceDelta: 0,
                      }],
                    }
                  : g,
              ),
            }
          }),
        }))
      },

      updateOptionChoice(dishId, groupId, choiceId, patch) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) => {
            if (d.id !== dishId) return d
            return {
              ...d,
              options: d.options.map((g) => {
                if (g.id !== groupId) return g
                return {
                  ...g,
                  choices: g.choices.map((c) => {
                    if (c.id !== choiceId) return c
                    const label = patch.source !== undefined
                      ? retranslateField(s, d.restaurantId, { ...c.label, source: patch.source })
                      : c.label
                    return { ...c, label, priceDelta: patch.priceDelta ?? c.priceDelta }
                  }),
                }
              }),
            }
          }),
        }))
      },

      removeOptionChoice(dishId, groupId, choiceId) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) =>
            d.id === dishId
              ? {
                  ...d,
                  options: d.options.map((g) =>
                    g.id === groupId ? { ...g, choices: g.choices.filter((c) => c.id !== choiceId) } : g,
                  ),
                }
              : d,
          ),
        }))
      },

      removeDish(id) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.filter((d) => d.id !== id),
          menus: s.menus.map((m) => ({ ...m, dishIds: m.dishIds.filter((x) => x !== id) })),
        }))
      },

      addMenu(restaurantId) {
        const id = uid('menu')
        patchState((s) => ({
          ...s,
          menus: [
            ...s.menus,
            {
              id, restaurantId, name: field('Nouvelle formule'), description: field(''),
              price: 0, dishIds: [],
              order: s.menus.filter((m) => m.restaurantId === restaurantId).length,
            },
          ],
        }))
        return id
      },

      updateMenu(id, patch) {
        patchState((s) => ({
          ...s,
          menus: s.menus.map((m) => {
            if (m.id !== id) return m
            const next: FixedMenu = { ...m, ...patch }
            if (patch.nameSource !== undefined) {
              next.name = retranslateField(s, m.restaurantId, { ...m.name, source: patch.nameSource })
            }
            if (patch.descSource !== undefined) {
              next.description = retranslateField(s, m.restaurantId, {
                ...m.description, source: patch.descSource,
              })
            }
            delete (next as Partial<FixedMenu> & { nameSource?: string }).nameSource
            delete (next as Partial<FixedMenu> & { descSource?: string }).descSource
            return next
          }),
        }))
      },

      removeMenu(id) {
        patchState((s) => ({ ...s, menus: s.menus.filter((m) => m.id !== id) }))
      },

      setManual(entity, id, lang: Lang, value) {
        const apply = (f: I18nField): I18nField => {
          const manual = { ...f.manual }
          if (value.trim()) manual[lang] = value
          else delete manual[lang]
          return { ...f, manual }
        }
        patchState((s) => {
          switch (entity) {
            case 'restaurant-desc':
              return { ...s, restaurants: s.restaurants.map((r) => (r.id === id ? { ...r, description: apply(r.description) } : r)) }
            case 'category':
              return { ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, name: apply(c.name) } : c)) }
            case 'dish-name':
              return { ...s, dishes: s.dishes.map((d) => (d.id === id ? { ...d, name: apply(d.name) } : d)) }
            case 'dish-desc':
              return { ...s, dishes: s.dishes.map((d) => (d.id === id ? { ...d, description: apply(d.description) } : d)) }
            case 'menu-name':
              return { ...s, menus: s.menus.map((m) => (m.id === id ? { ...m, name: apply(m.name) } : m)) }
            case 'menu-desc':
              return { ...s, menus: s.menus.map((m) => (m.id === id ? { ...m, description: apply(m.description) } : m)) }
            case 'option-group':
              return {
                ...s,
                dishes: s.dishes.map((d) => ({
                  ...d,
                  options: d.options.map((g) => (g.id === id ? { ...g, name: apply(g.name) } : g)),
                })),
              }
            case 'option-choice':
              return {
                ...s,
                dishes: s.dishes.map((d) => ({
                  ...d,
                  options: d.options.map((g) => ({
                    ...g,
                    choices: g.choices.map((c) => (c.id === id ? { ...c, label: apply(c.label) } : c)),
                  })),
                })),
              }
          }
        })
      },

      retranslate(restaurantId) {
        patchState((s) => {
          const r = s.restaurants.find((x) => x.id === restaurantId)
          if (!r) return s
          const langs = activeLangs(r)
          const go = (f: I18nField) => withAuto(f, r.sourceLang, langs)
          return {
            ...s,
            restaurants: s.restaurants.map((x) => (x.id === r.id ? { ...x, description: go(x.description) } : x)),
            categories: s.categories.map((c) => (c.restaurantId === r.id ? { ...c, name: go(c.name) } : c)),
            dishes: s.dishes.map((d) => (d.restaurantId === r.id ? mapDishFields(d, go) : d)),
            menus: s.menus.map((m) =>
              m.restaurantId === r.id ? { ...m, name: go(m.name), description: go(m.description) } : m,
            ),
          }
        })
      },

      purchaseLang(restaurantId, l) {
        patchState((s) => {
          const r = s.restaurants.find((x) => x.id === restaurantId)
          if (!r || activeLangs(r).includes(l)) return s
          const next: Restaurant = { ...r, purchasedLangs: [...r.purchasedLangs, l] }
          const line: PurchaseLine = {
            id: uid('inv'), restaurantId, lang: l,
            amount: LANG_PRICE[r.plan], date: new Date().toISOString().slice(0, 10),
          }
          const langs = activeLangs(next)
          const go = (f: I18nField) => withAuto(f, next.sourceLang, langs)
          return {
            ...s,
            purchases: [...s.purchases, line],
            restaurants: s.restaurants.map((x) => (x.id === r.id ? { ...next, description: go(next.description) } : x)),
            categories: s.categories.map((c) => (c.restaurantId === r.id ? { ...c, name: go(c.name) } : c)),
            dishes: s.dishes.map((d) => (d.restaurantId === r.id ? mapDishFields(d, go) : d)),
            menus: s.menus.map((m) =>
              m.restaurantId === r.id ? { ...m, name: go(m.name), description: go(m.description) } : m,
            ),
          }
        })
      },

      selection,

      addToSelection(dishId, restaurantId, choiceIds, qty = 1) {
        setSelection((cur) => {
          // La sélection porte sur une seule carte à la fois.
          const base = cur.length && cur[0].restaurantId !== restaurantId ? [] : cur
          const key = [...choiceIds].sort().join('|')
          const existing = base.find(
            (l) => l.dishId === dishId && [...l.choiceIds].sort().join('|') === key,
          )
          if (existing) {
            return base.map((l) => (l.id === existing.id ? { ...l, qty: l.qty + qty } : l))
          }
          return [...base, { id: uid('sel'), restaurantId, dishId, choiceIds, qty }]
        })
      },

      setSelectionQty(lineId, qty) {
        setSelection((cur) =>
          qty <= 0 ? cur.filter((l) => l.id !== lineId) : cur.map((l) => (l.id === lineId ? { ...l, qty } : l)),
        )
      },

      removeFromSelection(lineId) {
        setSelection((cur) => cur.filter((l) => l.id !== lineId))
      },

      clearSelection() { setSelection([]) },

      resetDemo() {
        setState(seedWithTranslations())
        setSession({ role: 'guest' })
        setSelection([])
      },
    }
  }, [state, session, lang, setLang, selection, retranslateField])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore doit être utilisé dans <StoreProvider>')
  return v
}
