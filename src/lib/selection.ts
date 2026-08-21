import type { Dish, DishOptionChoice, DishOptionGroup, SelectionLine } from '../types'

export interface ResolvedChoice {
  group: DishOptionGroup
  choice: DishOptionChoice
}

export interface ResolvedLine {
  line: SelectionLine
  dish: Dish
  choices: ResolvedChoice[]
  /** Prix unitaire, promo et suppléments d'options compris. */
  unitPrice: number
  total: number
}

/** Prix de base d'un plat : la promo prime sur le prix courant. */
export function basePrice(dish: Dish): number {
  return dish.promoPrice ?? dish.price
}

/** Retrouve les choix d'options d'une ligne à partir de leurs identifiants. */
export function resolveChoices(dish: Dish, choiceIds: string[]): ResolvedChoice[] {
  const out: ResolvedChoice[] = []
  for (const group of dish.options) {
    for (const choice of group.choices) {
      if (choiceIds.includes(choice.id)) out.push({ group, choice })
    }
  }
  return out
}

export function resolveSelection(selection: SelectionLine[], dishes: Dish[]): ResolvedLine[] {
  const byId = new Map(dishes.map((d) => [d.id, d] as const))
  const out: ResolvedLine[] = []
  for (const line of selection) {
    const dish = byId.get(line.dishId)
    if (!dish) continue // plat retiré de la carte entre-temps
    const choices = resolveChoices(dish, line.choiceIds)
    const unitPrice = basePrice(dish) + choices.reduce((n, c) => n + c.choice.priceDelta, 0)
    out.push({ line, dish, choices, unitPrice, total: unitPrice * line.qty })
  }
  return out
}

export function selectionTotal(lines: ResolvedLine[]): number {
  return lines.reduce((n, l) => n + l.total, 0)
}

export function selectionCount(selection: SelectionLine[]): number {
  return selection.reduce((n, l) => n + l.qty, 0)
}

/** Un plat est prêt à être ajouté quand tous ses groupes obligatoires ont un choix. */
export function missingRequired(dish: Dish, choiceIds: string[]): DishOptionGroup[] {
  return dish.options.filter(
    (g) => g.required && !g.choices.some((c) => choiceIds.includes(c.id)),
  )
}
