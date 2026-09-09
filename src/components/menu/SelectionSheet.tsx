import { LANG_META, type Lang, type Restaurant } from '../../types'
import { money } from '../../lib/format'
import { resolve } from '../../lib/translate'
import { selectionTotal, type ResolvedLine } from '../../lib/selection'
import { t } from '../../i18n/ui'
import { Sheet } from './Sheet'

/** Récapitulatif modifiable de la sélection en cours. */
export function SelectionSheet({
  lines, lang, restaurant, numbers, onClose, onQty, onClear, onValidate,
}: {
  lines: ResolvedLine[]
  lang: Lang
  restaurant: Restaurant
  /** Numéros d'appel des plats, tels qu'ils figurent sur la carte. */
  numbers?: Map<string, number>
  onClose: () => void
  onQty: (lineId: string, qty: number) => void
  onClear: () => void
  onValidate: () => void
}) {
  const src = restaurant.sourceLang
  const T = (f: Parameters<typeof resolve>[0]) => resolve(f, lang, src)
  const total = selectionTotal(lines)

  return (
    <Sheet title={`🧾 ${t('sel.title', lang)}`} onClose={onClose}>
      {lines.length === 0 ? (
        <p className="empty">{t('sel.empty', lang)}</p>
      ) : (
        <>
          {lines.map((l) => (
            <div key={l.line.id} className="sel-line">
              <div style={{ minWidth: 0 }}>
                <b>
                  {numbers?.get(l.dish.id) !== undefined && (
                    <span className="dish-no">{String(numbers.get(l.dish.id)).padStart(2, '0')}</span>
                  )}
                  {T(l.dish.name)}
                </b>
                {l.choices.length > 0 && (
                  <div className="small muted">
                    {l.choices.map((c) => T(c.choice.label)).join(' · ')}
                  </div>
                )}
                <div className="tiny muted" dir={LANG_META[src].rtl ? 'rtl' : undefined}>
                  {LANG_META[src].flag} {resolve(l.dish.name, src, src)}
                </div>
              </div>
              <div className="stack gap-xs" style={{ alignItems: 'flex-end' }}>
                <b className="mono">{money(l.total, lang)}</b>
                <span className="qty">
                  <button onClick={() => onQty(l.line.id, l.line.qty - 1)} aria-label="Retirer un">−</button>
                  <span>{l.line.qty}</span>
                  <button onClick={() => onQty(l.line.id, l.line.qty + 1)} aria-label="Ajouter un">+</button>
                </span>
              </div>
            </div>
          ))}

          <div className="row gap-s" style={{ marginTop: '.9rem', paddingTop: '.9rem', borderTop: '2px solid var(--line)' }}>
            <b style={{ flex: 1, fontSize: '1.05rem' }}>{t('sel.total', lang)}</b>
            <b className="mono" style={{ fontSize: '1.25rem' }}>{money(total, lang)}</b>
          </div>

          <div className="sheet__actions stack gap-xs">
            <button className="btn lg block" onClick={onValidate}>
              ✅ {t('sel.validate', lang)}
            </button>
            <button className="btn ghost block sm" onClick={onClear}>
              {t('sel.clear', lang)}
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
