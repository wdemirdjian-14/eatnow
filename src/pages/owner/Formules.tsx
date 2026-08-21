import { useStore } from '../../store/store'
import { money } from '../../lib/format'

export function OwnerFormules() {
  const { state, currentOwner, addMenu, updateMenu, removeMenu } = useStore()
  const r = currentOwner()!.restaurant

  const menus = state.menus.filter((m) => m.restaurantId === r.id).sort((a, b) => a.order - b.order)
  const dishes = state.dishes.filter((d) => d.restaurantId === r.id)
  const cats = state.categories.filter((c) => c.restaurantId === r.id).sort((a, b) => a.order - b.order)

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Formules & menus</h2>
          <p>Composez des formules à prix fixe à partir des plats de votre carte.</p>
        </div>
        <span className="spacer" />
        <button className="btn" onClick={() => addMenu(r.id)}>+ Nouvelle formule</button>
      </div>

      {menus.length === 0 && <p className="empty">Aucune formule pour l’instant.</p>}

      {menus.map((m) => (
        <section key={m.id} className="card pad stack gap-s">
          <div className="row gap-s wrap-flex">
            <input
              className="input" style={{ flex: '1 1 220px', fontWeight: 700 }} value={m.name.source}
              onChange={(e) => updateMenu(m.id, { nameSource: e.target.value })}
              aria-label="Nom de la formule"
            />
            <label className="row gap-xs small">
              Prix
              <input
                className="input mono" style={{ width: 100 }} type="number" min={0} step="0.5"
                value={m.price} onChange={(e) => updateMenu(m.id, { price: Number(e.target.value) })}
              />
            </label>
            <button
              className="btn danger sm"
              onClick={() => { if (confirm(`Supprimer « ${m.name.source} » ?`)) removeMenu(m.id) }}
            >
              Supprimer
            </button>
          </div>

          <label className="field">
            <span>Description</span>
            <textarea
              className="textarea" value={m.description.source}
              onChange={(e) => updateMenu(m.id, { descSource: e.target.value })}
            />
          </label>

          <div className="field">
            <span>Plats inclus ({m.dishIds.length})</span>
            <div className="stack gap-xs">
              {cats.map((c) => {
                const list = dishes.filter((d) => d.categoryId === c.id)
                if (!list.length) return null
                return (
                  <div key={c.id} className="row gap-xs wrap-flex">
                    <span className="tiny muted" style={{ minWidth: 110 }}>{c.name.source}</span>
                    {list.map((d) => (
                      <button
                        key={d.id} className="chip sm" aria-pressed={m.dishIds.includes(d.id)}
                        onClick={() => updateMenu(m.id, {
                          dishIds: m.dishIds.includes(d.id)
                            ? m.dishIds.filter((x) => x !== d.id)
                            : [...m.dishIds, d.id],
                        })}
                      >
                        {d.name.source} · {money(d.price)}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ))}
    </>
  )
}
