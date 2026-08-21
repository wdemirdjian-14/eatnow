import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { activeLangs, useStore } from '../../store/store'
import { LANG_META, type I18nField, type Lang } from '../../types'
import { autoTranslate, originOf } from '../../lib/translate'

type Entity = 'restaurant-desc' | 'category' | 'dish-name' | 'dish-desc' | 'menu-name' | 'menu-desc'

interface Line {
  key: string
  entity: Entity
  id: string
  group: string
  label: string
  field: I18nField
}

export function OwnerTranslations() {
  const { state, currentOwner, setManual, retranslate } = useStore()
  const r = currentOwner()!.restaurant
  const langs = activeLangs(r).filter((l) => l !== r.sourceLang)

  const [target, setTarget] = useState<Lang>(langs[0] ?? 'en')
  const [onlyDoubt, setOnlyDoubt] = useState(false)

  const lines: Line[] = useMemo(() => {
    const out: Line[] = []
    out.push({
      key: `rd-${r.id}`, entity: 'restaurant-desc', id: r.id,
      group: 'Fiche', label: 'Description du restaurant', field: r.description,
    })
    for (const c of state.categories.filter((c) => c.restaurantId === r.id).sort((a, b) => a.order - b.order)) {
      out.push({ key: `c-${c.id}`, entity: 'category', id: c.id, group: 'Catégories', label: c.name.source, field: c.name })
    }
    for (const d of state.dishes.filter((d) => d.restaurantId === r.id).sort((a, b) => a.order - b.order)) {
      out.push({ key: `dn-${d.id}`, entity: 'dish-name', id: d.id, group: 'Plats', label: d.name.source, field: d.name })
      if (d.description.source) {
        out.push({ key: `dd-${d.id}`, entity: 'dish-desc', id: d.id, group: 'Plats', label: `↳ description · ${d.name.source}`, field: d.description })
      }
    }
    for (const m of state.menus.filter((m) => m.restaurantId === r.id)) {
      out.push({ key: `mn-${m.id}`, entity: 'menu-name', id: m.id, group: 'Formules', label: m.name.source, field: m.name })
      if (m.description.source) {
        out.push({ key: `md-${m.id}`, entity: 'menu-desc', id: m.id, group: 'Formules', label: `↳ description · ${m.name.source}`, field: m.description })
      }
    }
    return out
  }, [state, r])

  const scored = lines.map((l) => ({
    ...l,
    origin: originOf(l.field, target, r.sourceLang),
    confidence: autoTranslate(l.field.source, r.sourceLang, target).confidence,
  }))
  const visible = onlyDoubt
    ? scored.filter((l) => l.origin !== 'manuel' && l.confidence < 0.7)
    : scored
  const doubtful = scored.filter((l) => l.origin !== 'manuel' && l.confidence < 0.7).length
  const forced = scored.filter((l) => l.origin === 'manuel').length

  if (langs.length === 0) {
    return (
      <>
        <div className="page-head"><div><h2>Traductions</h2></div></div>
        <p className="notice warn">
          Aucune langue cible activée. <Link to="/pro/langues" style={{ fontWeight: 700 }}>Ajoutez une langue</Link> pour
          commencer à traduire votre carte.
        </p>
      </>
    )
  }

  let lastGroup = ''

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Traductions</h2>
          <p>
            Tout est traduit automatiquement. Vous pouvez forcer n’importe quelle traduction :
            votre texte prime alors sur la machine.
          </p>
        </div>
        <span className="spacer" />
        <button className="btn outline" onClick={() => retranslate(r.id)}>♻️ Tout régénérer</button>
      </div>

      <section className="card pad stack gap-s">
        <div className="row gap-xs wrap-flex">
          <span className="tiny muted" style={{ minWidth: 90 }}>Langue cible</span>
          {langs.map((l) => (
            <button key={l} className="chip sm" aria-pressed={target === l} onClick={() => setTarget(l)}>
              {LANG_META[l].flag} {LANG_META[l].native}
            </button>
          ))}
        </div>
        <div className="row gap-m wrap-flex">
          <label className="switch">
            <input type="checkbox" checked={onlyDoubt} onChange={(e) => setOnlyDoubt(e.target.checked)} />
            <span className="track" />
            <span className="small">Afficher seulement les traductions à vérifier</span>
          </label>
          <span className="spacer" />
          <span className="badge coral">⚠️ {doubtful} à vérifier</span>
          <span className="badge mint">✍️ {forced} forcées</span>
        </div>
      </section>

      <section className="card pad stack gap-xs">
        <div className="row gap-s">
          <h3 style={{ flex: 1 }}>
            {LANG_META[r.sourceLang].flag} {LANG_META[r.sourceLang].native}
            {' → '}
            {LANG_META[target].flag} {LANG_META[target].native}
          </h3>
          <span className="small muted">{visible.length} texte(s)</span>
        </div>

        {visible.length === 0 && <p className="empty">Rien à vérifier dans cette langue. 🎉</p>}

        {visible.map((l) => {
          const header = l.group !== lastGroup ? l.group : null
          lastGroup = l.group
          const auto = l.field.auto[target] ?? ''
          const manual = l.field.manual[target] ?? ''
          return (
            <div key={l.key}>
              {header && (
                <p className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '.08em', marginTop: '.9rem' }}>
                  {header}
                </p>
              )}
              <div className="trans-row">
                <div className="stack gap-xs">
                  {l.origin === 'manuel' && <span className="badge mint">Forcé</span>}
                  {l.origin === 'auto' && l.confidence < 0.7 && <span className="badge coral">À vérifier</span>}
                  {l.origin === 'auto' && l.confidence >= 0.7 && <span className="badge">Auto</span>}
                  {l.origin === 'manquant' && <span className="badge grey">Manquant</span>}
                  <span className="tiny muted mono">{Math.round(l.confidence * 100)}%</span>
                </div>
                <div className="stack gap-xs" style={{ minWidth: 0 }}>
                  <span className="small"><b>{l.label}</b></span>
                  <span className="small muted" dir={LANG_META[target].rtl ? 'rtl' : undefined}>
                    🤖 {auto || '—'}
                  </span>
                  <input
                    className="input"
                    dir={LANG_META[target].rtl ? 'rtl' : undefined}
                    placeholder="Forcer une traduction (laisser vide = automatique)"
                    value={manual}
                    onChange={(e) => setManual(l.entity, l.id, target, e.target.value)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </section>
    </>
  )
}
