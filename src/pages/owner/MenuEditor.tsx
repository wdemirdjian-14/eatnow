import { useRef, useState } from 'react'
import { useStore } from '../../store/store'
import {
  ALLERGENS, ALLERGEN_LABEL, DIET_TAGS, DIET_LABEL,
  type Allergen, type DietTag, type Dish,
} from '../../types'
import { money } from '../../lib/format'
import { fileToPhoto } from '../../lib/photo'

export function OwnerMenuEditor() {
  const {
    state, currentOwner, addCategory, updateCategory, removeCategory, moveCategory,
    addDish, updateDish, removeDish,
  } = useStore()
  const r = currentOwner()!.restaurant

  const [newCat, setNewCat] = useState('')
  const [openDish, setOpenDish] = useState<string | null>(null)

  const cats = state.categories.filter((c) => c.restaurantId === r.id).sort((a, b) => a.order - b.order)
  const dishes = state.dishes.filter((d) => d.restaurantId === r.id)

  const toggleIn = <T,>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v]

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Ma carte</h2>
          <p>
            Vous êtes seul maître de vos plats et de vos prix. Chaque modification du texte source
            relance la traduction automatique dans vos langues activées.
          </p>
        </div>
      </div>

      <section className="card pad row gap-s wrap-flex">
        <input
          className="input" style={{ flex: '1 1 220px' }} value={newCat}
          placeholder="Nouvelle catégorie (Entrées, Plats, Desserts…)"
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newCat.trim()) { addCategory(r.id, newCat.trim()); setNewCat('') }
          }}
        />
        <button
          className="btn" disabled={!newCat.trim()}
          onClick={() => { addCategory(r.id, newCat.trim()); setNewCat('') }}
        >
          + Ajouter la catégorie
        </button>
      </section>

      {cats.length === 0 && (
        <p className="empty">Commencez par créer une catégorie, puis ajoutez-y vos plats.</p>
      )}

      {cats.map((c, i) => {
        const list = dishes.filter((d) => d.categoryId === c.id).sort((a, b) => a.order - b.order)
        return (
          <section key={c.id} className="card pad stack gap-s">
            <div className="row gap-s wrap-flex">
              <input
                className="input" style={{ flex: '1 1 200px', fontWeight: 700 }}
                value={c.name.source}
                onChange={(e) => updateCategory(c.id, { source: e.target.value })}
                aria-label="Nom de la catégorie"
              />
              <button className="btn ghost sm" disabled={i === 0} onClick={() => moveCategory(c.id, -1)} title="Monter">↑</button>
              <button className="btn ghost sm" disabled={i === cats.length - 1} onClick={() => moveCategory(c.id, 1)} title="Descendre">↓</button>
              <button className="btn outline sm" onClick={() => setOpenDish(addDish(r.id, c.id))}>+ Plat</button>
              <button
                className="btn danger sm"
                onClick={() => {
                  if (confirm(`Supprimer « ${c.name.source} » et ses ${list.length} plat(s) ?`)) removeCategory(c.id)
                }}
              >
                Supprimer
              </button>
            </div>

            {list.length === 0 && <p className="small muted">Aucun plat dans cette catégorie.</p>}

            {list.map((d) => {
              const open = openDish === d.id
              return (
                <article key={d.id} className={`editor-row ${open ? 'open' : ''}`}>
                  <div className="row gap-s wrap-flex">
                    <button
                      className="btn ghost sm" style={{ paddingInline: '.3rem' }}
                      onClick={() => setOpenDish(open ? null : d.id)}
                      aria-expanded={open}
                    >
                      {open ? '▾' : '▸'}
                    </button>
                    <input
                      className="input" style={{ flex: '1 1 200px' }} value={d.name.source}
                      onChange={(e) => updateDish(d.id, { nameSource: e.target.value })}
                      aria-label="Nom du plat"
                    />
                    <label className="row gap-xs small">
                      Prix
                      <input
                        className="input mono" style={{ width: 92 }} type="number" min={0} step="0.5"
                        value={d.price}
                        onChange={(e) => updateDish(d.id, { price: Number(e.target.value) })}
                      />
                    </label>
                    {d.dishOfDay && <span className="badge sun">Plat du jour</span>}
                    {d.promoPrice !== undefined && <span className="badge coral">Promo {money(d.promoPrice)}</span>}
                    {!d.available && <span className="badge grey">Indisponible</span>}
                    {d.options.length > 0 && <span className="badge">⚙️ {d.options.length} option{d.options.length > 1 ? 's' : ''}</span>}
                    {d.photo && <span className="badge mint">📷</span>}
                    {d.allergens.length === 0 && <span className="badge coral" title="Déclaration obligatoire">⚠️ allergènes</span>}
                  </div>

                  {open && (
                    <div className="stack gap-s">
                      <label className="field">
                        <span>Description</span>
                        <textarea
                          className="textarea" value={d.description.source}
                          onChange={(e) => updateDish(d.id, { descSource: e.target.value })}
                        />
                      </label>

                      <div className="grid-2">
                        <label className="field">
                          <span>Prix promotionnel (optionnel)</span>
                          <input
                            className="input mono" type="number" min={0} step="0.5"
                            value={d.promoPrice ?? ''} placeholder="—"
                            onChange={(e) => updateDish(d.id, {
                              promoPrice: e.target.value === '' ? undefined : Number(e.target.value),
                            })}
                          />
                        </label>
                        <div className="field">
                          <span>Mise en avant</span>
                          <div className="row gap-m wrap-flex" style={{ paddingTop: '.3rem' }}>
                            <label className="switch">
                              <input type="checkbox" checked={d.dishOfDay}
                                onChange={(e) => updateDish(d.id, { dishOfDay: e.target.checked })} />
                              <span className="track" /><span className="small">Plat du jour</span>
                            </label>
                            <label className="switch">
                              <input type="checkbox" checked={d.available}
                                onChange={(e) => updateDish(d.id, { available: e.target.checked })} />
                              <span className="track" /><span className="small">Disponible</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="field">
                        <span>Allergènes (obligatoire — règlement UE 1169/2011)</span>
                        <div className="row gap-xs wrap-flex">
                          {ALLERGENS.map((a: Allergen) => (
                            <button
                              key={a} className="chip sm" aria-pressed={d.allergens.includes(a)}
                              onClick={() => updateDish(d.id, { allergens: toggleIn(d.allergens, a) })}
                            >
                              {ALLERGEN_LABEL[a].icon} {ALLERGEN_LABEL[a].fr}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="field">
                        <span>Régimes & mentions</span>
                        <div className="row gap-xs wrap-flex">
                          {DIET_TAGS.map((tg: DietTag) => (
                            <button
                              key={tg} className="chip sm" aria-pressed={d.tags.includes(tg)}
                              onClick={() => updateDish(d.id, { tags: toggleIn(d.tags, tg) })}
                            >
                              {DIET_LABEL[tg].icon} {DIET_LABEL[tg].fr}
                            </button>
                          ))}
                        </div>
                      </div>

                      <PhotoEditor dish={d} />

                      <OptionsEditor dish={d} />

                      <div className="row gap-s">
                        <select
                          className="select" style={{ width: 'auto' }} value={d.categoryId}
                          onChange={(e) => updateDish(d.id, { categoryId: e.target.value })}
                          aria-label="Catégorie du plat"
                        >
                          {cats.map((x) => <option key={x.id} value={x.id}>{x.name.source}</option>)}
                        </select>
                        <span className="spacer" />
                        <button
                          className="btn danger sm"
                          onClick={() => { if (confirm(`Supprimer « ${d.name.source} » ?`)) removeDish(d.id) }}
                        >
                          Supprimer le plat
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        )
      })}
    </>
  )
}

/** Téléversement, aperçu et retrait de la photo d'un plat. */
function PhotoEditor({ dish }: { dish: Dish }) {
  const { setDishPhoto } = useStore()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onPick(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      setDishPhoto(dish.id, await fileToPhoto(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import impossible.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="field">
      <span>Photo du plat (facultatif)</span>
      <div className="photo-box">
        {dish.photo
          ? <img src={dish.photo} alt={`Photo de ${dish.name.source}`} />
          : <div className="photo-drop" aria-hidden>📷</div>}
        <div className="stack gap-xs">
          <input
            ref={input} type="file" accept="image/*" className="sr-only"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <button className="btn outline sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? 'Import…' : dish.photo ? 'Remplacer la photo' : 'Ajouter une photo'}
          </button>
          {dish.photo && (
            <button className="btn danger sm" onClick={() => setDishPhoto(dish.id, undefined)}>
              Retirer la photo
            </button>
          )}
          <span className="tiny muted">Redimensionnée à 900 px, JPEG.</span>
        </div>
      </div>
      {error && <p className="notice danger">{error}</p>}
    </div>
  )
}

/** Groupes d'options d'un plat : cuisson, accompagnement, suppléments… */
function OptionsEditor({ dish }: { dish: Dish }) {
  const {
    addOptionGroup, updateOptionGroup, removeOptionGroup,
    addOptionChoice, updateOptionChoice, removeOptionChoice,
  } = useStore()
  const [newGroup, setNewGroup] = useState('')
  const [newChoice, setNewChoice] = useState<Record<string, string>>({})

  return (
    <div className="field">
      <span>Options ({dish.options.length})</span>
      <p className="tiny muted" style={{ marginBottom: '.3rem' }}>
        Cuisson, accompagnement, suppléments… Les libellés sont traduits comme le reste de la carte.
      </p>

      {dish.options.map((g) => (
        <div key={g.id} className="editor-row" style={{ marginBottom: '.5rem' }}>
          <div className="row gap-s wrap-flex">
            <input
              className="input" style={{ flex: '1 1 160px', fontWeight: 600 }} value={g.name.source}
              onChange={(e) => updateOptionGroup(dish.id, g.id, { source: e.target.value })}
              aria-label="Nom du groupe d’options"
            />
            <label className="switch">
              <input
                type="checkbox" checked={g.required}
                onChange={(e) => updateOptionGroup(dish.id, g.id, { required: e.target.checked })}
              />
              <span className="track" /><span className="small">Obligatoire</span>
            </label>
            <label className="switch">
              <input
                type="checkbox" checked={g.multiple}
                onChange={(e) => updateOptionGroup(dish.id, g.id, { multiple: e.target.checked })}
              />
              <span className="track" /><span className="small">Choix multiple</span>
            </label>
            <button
              className="btn danger sm"
              onClick={() => { if (confirm(`Supprimer le groupe « ${g.name.source} » ?`)) removeOptionGroup(dish.id, g.id) }}
            >
              Supprimer
            </button>
          </div>

          {g.choices.map((c) => (
            <div key={c.id} className="row gap-s wrap-flex">
              <input
                className="input" style={{ flex: '1 1 140px' }} value={c.label.source}
                onChange={(e) => updateOptionChoice(dish.id, g.id, c.id, { source: e.target.value })}
                aria-label="Libellé du choix"
              />
              <label className="row gap-xs small">
                Supplément
                <input
                  className="input mono" style={{ width: 88 }} type="number" min={0} step="0.5"
                  value={c.priceDelta}
                  onChange={(e) => updateOptionChoice(dish.id, g.id, c.id, { priceDelta: Number(e.target.value) })}
                />
              </label>
              <button
                className="btn ghost sm" title="Supprimer ce choix"
                onClick={() => removeOptionChoice(dish.id, g.id, c.id)}
              >
                ✕
              </button>
            </div>
          ))}

          <div className="row gap-s wrap-flex">
            <input
              className="input" style={{ flex: '1 1 140px' }} placeholder="Nouveau choix (Saignant, Frites…)"
              value={newChoice[g.id] ?? ''}
              onChange={(e) => setNewChoice({ ...newChoice, [g.id]: e.target.value })}
              onKeyDown={(e) => {
                const v = (newChoice[g.id] ?? '').trim()
                if (e.key === 'Enter' && v) { addOptionChoice(dish.id, g.id, v); setNewChoice({ ...newChoice, [g.id]: '' }) }
              }}
            />
            <button
              className="btn outline sm" disabled={!(newChoice[g.id] ?? '').trim()}
              onClick={() => {
                addOptionChoice(dish.id, g.id, newChoice[g.id].trim())
                setNewChoice({ ...newChoice, [g.id]: '' })
              }}
            >
              + Choix
            </button>
          </div>
        </div>
      ))}

      <div className="row gap-s wrap-flex">
        <input
          className="input" style={{ flex: '1 1 160px' }} value={newGroup}
          placeholder="Nouveau groupe (Cuisson, Accompagnement…)"
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newGroup.trim()) { addOptionGroup(dish.id, newGroup.trim()); setNewGroup('') }
          }}
        />
        <button
          className="btn outline sm" disabled={!newGroup.trim()}
          onClick={() => { addOptionGroup(dish.id, newGroup.trim()); setNewGroup('') }}
        >
          + Groupe d’options
        </button>
      </div>
    </div>
  )
}
