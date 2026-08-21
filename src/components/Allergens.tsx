import { ALLERGEN_LABEL, DIET_LABEL, type Allergen, type DietTag } from '../types'

export function AllergenChips({ items }: { items: Allergen[] }) {
  if (!items.length) return null
  return (
    <div className="allergen-line">
      {items.map((a) => (
        <span key={a} className="badge grey" title={`Allergène : ${ALLERGEN_LABEL[a].fr}`}>
          {ALLERGEN_LABEL[a].icon} {ALLERGEN_LABEL[a].fr}
        </span>
      ))}
    </div>
  )
}

export function DietChips({ items }: { items: DietTag[] }) {
  if (!items.length) return null
  return (
    <>
      {items.map((tg) => (
        <span key={tg} className="badge mint">{DIET_LABEL[tg].icon} {DIET_LABEL[tg].fr}</span>
      ))}
    </>
  )
}
