import { useState } from 'react'
import { AddressLookup } from '../../components/AddressLookup'
import { useStore } from '../../store/store'
import { CUISINES, CUISINE_LABEL, type Cuisine } from '../../types'
import { priceRangeLabel } from '../../lib/format'
import { Sheet } from '../../components/menu/Sheet'

/** Génère un mot de passe lisible, à transmettre au restaurateur. */
function suggestPassword(): string {
  const mots = ['safran', 'basilic', 'olive', 'citron', 'cannelle', 'thym', 'romarin', 'gingembre']
  const mot = mots[Math.floor(Math.random() * mots.length)]
  return `${mot}-${Math.floor(1000 + Math.random() * 9000)}`
}

/**
 * Création d'un restaurant et de son compte d'accès.
 *
 * Les deux sont créés ensemble : c'est le seul moyen pour l'administrateur
 * d'ouvrir un accès, il n'y a pas d'inscription en autonomie.
 */
export function NewRestaurantForm({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (id: string) => void }) {
  const { createRestaurant } = useStore()

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [phone, setPhone] = useState('')
  const [emoji, setEmoji] = useState('🍽️')
  const [hours, setHours] = useState('')
  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const [priceRange, setPriceRange] = useState(2)
  const [plan, setPlan] = useState('essai')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')

  const [ownerName, setOwnerName] = useState('')
  const [ownerLogin, setOwnerLogin] = useState('')
  const [ownerPassword, setOwnerPassword] = useState(() => suggestPassword())

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (c: Cuisine) =>
    setCuisines((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))

  const valide = name.trim() && ownerName.trim() && ownerLogin.trim() && ownerPassword.length >= 8

  async function submit() {
    setBusy(true)
    setError(null)
    const { error: err, id } = await createRestaurant({
      name: name.trim(), city, address, postalCode, phone, emoji, hours,
      cuisines, priceRange, plan,
      lat: lat.trim() ? Number(lat) : undefined,
      lng: lng.trim() ? Number(lng) : undefined,
      ownerName: ownerName.trim(), ownerLogin: ownerLogin.trim(), ownerPassword,
    })
    setBusy(false)
    if (err) { setError(err); return }
    if (id) onCreated(id)
  }

  return (
    <Sheet title="🏪 Nouveau restaurant" onClose={onClose}>
      <div className="stack gap-m">
        <section className="stack gap-s">
          <h4>Le restaurant</h4>
          <label className="field">
            <span>Nom *</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Le Comptoir Bleu" autoFocus />
          </label>
          {/* La recherche d'adresse renseigne le code postal, la ville et les
              coordonnées d'un coup : sans elles le restaurant est introuvable
              dans la recherche par distance. */}
          <AddressLookup
            value={address}
            onPick={(hit) => {
              setAddress(hit.address)
              if (hit.postalCode) setPostalCode(hit.postalCode)
              if (hit.city) setCity(hit.city)
              setLat(String(hit.lat))
              setLng(String(hit.lng))
            }}
          />
          <div className="grid-2">
            <label className="field">
              <span>Code postal</span>
              <input className="input" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </label>
            <label className="field">
              <span>Ville</span>
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label className="field">
              <span>Téléphone</span>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="field">
              <span>Horaires</span>
              <input className="input" value={hours} onChange={(e) => setHours(e.target.value)}
                placeholder="Mar–Sam · 12h–14h30 · 19h–22h30" />
            </label>
            <label className="field">
              <span>Emoji</span>
              <input className="input" maxLength={4} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
            </label>
            <label className="field">
              <span>Latitude</span>
              <input className="input mono" value={lat} onChange={(e) => setLat(e.target.value)}
                placeholder="48.8566" inputMode="decimal" />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input className="input mono" value={lng} onChange={(e) => setLng(e.target.value)}
                placeholder="2.3522" inputMode="decimal" />
            </label>
          </div>
          <p className="tiny muted">
            {lat && lng
              ? '✓ Coordonnées renseignées : le restaurant apparaîtra au bon endroit sur la carte.'
              : 'Sans coordonnées, le restaurant est placé au centre de Paris et sera mal '
                + 'classé dans la recherche par distance. Choisissez une adresse ci-dessus '
                + 'pour les remplir automatiquement.'}
          </p>

          <div className="field">
            <span>Types de cuisine</span>
            <div className="row gap-xs wrap-flex">
              {CUISINES.map((c) => (
                <button key={c} className="chip sm" aria-pressed={cuisines.includes(c)} onClick={() => toggle(c)}>
                  {CUISINE_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          <div className="row gap-m wrap-flex">
            <div className="field">
              <span>Tranche de prix</span>
              <div className="row gap-xs">
                {[1, 2, 3, 4].map((p) => (
                  <button key={p} className="chip sm mono" aria-pressed={priceRange === p}
                    onClick={() => setPriceRange(p)}>{priceRangeLabel(p)}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Plan</span>
              <div className="row gap-xs">
                {['essai', 'starter', 'pro'].map((p) => (
                  <button key={p} className="chip sm" aria-pressed={plan === p} onClick={() => setPlan(p)}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="stack gap-s" style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
          <h4>L’accès du restaurateur</h4>
          <div className="grid-2">
            <label className="field">
              <span>Nom du contact *</span>
              <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Camille Roussel" />
            </label>
            <label className="field">
              <span>Identifiant (e-mail) *</span>
              <input className="input" type="email" autoCapitalize="none" spellCheck={false}
                value={ownerLogin} onChange={(e) => setOwnerLogin(e.target.value)}
                placeholder="camille@lecomptoirbleu.fr" />
            </label>
          </div>
          <label className="field">
            <span>Mot de passe * (8 caractères minimum)</span>
            <div className="row gap-s">
              <input className="input" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} />
              <button className="btn outline sm" onClick={() => setOwnerPassword(suggestPassword())}>
                🎲 Générer
              </button>
            </div>
            <span className="tiny muted">
              Notez-le : il est haché immédiatement et ne sera plus jamais affiché.
            </span>
          </label>
        </section>

        {error && <p className="notice danger">{error}</p>}

        <div className="sheet__actions row gap-s">
          <button className="btn outline" onClick={onClose} disabled={busy}>Annuler</button>
          <button className="btn lg" style={{ flex: 1 }} disabled={!valide || busy} onClick={() => void submit()}>
            {busy ? 'Création…' : 'Créer le restaurant et son accès'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
