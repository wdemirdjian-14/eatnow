/**
 * Exporte les données de démonstration du client vers `server/seed-data.json`.
 *
 *   npm run export:seed
 *
 * Les données de démo n'ont ainsi qu'une seule source — `src/data/seed.ts` —
 * et le serveur reçoit les traductions automatiques déjà calculées, sans
 * embarquer le moteur de traduction.
 */
import { writeFileSync } from 'node:fs'
import { buildSeedState } from '../src/data/seed.ts'
import { autoTranslate } from '../src/lib/translate.ts'
import { INCLUDED_LANGS } from '../src/types.ts'

const state = buildSeedState()

const activeLangs = (r) => [...new Set([r.sourceLang, ...INCLUDED_LANGS, ...r.purchasedLangs])]

const langsOf = new Map(state.restaurants.map((r) => [r.id, activeLangs(r)]))
const srcOf = new Map(state.restaurants.map((r) => [r.id, r.sourceLang]))

/** Calcule les traductions automatiques d'un champ multilingue. */
function withAuto(restaurantId, f) {
  const from = srcOf.get(restaurantId) ?? 'fr'
  const auto = {}
  for (const l of langsOf.get(restaurantId) ?? []) {
    if (l === from) continue
    auto[l] = autoTranslate(f.source, from, l).text
  }
  return { ...f, auto }
}

const out = {
  restaurants: state.restaurants.map((r) => ({ ...r, description: withAuto(r.id, r.description) })),
  categories: state.categories.map((c) => ({ ...c, name: withAuto(c.restaurantId, c.name) })),
  dishes: state.dishes.map((d) => ({
    ...d,
    name: withAuto(d.restaurantId, d.name),
    description: withAuto(d.restaurantId, d.description),
    options: d.options.map((g) => ({
      ...g,
      name: withAuto(d.restaurantId, g.name),
      choices: g.choices.map((c) => ({ ...c, label: withAuto(d.restaurantId, c.label) })),
    })),
  })),
  menus: state.menus.map((m) => ({
    ...m,
    name: withAuto(m.restaurantId, m.name),
    description: withAuto(m.restaurantId, m.description),
  })),
  // Mot de passe en clair : il est haché par le serveur au chargement.
  owners: state.owners,
}

writeFileSync('server/seed-data.json', JSON.stringify(out, null, 2) + '\n')
console.log(
  `server/seed-data.json — ${out.restaurants.length} restaurants, ${out.dishes.length} plats, ` +
  `${out.menus.length} formules, ${out.owners.length} comptes.`,
)
