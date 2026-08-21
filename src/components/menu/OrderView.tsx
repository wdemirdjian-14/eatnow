import { LANG_META, type Lang, type Restaurant } from '../../types'
import { money } from '../../lib/format'
import { resolve } from '../../lib/translate'
import { selectionTotal, type ResolvedLine } from '../../lib/selection'
import { t } from '../../i18n/ui'
import { Sheet } from './Sheet'

/**
 * La commande validée, affichée dans les deux langues côte à côte :
 * celle du client et celle de la carte, pour être montrée au serveur.
 */
export function OrderView({
  lines, lang, restaurant, onClose, onBack,
}: {
  lines: ResolvedLine[]
  lang: Lang
  restaurant: Restaurant
  onClose: () => void
  onBack: () => void
}) {
  const src = restaurant.sourceLang
  const total = selectionTotal(lines)
  const bilingual = lang !== src

  return (
    <Sheet title={`🧾 ${t('order.title', lang)}`} onClose={onClose} tone="paper">
      <div className="order-head">
        <p className="tiny" style={{ letterSpacing: '.2em', textTransform: 'uppercase' }}>
          {restaurant.name}
        </p>
        <h2>{t('order.show', lang)}</h2>
      </div>

      {lines.map((l) => (
        <div key={l.line.id} className="order-line">
          <div className="row gap-s" style={{ marginBottom: '.35rem' }}>
            <span className="paper-badge">× {l.line.qty}</span>
            <span className="spacer" />
            <b className="mono">{money(l.total, lang)}</b>
          </div>

          <div className="order-cols">
            <div className="order-col">
              <div className="order-col__lbl">
                {LANG_META[lang].flag} {t('order.yours', lang)}
              </div>
              <div className="order-name" dir={LANG_META[lang].rtl ? 'rtl' : undefined}>
                {resolve(l.dish.name, lang, src)}
              </div>
              {l.choices.length > 0 && (
                <div className="order-opts" dir={LANG_META[lang].rtl ? 'rtl' : undefined}>
                  {l.choices.map((c) => `${resolve(c.group.name, lang, src)} : ${resolve(c.choice.label, lang, src)}`).join(' · ')}
                </div>
              )}
            </div>

            {bilingual && (
              <div className="order-col source">
                <div className="order-col__lbl">
                  {LANG_META[src].flag} {t('order.staff', lang)}
                </div>
                <div className="order-name" dir={LANG_META[src].rtl ? 'rtl' : undefined}>
                  {resolve(l.dish.name, src, src)}
                </div>
                {l.choices.length > 0 && (
                  <div className="order-opts" dir={LANG_META[src].rtl ? 'rtl' : undefined}>
                    {l.choices.map((c) => `${resolve(c.group.name, src, src)} : ${resolve(c.choice.label, src, src)}`).join(' · ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="order-total">
        <span style={{ flex: 1 }}>{t('sel.total', lang)}</span>
        <span className="mono">{money(total, lang)}</span>
      </div>

      <p className="tiny muted" style={{ marginTop: '.8rem' }}>{t('order.note', lang)}</p>
      <div className="sheet__actions">
        <button className="btn outline block" onClick={onBack}>← {t('order.back', lang)}</button>
      </div>
    </Sheet>
  )
}
