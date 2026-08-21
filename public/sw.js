/**
 * Service worker d'Eatnow.
 *
 * Objectif : rendre l'application utilisable hors connexion — un client
 * attablé dans un restaurant à mauvaise réception doit pouvoir consulter la
 * carte qu'il vient d'ouvrir.
 *
 * Stratégies :
 *  - navigations (index.html) : réseau d'abord, cache en repli. Une nouvelle
 *    version déployée est ainsi prise en compte dès que le réseau répond.
 *  - assets hachés (/assets/…) : cache d'abord, ils sont immuables.
 *  - polices Google : cache d'abord, rafraîchies en arrière-plan.
 *
 * `__APP_VERSION__` est remplacé au build par scripts/gen-sw.mjs : changer de
 * version invalide les anciens caches.
 */
const VERSION = '__APP_VERSION__'
const SHELL_CACHE = `eatnow-shell-${VERSION}`
const ASSET_CACHE = `eatnow-assets-${VERSION}`
const FONT_CACHE = 'eatnow-fonts'

/** Ressources indispensables au premier affichage hors connexion. */
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './logo.svg',
  './icon-192.png',
  './icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // `reload` évite de recopier dans le cache une réponse HTTP déjà périmée.
      .then((cache) => cache.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('eatnow-') && k !== SHELL_CACHE && k !== ASSET_CACHE && k !== FONT_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

/** Le client demande l'activation immédiate d'une version en attente. */
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const fresh = await fetch(request)
    if (fresh && fresh.ok) cache.put(request, fresh.clone())
    return fresh
  } catch {
    const cached = (await cache.match(request)) || (await cache.match('./index.html'))
    if (cached) return cached
    throw new Error('hors connexion et absent du cache')
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const fresh = await fetch(request)
  // Les réponses opaques (polices cross-origin) sont conservées telles quelles.
  if (fresh && (fresh.ok || fresh.type === 'opaque')) cache.put(request, fresh.clone())
  return fresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Polices Google : cache d'abord, elles ne changent jamais.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE).catch(() => fetch(request)))
    return
  }

  if (url.origin !== self.location.origin) return

  // Toujours aller au réseau pour connaître la version déployée.
  if (url.pathname.endsWith('/version.json')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE))
    return
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE))
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => cached)),
  )
})
