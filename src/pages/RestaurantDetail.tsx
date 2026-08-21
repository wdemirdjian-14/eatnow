import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { activeLangs, useStore } from '../store/store'
import {
  ALLERGEN_LABEL, CUISINE_LABEL, DIET_LABEL, LANGS, LANG_META,
  type Dish, type Lang,
} from '../types'
import { money, priceRangeLabel } from '../lib/format'
import { resolve } from '../lib/translate'
import { basePrice, resolveSelection, selectionCount, selectionTotal } from '../lib/selection'
import { t } from '../i18n/ui'
import { OptionPicker } from '../components/menu/OptionPicker'
import { SelectionSheet } from '../components/menu/SelectionSheet'
import { OrderView } from '../components/menu/OrderView'

type Overlay = 'none' | 'selection' | 'order'

export function RestaurantDetail() {
  const { slug } = useParams()
  const {
    state, lang, setLang, selection,
    addToSelection, setSelectionQty, clearSelection,
  } = useStore()

  const r = state.restaurants.find((x) => x.slug === slug)

  const [openCat, setOpenCat] = useState<string | null>(null)
  const [openDish, setOpenDish] = useState<string | null>(null)
  const [picking, setPicking] = useState<Dish | null>(null)
  const [overlay, setOverlay] = useState<Overlay>('none')
  const [toast, setToast] = useState<string | null>(null)

  const data = useMemo(() => {
    if (!r) return null
    const cats = state.categories.filter((c) => c.restaurantId === r.id).sort((a, b) => a.order - b.order)
    const dishes = state.dishes.filter((d) => d.restaurantId === r.id).sort((a, b) => a.order - b.order)
    const menus = state.menus.filter((m) => m.restaurantId === r.id).sort((a, b) => a.order - b.order)
    return { cats, dishes, menus, dayDishes: dishes.filter((d) => d.dishOfDay && d.available) }
  }, [r, state])

  const myLines = useMemo(
    () => (r ? resolveSelection(selection.filter((l) => l.restaurantId === r.id), state.dishes) : []),
    [selection, state.dishes, r],
  )

  if (!r || !data) {
    return (
      <main className="wrap empty stack gap-m">
        <h2>Restaurant introuvable</h2>
        <Link className="btn" to="/">Retour à la recherche</Link>
      </main>
    )
  }

  const langs = activeLangs(r)
  const supported = langs.includes(lang)
  const shown: Lang = supported ? lang : r.sourceLang
  const rtl = LANG_META[shown].rtl
  const translated = shown !== r.sourceLang
  const T = (f: Parameters<typeof resolve>[0]) => resolve(f, shown, r.sourceLang)

  const count = selectionCount(selection.filter((l) => l.restaurantId === r.id))
  const inSelection = (dishId: string) => selection.some((l) => l.dishId === dishId)

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2000)
  }

  /** Ajout direct si le plat n'a pas d'options, sinon ouverture du sélecteur. */
  function handleAdd(d: Dish) {
    if (!d.available) return
    if (d.options.length > 0) { setPicking(d); return }
    addToSelection(d.id, r!.id, [], 1)
    flash(`✅ ${t('sel.added', shown)}`)
  }

  const visibleCats = data.cats.filter((c) => !openCat || c.id === openCat)

  return (
    <>
      <section className="resto-hero" style={{ ['--h' as string]: r.hue }}>
        <div className="wrap stack gap-s">
          <Link to="/" className="small" style={{ opacity: .85 }}>← {t('nav.back', shown)}</Link>
          <div className="row gap-s" style={{ alignItems: 'flex-start' }}>
            <span className="emoji" aria-hidden>{r.emoji}</span>
            <div className="stack gap-xs" style={{ flex: 1, minWidth: 0 }}>
              <h1>{r.name}</h1>
              <div className="row gap-xs wrap-flex tiny" style={{ opacity: .9 }}>
                <span>{r.cuisines.map((c) => CUISINE_LABEL[c]).join(' · ')}</span>
                <span>·</span><span className="mono">{priceRangeLabel(r.priceRange)}</span>
                <span>·</span><span>★ {r.rating.toFixed(1)} ({r.reviews})</span>
              </div>
            </div>
          </div>
          <p className="small" style={{ opacity: .92 }}>{T(r.description)}</p>
          <div className="row gap-xs wrap-flex tiny" style={{ opacity: .9 }}>
            <span>📍 {r.address}, {r.postalCode} {r.city}</span>
            <span>·</span>
            <span>🕑 {r.hours}</span>
          </div>
          <div className="row gap-s wrap-flex">
            <a className="btn sun sm" href={`tel:${r.phone.replace(/\s/g, '')}`}>📞 {t('resto.call', shown)}</a>
            <a
              className="btn outline sm"
              href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=17/${r.lat}/${r.lng}`}
              target="_blank" rel="noreferrer"
            >
              🗺️ {t('resto.route', shown)}
            </a>
          </div>
        </div>
      </section>

      {r.published && (
        <div className="lang-strip">
          <div className="wrap inner">
            <span className="tiny muted" style={{ whiteSpace: 'nowrap' }}>🌍</span>
            {LANGS.map((l) => (
              <button
                key={l} className="chip sm" aria-pressed={shown === l}
                onClick={() => setLang(l)}
                title={langs.includes(l) ? LANG_META[l].label : `${LANG_META[l].label} — non proposée par ce restaurant`}
                style={langs.includes(l) ? undefined : { opacity: .45 }}
              >
                {LANG_META[l].flag} {LANG_META[l].native}{!langs.includes(l) && ' 🔒'}
              </button>
            ))}
          </div>
        </div>
      )}

      <main
        className={`wrap stack gap-m ${rtl ? 'rtl' : ''}`}
        style={{ paddingTop: '1rem', paddingBottom: count > 0 ? '6rem' : '1rem' }}
      >
        {!r.published && <p className="notice warn">🔒 {t('resto.notTranslated', shown)}</p>}
        {r.published && !supported && (
          <p className="notice warn">
            🔒 {t('resto.langNotBought', lang)} {LANG_META[r.sourceLang].native}.
          </p>
        )}

        <article className="menu-sheet">
          <header className="menu-sheet__head">
            <p className="eyebrow">{r.emoji} {r.city}</p>
            <h2>{t('resto.menu', shown)}</h2>
            {translated && (
              <p className="tiny" style={{ color: 'var(--paper-ink-2)', marginTop: '.4rem' }}>
                👆 {t('resto.tapHint', shown)}
              </p>
            )}
          </header>

          <nav className="cat-tabs" aria-label={t('resto.menu', shown)}>
            <button className="chip sm" aria-pressed={openCat === null} onClick={() => setOpenCat(null)}>
              {t('nav.discover', shown)}
            </button>
            {data.cats.map((c) => (
              <button
                key={c.id} className="chip sm" aria-pressed={openCat === c.id}
                onClick={() => setOpenCat(openCat === c.id ? null : c.id)}
              >
                {T(c.name)}
              </button>
            ))}
          </nav>

          {data.dayDishes.length > 0 && !openCat && (
            <section className="menu-section">
              <h3 className="menu-section__title">⭐ {t('resto.dishOfDay', shown)}</h3>
              {data.dayDishes.map((d) => (
                <MenuItem
                  key={`day-${d.id}`} dish={d} shown={shown} sourceLang={r.sourceLang}
                  translated={translated} expanded={openDish === `day-${d.id}`}
                  onToggle={() => setOpenDish(openDish === `day-${d.id}` ? null : `day-${d.id}`)}
                  onAdd={() => handleAdd(d)} inSelection={inSelection(d.id)}
                />
              ))}
            </section>
          )}

          {data.menus.length > 0 && !openCat && (
            <section className="menu-section">
              <h3 className="menu-section__title">🍽️ {t('resto.formulas', shown)}</h3>
              <div className="stack gap-s" style={{ marginTop: '.8rem' }}>
                {data.menus.map((m) => (
                  <div key={m.id} className="formula">
                    <div className="row gap-s">
                      <b className="menu-item__name" style={{ flex: 1 }}>{T(m.name)}</b>
                      <span className="formula__price">{money(m.price, shown)}</span>
                    </div>
                    <p className="menu-item__desc">{T(m.description)}</p>
                    {m.dishIds.length > 0 && (
                      <ul className="menu-item__desc" style={{ margin: '.4rem 0 0', paddingInlineStart: '1.1rem' }}>
                        {m.dishIds.map((id) => {
                          const d = data.dishes.find((x) => x.id === id)
                          return d ? <li key={id}>{T(d.name)}</li> : null
                        })}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {visibleCats.map((c) => {
            const list = data.dishes.filter((d) => d.categoryId === c.id)
            if (!list.length) return null
            return (
              <section key={c.id} className="menu-section">
                <h3 className="menu-section__title">{T(c.name)}</h3>
                {list.map((d) => (
                  <MenuItem
                    key={d.id} dish={d} shown={shown} sourceLang={r.sourceLang}
                    translated={translated} expanded={openDish === d.id}
                    onToggle={() => setOpenDish(openDish === d.id ? null : d.id)}
                    onAdd={() => handleAdd(d)} inSelection={inSelection(d.id)}
                  />
                ))}
              </section>
            )
          })}
        </article>
      </main>

      {count > 0 && overlay === 'none' && !picking && (
        <button className="sel-bar" onClick={() => setOverlay('selection')}>
          <span className="sel-bar__count">{count}</span>
          <span className="stack" style={{ alignItems: 'flex-start', lineHeight: 1.25 }}>
            <b>{t('sel.view', shown)}</b>
            <span className="tiny" style={{ opacity: .8 }}>
              {count} {t('sel.items', shown)} · {money(selectionTotal(myLines), shown)}
            </span>
          </span>
          <span className="spacer" />
          <span aria-hidden style={{ fontSize: '1.2rem' }}>🧾</span>
        </button>
      )}

      {picking && (
        <OptionPicker
          dish={picking} lang={shown} sourceLang={r.sourceLang}
          onCancel={() => setPicking(null)}
          onConfirm={(choiceIds, qty) => {
            addToSelection(picking.id, r.id, choiceIds, qty)
            setPicking(null)
            flash(`✅ ${t('sel.added', shown)}`)
          }}
        />
      )}

      {overlay === 'selection' && (
        <SelectionSheet
          lines={myLines} lang={shown} restaurant={r}
          onClose={() => setOverlay('none')}
          onQty={setSelectionQty}
          onClear={() => { clearSelection(); setOverlay('none') }}
          onValidate={() => setOverlay('order')}
        />
      )}

      {overlay === 'order' && (
        <OrderView
          lines={myLines} lang={shown} restaurant={r}
          onClose={() => setOverlay('none')}
          onBack={() => setOverlay('selection')}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}

/** Une ligne de la carte : texte traduit, révélation du texte original, ajout. */
function MenuItem({
  dish, shown, sourceLang, translated, expanded, onToggle, onAdd, inSelection,
}: {
  dish: Dish
  shown: Lang
  sourceLang: Lang
  translated: boolean
  expanded: boolean
  onToggle: () => void
  onAdd: () => void
  inSelection: boolean
}) {
  const T = (f: Parameters<typeof resolve>[0]) => resolve(f, shown, sourceLang)
  const price = basePrice(dish)

  return (
    <div className={`menu-item ${dish.photo ? 'has-photo' : ''} ${dish.available ? '' : 'off'}`}>
      {dish.photo && <img className="menu-item__photo" src={dish.photo} alt="" loading="lazy" />}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'inherit', cursor: translated ? 'pointer' : 'default', minWidth: 0 }}
      >
        <span className="menu-item__name">
          {T(dish.name)}
          {dish.dishOfDay && <span className="paper-badge day">⭐</span>}
          {dish.promoPrice !== undefined && <span className="paper-badge hot">%</span>}
        </span>
        {T(dish.description) && <span className="menu-item__desc">{T(dish.description)}</span>}
        <span className="menu-item__chips">
          {dish.tags.map((tg) => (
            <span key={tg} className="paper-badge">{DIET_LABEL[tg].icon} {DIET_LABEL[tg].fr}</span>
          ))}
          {dish.allergens.map((a) => (
            <span key={a} className="paper-badge" title={ALLERGEN_LABEL[a].fr}>
              {ALLERGEN_LABEL[a].icon} {ALLERGEN_LABEL[a].fr}
            </span>
          ))}
          {dish.options.length > 0 && (
            <span className="paper-badge">⚙️ {dish.options.length} option{dish.options.length > 1 ? 's' : ''}</span>
          )}
        </span>
      </button>

      <div className="menu-item__aside">
        <span className="menu-item__price">
          {dish.promoPrice !== undefined
            ? <><s>{money(dish.price, shown)}</s><em>{money(dish.promoPrice, shown)}</em></>
            : money(price, shown)}
        </span>
        {dish.available ? (
          <button
            className={`menu-item__add ${inSelection ? 'in' : ''}`}
            onClick={onAdd}
            aria-label={`${t('sel.add', shown)} — ${T(dish.name)}`}
          >
            +
          </button>
        ) : (
          <span className="paper-badge">{t('resto.unavailable', shown)}</span>
        )}
      </div>

      {expanded && translated && (
        <div className="menu-item__source">
          <span className="lbl">
            {LANG_META[sourceLang].flag} {t('resto.original', shown)}
          </span>
          <div className="orig-name" dir={LANG_META[sourceLang].rtl ? 'rtl' : undefined}>
            {resolve(dish.name, sourceLang, sourceLang)}
          </div>
          {dish.description.source && (
            <div className="orig-desc" dir={LANG_META[sourceLang].rtl ? 'rtl' : undefined}>
              {dish.description.source}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
