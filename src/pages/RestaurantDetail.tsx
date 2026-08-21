import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { activeLangs, useStore } from '../store/store'
import { CUISINE_LABEL, LANGS, LANG_META, type Lang } from '../types'
import { money, priceRangeLabel } from '../lib/format'
import { resolve } from '../lib/translate'
import { t } from '../i18n/ui'
import { AllergenChips, DietChips } from '../components/Allergens'

export function RestaurantDetail() {
  const { slug } = useParams()
  const { state, lang, setLang } = useStore()
  const r = state.restaurants.find((x) => x.slug === slug)
  const [openCat, setOpenCat] = useState<string | null>(null)

  const data = useMemo(() => {
    if (!r) return null
    const cats = state.categories.filter((c) => c.restaurantId === r.id).sort((a, b) => a.order - b.order)
    const dishes = state.dishes.filter((d) => d.restaurantId === r.id).sort((a, b) => a.order - b.order)
    const menus = state.menus.filter((m) => m.restaurantId === r.id).sort((a, b) => a.order - b.order)
    return { cats, dishes, menus, dayDishes: dishes.filter((d) => d.dishOfDay && d.available) }
  }, [r, state])

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
  const T = (f: Parameters<typeof resolve>[0]) => resolve(f, shown, r.sourceLang)

  return (
    <>
      <section className="resto-hero" style={{ ['--h' as string]: r.hue }}>
        <div className="wrap stack gap-m">
          <Link to="/" className="small" style={{ opacity: .8 }}>← {t('nav.back', lang)}</Link>
          <div className="row gap-m wrap-flex">
            <span className="emoji" aria-hidden>{r.emoji}</span>
            <div className="stack gap-xs" style={{ flex: 1, minWidth: 240 }}>
              <h1 style={{ fontSize: 'clamp(1.7rem,4vw,2.6rem)' }}>{r.name}</h1>
              <div className="row gap-xs wrap-flex small" style={{ opacity: .9 }}>
                <span>{r.cuisines.map((c) => CUISINE_LABEL[c]).join(' · ')}</span>
                <span>·</span><span className="mono">{priceRangeLabel(r.priceRange)}</span>
                <span>·</span><span>★ {r.rating.toFixed(1)} ({r.reviews})</span>
              </div>
              <p style={{ opacity: .92, maxWidth: '60ch' }}>{T(r.description)}</p>
            </div>
            <div className="stack gap-xs small" style={{ opacity: .92 }}>
              <span>📍 {r.address}, {r.postalCode} {r.city}</span>
              <span>🕑 {r.hours}</span>
              <div className="row gap-s" style={{ marginTop: '.4rem' }}>
                <a className="btn sun sm" href={`tel:${r.phone.replace(/\s/g, '')}`}>📞 {t('resto.call', lang)}</a>
                <a
                  className="btn outline sm"
                  href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=17/${r.lat}/${r.lng}`}
                  target="_blank" rel="noreferrer"
                >
                  🗺️ {t('resto.route', lang)}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {r.published ? (
        <div className="lang-strip">
          <div className="wrap inner">
            <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{t('resto.readIn', lang)} :</span>
            {LANGS.map((l) => (
              <button
                key={l} className="chip sm" aria-pressed={shown === l}
                onClick={() => setLang(l)}
                title={langs.includes(l) ? LANG_META[l].label : `${LANG_META[l].label} — non proposée par ce restaurant`}
                style={langs.includes(l) ? undefined : { opacity: .45 }}
              >
                {LANG_META[l].flag} {LANG_META[l].native}
                {!langs.includes(l) && ' 🔒'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <main className={`wrap stack gap-l ${rtl ? 'rtl' : ''}`} style={{ paddingTop: '1.6rem' }}>
        {!r.published && (
          <p className="notice warn">
            🔒 {t('resto.notTranslated', lang)} La carte ci-dessous est affichée dans sa langue d’origine.
          </p>
        )}
        {r.published && !supported && (
          <p className="notice warn">
            🔒 {t('resto.langNotBought', lang)} {LANG_META[r.sourceLang].native}.
          </p>
        )}
        {r.published && supported && shown !== r.sourceLang && (
          <p className="notice">🌍 {t('resto.machine', lang)}</p>
        )}

        {data.dayDishes.length > 0 && (
          <section className="stack gap-s">
            <h2>⭐ {t('resto.dishOfDay', lang)}</h2>
            <div className="grid-restos">
              {data.dayDishes.map((d) => (
                <article key={d.id} className="menu-card stack gap-xs">
                  <span className="badge sun">{t('resto.dishOfDay', lang)}</span>
                  <h3>{T(d.name)}</h3>
                  <p className="small muted">{T(d.description)}</p>
                  <span className="price-tag">{money(d.promoPrice ?? d.price, shown)}</span>
                  <AllergenChips items={d.allergens} />
                </article>
              ))}
            </div>
          </section>
        )}

        {data.menus.length > 0 && (
          <section className="stack gap-s">
            <h2>🍽️ {t('resto.formulas', lang)}</h2>
            <div className="grid-restos">
              {data.menus.map((m) => (
                <article key={m.id} className="menu-card stack gap-s">
                  <div className="row gap-s">
                    <h3 style={{ flex: 1 }}>{T(m.name)}</h3>
                    <span className="price-tag">{money(m.price, shown)}</span>
                  </div>
                  <p className="small muted">{T(m.description)}</p>
                  {m.dishIds.length > 0 && (
                    <ul className="small stack gap-xs" style={{ margin: 0, paddingInlineStart: '1.1rem' }}>
                      {m.dishIds.map((id) => {
                        const d = data.dishes.find((x) => x.id === id)
                        return d ? <li key={id}>{T(d.name)}</li> : null
                      })}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="stack gap-m">
          <div className="row gap-s wrap-flex">
            <h2 style={{ flex: 1 }}>📖 {t('resto.menu', lang)}</h2>
          </div>

          <nav className="cat-nav">
            {data.cats.map((c) => (
              <button
                key={c.id} className="chip sm" aria-pressed={openCat === c.id}
                onClick={() => setOpenCat(openCat === c.id ? null : c.id)}
              >
                {T(c.name)}
              </button>
            ))}
          </nav>

          {data.cats
            .filter((c) => !openCat || c.id === openCat)
            .map((c) => {
              const list = data.dishes.filter((d) => d.categoryId === c.id)
              if (!list.length) return null
              return (
                <section key={c.id} className="card pad stack gap-xs">
                  <h3 style={{ color: 'var(--teal-700)' }}>{T(c.name)}</h3>
                  {list.map((d) => (
                    <article key={d.id} className={`dish ${d.available ? '' : 'off'}`}>
                      <div className="info">
                        <div className="nm">
                          {T(d.name)}
                          {d.dishOfDay && <span className="badge sun">{t('resto.dishOfDay', lang)}</span>}
                          {d.promoPrice !== undefined && <span className="badge coral">{t('resto.promo', lang)}</span>}
                          <DietChips items={d.tags} />
                          {!d.available && <span className="badge grey">{t('resto.unavailable', lang)}</span>}
                        </div>
                        {T(d.description) && <p className="desc">{T(d.description)}</p>}
                        {d.allergens.length > 0
                          ? <AllergenChips items={d.allergens} />
                          : <p className="tiny muted" style={{ marginTop: '.4rem' }}>{t('resto.noAllergen', lang)}</p>}
                      </div>
                      <div className="price">
                        {d.promoPrice !== undefined
                          ? <><s>{money(d.price, shown)}</s><em>{money(d.promoPrice, shown)}</em></>
                          : money(d.price, shown)}
                      </div>
                    </article>
                  ))}
                </section>
              )
            })}
        </section>
      </main>
    </>
  )
}
