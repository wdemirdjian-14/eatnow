import { useEffect, useState } from 'react'
import { api, ApiError, type CredentialsResult } from '../../lib/api'
import { useStore } from '../../store/store'
import { lastSeen, stamp } from '../../lib/format'
import type { Owner, Restaurant } from '../../types'

/**
 * Gestion de l'accès restaurateur depuis la console.
 *
 * Trois cas : le compte existe et on peut réinitialiser son mot de passe ;
 * il n'existe pas et on le crée ; dans les deux cas le mot de passe n'est
 * affiché qu'une seule fois, parce que le serveur n'en garde qu'une empreinte
 * et ne pourra jamais le relire.
 */
export function OwnerAccess({ r, owner }: { r: Restaurant; owner: Owner | undefined }) {
  const { reload } = useStore()

  const [form, setForm] = useState({ name: '', login: '', password: '' })
  const [sendMail, setSendMail] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CredentialsResult | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [mailReady, setMailReady] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.mailStatus().then((s) => setMailReady(s.configured)).catch(() => setMailReady(false))
  }, [])

  // Un e-mail ne part que si le serveur sait en envoyer.
  useEffect(() => { if (mailReady === false) setSendMail(false) }, [mailReady])

  async function run(fn: () => Promise<CredentialsResult>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fn()
      setResult(res)
      setConfirmReset(false)
      await reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Opération impossible.')
    } finally {
      setBusy(false)
    }
  }

  const create = () => run(() => api.createOwner(r.id, {
    name: form.name.trim(),
    login: form.login.trim(),
    password: form.password.trim() || undefined,
    email: sendMail,
  }))

  const reset = () => run(() => api.resetOwnerPassword(r.id, {
    password: form.password.trim() || undefined,
    email: sendMail,
  }))

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  /** Brouillon prêt à envoyer, quand le serveur ne sait pas poster d'e-mail. */
  function mailto(res: CredentialsResult): string {
    const body = [
      `Bonjour ${owner?.name ?? form.name},`, '',
      `Voici votre accès à l'espace Eatnow de ${r.name} :`, '',
      `Adresse : ${window.location.origin}/#/pro`,
      `Identifiant : ${res.login}`,
      `Mot de passe : ${res.password}`, '',
      `— L'équipe Eatnow`,
    ].join('\n')
    return `mailto:${res.login}?subject=${encodeURIComponent(`Votre accès Eatnow — ${r.name}`)}&body=${encodeURIComponent(body)}`
  }

  return (
    <section className="card pad stack gap-s">
      <div className="row gap-s wrap-flex">
        <h3 style={{ flex: '1 1 auto' }}>Accès et compte</h3>
        <span className={`badge ${r.published ? 'mint' : 'grey'}`}>
          {r.published ? 'carte publiée' : 'carte non publiée'}
        </span>
        <span className="badge grey">plan {r.plan}</span>
      </div>

      {owner ? (
        <dl className="kv">
          <div><dt>Identifiant de connexion</dt><dd className="mono">{owner.email}</dd></div>
          <div><dt>Titulaire</dt><dd>{owner.name}</dd></div>
          <div>
            <dt>Dernière connexion</dt>
            <dd>
              {owner.lastLoginAt
                ? <>{stamp(owner.lastLoginAt)} <span className="muted small">({lastSeen(owner.lastLoginAt)})</span></>
                : <span className="badge coral">jamais connecté</span>}
            </dd>
          </div>
          <div><dt>Compte créé le</dt><dd>{stamp(owner.createdAt)}</dd></div>
          <div><dt>Restaurant inscrit le</dt><dd>{r.createdAt}</dd></div>
          <div><dt>Identifiants techniques</dt><dd className="mono tiny">{r.id} · {r.ownerId} · /{r.slug}</dd></div>
        </dl>
      ) : (
        <p className="notice warn">
          ⚠️ Ce restaurant n’a aucun accès restaurateur : personne ne peut gérer sa carte.
          Créez-en un ci-dessous.
        </p>
      )}

      {/* Le mot de passe n'apparaît qu'une fois, juste après l'opération. */}
      {result && (
        <div className="creds">
          <b>{owner ? 'Mot de passe réinitialisé' : 'Accès créé'}</b>
          <div className="creds__line"><span>Identifiant</span><code>{result.login}</code></div>
          <div className="creds__line"><span>Mot de passe</span><code>{result.password}</code></div>
          <p className="tiny">
            Notez-le maintenant : il ne sera plus jamais affiché, le serveur n’en garde qu’une empreinte.
          </p>
          <div className="row gap-s wrap-flex">
            <button className="btn sm" onClick={() => void copy(`${result.login} / ${result.password}`)}>
              {copied ? '✓ Copié' : 'Copier'}
            </button>
            <a className="btn outline sm" href={mailto(result)}>✉️ Écrire au restaurateur</a>
          </div>
          {result.mail.sent && <p className="tiny" style={{ color: 'var(--teal-700)' }}>✓ E-mail envoyé à {result.login}.</p>}
          {!result.mail.sent && result.mail.reason === 'echec-envoi' && (
            <p className="tiny" style={{ color: 'var(--coral-dark)' }}>
              ⚠️ L’e-mail n’est pas parti ({result.mail.detail}). Transmettez le mot de passe autrement.
            </p>
          )}
        </div>
      )}

      {error && <p className="notice warn">⚠️ {error}</p>}

      {/* Formulaire : création si aucun compte, réinitialisation sinon. */}
      {!owner && (
        <div className="grid-2">
          <label className="field">
            <span>Titulaire</span>
            <input
              className="input" value={form.name} autoComplete="off"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Prénom Nom"
            />
          </label>
          <label className="field">
            <span>Identifiant (e-mail)</span>
            <input
              className="input" type="email" value={form.login} autoComplete="off"
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              placeholder="contact@restaurant.fr"
            />
          </label>
        </div>
      )}

      <label className="field">
        <span>Mot de passe {owner ? 'de remplacement' : ''} (laisser vide pour en générer un)</span>
        <input
          className="input" value={form.password} autoComplete="off"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="généré automatiquement"
        />
      </label>

      <label className="switch">
        <input
          type="checkbox" checked={sendMail} disabled={mailReady === false}
          onChange={(e) => setSendMail(e.target.checked)}
        />
        <span className="track" />
        <span className="small">
          Envoyer les identifiants par e-mail
          {mailReady === false && <span className="muted"> — indisponible : aucun serveur SMTP configuré</span>}
        </span>
      </label>

      <div className="row gap-s wrap-flex">
        {!owner ? (
          <button
            className="btn" disabled={busy || !form.name.trim() || !form.login.trim()}
            onClick={() => void create()}
          >
            {busy ? 'Création…' : 'Créer l’accès'}
          </button>
        ) : confirmReset ? (
          <>
            <span className="small">
              Le mot de passe actuel cessera de fonctionner et les appareils connectés seront déconnectés.
            </span>
            <button className="btn danger" disabled={busy} onClick={() => void reset()}>
              {busy ? 'Réinitialisation…' : 'Confirmer'}
            </button>
            <button className="btn ghost sm" onClick={() => setConfirmReset(false)}>Annuler</button>
          </>
        ) : (
          <button className="btn outline" onClick={() => setConfirmReset(true)}>
            🔑 Réinitialiser le mot de passe
          </button>
        )}
      </div>

      <p className="tiny muted">
        Le mot de passe actuel n’est pas consultable : le serveur n’en garde qu’une empreinte.
        Pour dépanner un restaurateur sans changer son accès, ouvrez son espace.
      </p>
    </section>
  )
}
