import { useState } from 'react'
import type { Dish, Lang } from '../../types'
import { money } from '../../lib/format'
import { resolve } from '../../lib/translate'
import { basePrice, missingRequired } from '../../lib/selection'
import { t } from '../../i18n/ui'
import { Sheet } from './Sheet'

/** Choix des options d'un plat avant ajout à la sélection. */
export function OptionPicker({
  dish, lang, sourceLang, onCancel, onConfirm,
}: {
  dish: Dish
  lang: Lang
  sourceLang: Lang
  onCancel: () => void
  onConfirm: (choiceIds: string[], qty: number) => void
}) {
  const [picked, setPicked] = useState<string[]>(() =>
    // Pré-sélectionne le premier choix des groupes obligatoires à choix unique.
    dish.options
      .filter((g) => g.required && !g.multiple && g.choices.length > 0)
      .map((g) => g.choices[0].id),
  )
  const [qty, setQty] = useState(1)

  const T = (f: Parameters<typeof resolve>[0]) => resolve(f, lang, sourceLang)
  const missing = missingRequired(dish, picked)
  const extra = dish.options
    .flatMap((g) => g.choices)
    .filter((c) => picked.includes(c.id))
    .reduce((n, c) => n + c.priceDelta, 0)
  const unit = basePrice(dish) + extra

  function toggle(groupId: string, choiceId: string, multiple: boolean) {
    setPicked((cur) => {
      if (multiple) {
        return cur.includes(choiceId) ? cur.filter((x) => x !== choiceId) : [...cur, choiceId]
      }
      const group = dish.options.find((g) => g.id === groupId)!
      const others = cur.filter((x) => !group.choices.some((c) => c.id === x))
      return cur.includes(choiceId) ? others : [...others, choiceId]
    })
  }

  return (
    <Sheet title={T(dish.name)} onClose={onCancel}>
      {dish.photo && (
        <img
          src={dish.photo} alt=""
          style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 12, marginBottom: '.8rem' }}
        />
      )}
      {T(dish.description) && <p className="small muted">{T(dish.description)}</p>}

      {dish.options.map((g) => (
        <div key={g.id} className="opt-group">
          <div className="row gap-s">
            <b style={{ flex: 1 }}>{T(g.name)}</b>
            <span className="badge grey">
              {g.required ? t('opt.required', lang) : t('opt.optional', lang)}
              {g.multiple ? ` · ${t('opt.multiple', lang)}` : ''}
            </span>
          </div>
          {g.choices.map((c) => (
            <button
              key={c.id} className="opt-choice" aria-pressed={picked.includes(c.id)}
              onClick={() => toggle(g.id, c.id, g.multiple)}
            >
              <span className="mark" aria-hidden>{picked.includes(c.id) ? '✓' : ''}</span>
              <span style={{ flex: 1 }}>{T(c.label)}</span>
              {c.priceDelta > 0 && <span className="small mono">+{money(c.priceDelta, lang)}</span>}
            </button>
          ))}
        </div>
      ))}

      {missing.length > 0 && (
        <p className="notice warn" style={{ marginTop: '.6rem' }}>
          {t('opt.chooseFirst', lang)} : {missing.map((g) => T(g.name)).join(', ')}
        </p>
      )}

      <div className="sheet__actions row gap-m">
        <span className="qty">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Retirer un">−</button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} aria-label="Ajouter un">+</button>
        </span>
        <button
          className="btn lg" style={{ flex: 1 }} disabled={missing.length > 0}
          onClick={() => onConfirm(picked, qty)}
        >
          {t('sel.add', lang)} · {money(unit * qty, lang)}
        </button>
      </div>
    </Sheet>
  )
}
