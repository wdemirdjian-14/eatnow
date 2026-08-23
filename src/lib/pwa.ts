import { useCallback, useEffect, useState } from 'react'

/** Évènement Chromium, absent des types DOM standard. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'eatnow.install.dismissed.v1'

/** L'application tourne-t-elle déjà en fenêtre autonome (installée) ? */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // Safari iOS expose son propre indicateur.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/**
 * Pilote l'installation sur l'écran d'accueil.
 *
 * Sur Chromium, `beforeinstallprompt` permet de déclencher l'invite native.
 * Safari ne l'implémente pas : on affiche alors la marche à suivre, que
 * l'utilisateur doit exécuter depuis le menu Partager.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isStandalone())
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault() // sinon Chrome affiche sa propre bannière au hasard
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => { setInstalled(true); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return 'unavailable' as const
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    return outcome
  }, [deferred])

  const dismiss = useCallback(() => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* mode privé */ }
  }, [])

  return {
    /** Invite native disponible (Chromium). */
    canPrompt: !!deferred,
    /** Pas d'invite native mais installation possible à la main (Safari iOS). */
    needsManualSteps: !deferred && isIos() && !installed,
    installed,
    dismissed,
    install,
    dismiss,
  }
}

/**
 * Suit l'état de la connexion. `navigator.onLine` ment parfois (réseau
 * présent mais sans accès), mais les évènements `online`/`offline` suffisent
 * pour prévenir l'utilisateur que la carte affichée vient du cache.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

/** Le service worker contrôle-t-il la page (donc : cache disponible) ? */
export function useOfflineReady(): boolean {
  const [ready, setReady] = useState(() => !!navigator.serviceWorker?.controller)
  useEffect(() => {
    if (ready || !('serviceWorker' in navigator)) return
    const check = () => setReady(!!navigator.serviceWorker.controller)
    navigator.serviceWorker.addEventListener('controllerchange', check)
    // Le contrôleur peut arriver quelques instants après le premier rendu.
    const timer = window.setTimeout(check, 1500)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', check)
      window.clearTimeout(timer)
    }
  }, [ready])
  return ready
}

/**
 * Enregistre le service worker et signale l'arrivée d'une nouvelle version.
 * `onUpdate` reçoit une fonction qui applique la mise à jour et recharge.
 */
export function registerServiceWorker(onUpdate: (apply: () => void) => void): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return

  // L'enregistrement est déclenché depuis un effet React, qui peut s'exécuter
  // après l'évènement `load` : on ne peut donc pas se contenter d'écouter.
  const start = () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        const notify = (worker: ServiceWorker) => {
          onUpdate(() => {
            worker.postMessage('skip-waiting')
          })
        }
        // Une version est déjà prête et attend la fermeture des onglets.
        if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting)

        // Une application installée est reprise, pas rechargée : sans cette
        // vérification au retour au premier plan, elle peut servir un ancien
        // cache pendant des jours sans jamais interroger le serveur.
        const checkForUpdate = () => { if (!document.hidden) void reg.update() }
        document.addEventListener('visibilitychange', checkForUpdate)
        window.addEventListener('focus', checkForUpdate)

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            // `controller` absent = première installation, rien à signaler.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              notify(installing)
            }
          })
        })
      })
      .catch(() => { /* l'application reste utilisable sans cache hors ligne */ })

    // À la toute première visite, le service worker s'active et prend le
    // contrôle : `controllerchange` se déclenche alors qu'il n'y a rien à
    // remplacer. Recharger dans ce cas vide l'écran sans raison — on ne
    // recharge donc que si un contrôleur précédent existait vraiment.
    const hadController = !!navigator.serviceWorker.controller
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return
      reloading = true
      window.location.reload()
    })
  }

  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}
