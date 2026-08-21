import { useStore } from '../store/store'

/**
 * Retour visuel sur l'enregistrement des modifications.
 *
 * Une application qui écrit sur un serveur doit dire quand elle n'y arrive
 * pas : sans cela, un restaurateur croit sa carte à jour alors qu'elle ne
 * l'est pas.
 */
export function SyncStatus() {
  const { syncStatus, session } = useStore()

  // Sans session, aucune écriture n'est possible : rien à signaler.
  if (session.role === 'guest' || syncStatus.kind === 'idle') return null

  if (syncStatus.kind === 'saving') {
    return <span className="sync-pill saving" title="Enregistrement en cours">💾<span className="hide-mobile"> Enregistrement…</span></span>
  }
  if (syncStatus.kind === 'offline') {
    return (
      <span className="sync-pill offline" title={`${syncStatus.pending} modification(s) en attente de réseau`}>
        📴<span className="hide-mobile"> {syncStatus.pending} en attente</span>
      </span>
    )
  }
  return <span className="sync-pill error" title={syncStatus.message}>⚠️<span className="hide-mobile"> Non enregistré</span></span>
}
