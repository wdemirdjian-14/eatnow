# Journal des versions

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
[versionnage sémantique](https://semver.org/lang/fr/).

## [0.6.0] — 2026-08-22

Lecture des QR codes par le client.

### Ajouté

- **Scanner de QR code** — un bouton dans la barre de recherche ouvre la
  caméra en plein écran. Le client vise le code posé sur la table et la carte
  du restaurant s'ouvre, sans rien valider (moins de 300 ms dans les essais).
  Viseur, flash quand l'appareil en dispose, et fermeture immédiate qui coupe
  le flux : la diode ne reste jamais allumée.
- **Deux moteurs de décodage** — `BarcodeDetector` natif quand le navigateur
  le propose (Chrome Android), jsQR en repli pour iOS Safari et les
  navigateurs de bureau. Analyse bridée à dix images par seconde et réduite à
  640 px de côté : la batterie du téléphone n'y passe pas.
- **Repli par la galerie** — si la caméra est refusée ou absente, une photo du
  QR code est décodée de la même façon. Les refus d'accès sont expliqués en
  français plutôt que par le nom d'une exception.

### Sécurité

- **Aucune ouverture automatique d'une adresse extérieure.** Seul un lien qui
  désigne une carte de l'annuaire — ou une adresse de ce même site — provoque
  une navigation, et le slug lu sert à naviguer à l'intérieur de
  l'application. Tout autre contenu est affiché tel quel et attend un geste du
  client, le lien s'ouvrant alors en `noopener noreferrer`. Un autocollant
  malveillant collé par-dessus celui du restaurant ne peut donc pas emmener le
  convive ailleurs à son insu.
- Le vhost autorise désormais la caméra (`Permissions-Policy: camera=(self)`)
  et les flux `blob:` (`media-src`). Sans ces deux réglages, le navigateur
  refuse l'accès à la caméra sans même afficher de demande.

### Vérifié

- Trois campagnes dans un Chromium réel avec une caméra simulée : code Eatnow
  (carte ouverte automatiquement), code étranger (affiché, jamais suivi),
  image sans code (caméra ouverte, viseur, fermeture propre) — 22 contrôles
  verts, aucune erreur console.
- 33/33 tests d'API, 12/12 tests bout en bout.

## [0.5.0] — 2026-08-21

Carte géographique, refonte de l'interface publique, création de comptes.

### Ajouté

- **Carte interactive** — plan OpenStreetMap via Leaflet, sans clé d'API.
  Les restaurants y apparaissent en pastilles numérotées qui reprennent le rang
  des vignettes de la liste : une pastille se retrouve d'un coup d'œil.
  Déplacer la carte propose de **relancer la recherche sur la zone affichée**,
  ce qui remplace le filtre de distance ; un bouton revient au rayon.
  La carte est affichée en bandeau au-dessus des résultats, ou en plein écran.
- **Barre d'onglets** en bas sur mobile — Accueil, Carte, Favoris, Compte —
  là où le pouce tombe. Absente des espaces restaurateur et administrateur,
  qui ont leur propre navigation.
- **Favoris**, conservés sur l'appareil du client : un convive n'a pas de
  compte, et ils restent consultables hors connexion.
- **Photo de couverture** par restaurant, importée depuis sa fiche, affichée
  dans les résultats et en haut de sa page.
- **Vignettes refondues** — photo, note, cuisine, prix, adresse, et les
  **drapeaux des langues publiées**, qui disent d'un regard dans quelles
  langues la carte est lisible.
- **Fiche restaurant restructurée** — barre de titre collante avec retour et
  favori, contacts en accès direct, photo de couverture, pastille « La carte »,
  langues disponibles, informations pratiques et plan de situation.
- **Création d'un restaurant et de son accès depuis la console** — les deux
  sont créés ensemble, dans une transaction, avec des catégories de départ pour
  que la carte ne soit pas vide. Identifiant unique vérifié, mot de passe d'au
  moins 8 caractères, générateur de mot de passe lisible. L'action est refusée
  pendant un endossement : un administrateur agissant au nom d'un restaurateur
  ne doit pas créer de compte par inadvertance.

### Modifié

- L'accueil va droit au but sur mobile : titre court, recherche, puis la carte
  et les résultats sans avoir à faire défiler. Le discours reste sur grand
  écran, les filtres se replient derrière un bouton, et le tri et le rayon
  sont accessibles en permanence.

## [0.4.1] — 2026-08-21

Corrections remontées par le premier déploiement réel.

### Corrigé

- **En-tête inatteignable en plein écran sur mobile.** Une fois l'application
  installée, `viewport-fit=cover` étend la page sous la barre d'état : l'en-tête
  passait dessous, emportant avec lui le sélecteur de langue. Seule la zone de
  sécurité basse était gérée ; la zone haute l'est désormais, et tous les
  éléments collants en tiennent compte.
- **Conflit de port avec une autre application.** Le port 3001, très souvent
  déjà occupé sur un serveur mutualisé, recevait les requêtes d'Eatnow et
  répondait 404 — d'où l'échec de connexion, sans rapport avec le mot de passe.
  Le port par défaut devient 3011, il est piloté par une seule variable qui
  alimente à la fois `api.env` et le vhost nginx, et `setup-server.sh` refuse
  de continuer si un autre programme l'occupe.
- **Panne silencieuse impossible à diagnostiquer.** Après redémarrage,
  `deploy-local.sh` interroge l'API sur son port et vérifie que la réponse
  vient bien d'Eatnow ; sinon il s'arrête en nommant le programme fautif.
- `/api/version` annonçait « dev » : la version est désormais lue dans
  `package.json`, systemd lançant `node` sans passer par npm.

### Modifié

- Le bandeau de nouvelle version s'affiche sous l'en-tête, qui reste le premier
  élément de la page et donc le seul à réserver la zone de sécurité haute.

## [0.4.0] — 2026-08-21

Backend : données partagées, comptes réels, mots de passe hors du navigateur.

### Ajouté

- **API Node** (`server/`) — Fastify et SQLite en mode WAL, migrations versionnées
  appliquées à l'ouverture de la base. Un seul fichier de données : sauvegarde
  et restauration triviales sur un VPS.
- **Authentification réelle** — mots de passe hachés par scrypt, sessions
  serveur révocables, cookie `httpOnly` + `SameSite=Strict` (aucun jeton
  manipulé en JavaScript, donc rien à voler via XSS), en-tête client exigé sur
  les écritures comme seconde barrière anti-CSRF.
- **Données partagées entre appareils** — une carte modifiée sur un ordinateur
  apparaît immédiatement sur un téléphone. C'était la limite majeure du MVP.
- **Cloisonnement** — un restaurateur ne peut lire ni écrire la fiche, la carte
  ou les photos d'un autre. Vérifié par la suite de tests.
- **Endossement côté serveur** — l'administrateur agit au nom d'un
  restaurateur via sa session ; pendant l'endossement son périmètre de données
  se réduit à celui du restaurateur endossé.
- **Tarifs faisant autorité côté serveur** — le prix d'une langue n'est plus
  envoyé par le client, qui ne peut donc plus s'en offrir une à zéro euro.
- **Écriture différée et reprise** — les modifications partent après 700 ms de
  calme ; hors connexion elles restent en attente, un indicateur les signale,
  et elles sont renvoyées dès le retour du réseau.
- **Photos sur disque** — les images ne transitent plus dans la carte : le
  serveur les écrit dans `/var/lib/eatnow/uploads`, nginx les sert directement.
- **Déploiement** — service systemd durci, relais nginx `/api` et `/uploads`,
  configuration secrète dans `/etc/eatnow/api.env`, préparation et déploiement
  automatisés.
- **Tests** — 33 tests d'intégration de l'API (`server/test/api.sh`) et un
  parcours navigateur complet couvrant deux appareils, le mode hors connexion
  et l'absence de mot de passe dans le bundle.

### Modifié

- Le client ne contient plus aucun mot de passe : l'écran de connexion ne
  propose plus de comptes pré-remplis et la liste d'administrateurs a disparu
  du code livré.
- « Réinitialiser la démo » est retiré : les données appartiennent au serveur.

### Corrigé

- **Endossement invisible** : l'API décrivant le compte endossé (de rôle
  `owner`), le client testait le rôle avant l'endossement et faisait passer
  l'administrateur pour un simple restaurateur — sans bandeau ni retour vers
  la console.
- **Page blanche au premier chargement d'un lien direct** : le service worker
  prenait le contrôle et déclenchait un rechargement complet inutile.
- **Écran blanc sur `/admin` et `/pro`** : des hooks React placés après une
  redirection anticipée, jusque-là sans effet, cassaient le rendu dès lors que
  la session arrive du serveur de façon asynchrone.
- Le tout premier démarrage sur une base vide échouait : les modules
  préparaient leurs requêtes SQL avant l'exécution des migrations.

## [0.3.0] — 2026-08-21

Application installable, arménien, QR code et usage hors connexion.

### Ajouté

- **Installation sur l'écran d'accueil (PWA)** — manifeste, icônes 192/512 et
  icône « maskable » respectant la zone de sécurité Android, icône Apple,
  affichage plein écran, raccourcis vers la recherche et l'espace restaurateur.
  Une invite d'installation apparaît sur Chromium ; sur iOS, la marche à suivre
  par le menu Partager est expliquée, Safari n'exposant pas d'invite native.
- **Fonctionnement hors connexion** — un service worker met en cache la coque
  applicative et les ressources. Une fois la carte d'un restaurant ouverte,
  elle reste consultable sans réseau, ce qui est le cas courant en salle. Un
  bandeau signale la perte de connexion et un badge indique, en ligne, que la
  carte restera disponible.
- **Mise à jour signalée** — quand une nouvelle version est déployée, un
  bandeau propose de l'appliquer sans attendre la fermeture des onglets.
- **Arménien** — 14ᵉ langue de l'application : interface, glossaire de
  traduction (179 entrées) et invitation du QR code.
- **QR code du restaurateur** — page dédiée dans l'espace restaurateur :
  aperçu, lien copiable, export SVG et PNG, et chevalet de table imprimable
  portant l'invitation à scanner dans les langues publiées par le restaurant.
  Correction d'erreur de niveau H, pour rester lisible malgré la pastille
  centrale et une impression médiocre.
- **Comptes administrateurs multiples** — connexion par identifiant libre et
  non plus par adresse e-mail. Le mot de passe du compte principal peut être
  défini au build via `VITE_ADMIN_PASSWORD` plutôt qu'inscrit dans le dépôt.

### Corrigé

- Le service worker ne s'enregistrait jamais : l'écouteur de l'évènement
  `load` était posé depuis un effet React, donc après le déclenchement de
  l'évènement.
- Le vhost nginx servait `sw.js` avec le cache par défaut, ce qui aurait figé
  l'application sur une version.

## [0.2.0] — 2026-08-21

Refonte mobile-first et carte interactive.

### Ajouté

- **Mobile first** — feuille de styles reconstruite en partant du mobile
  (media queries à 640 px puis 1024 px) : cibles tactiles de 44 px minimum,
  champs à 16 px pour éviter le zoom iOS, prise en compte de `safe-area-inset`,
  navigations horizontales défilantes, panneaux glissants depuis le bas.
- **Carte « papier » interactive** — la carte est présentée comme une carte de
  restaurant : papier crème, titres en Fraunces, filets pointillés, catégories
  en onglets collants.
- **Traduction instantanée au toucher** — un appui sur un plat déplie sous
  celui-ci le texte dans la langue d'origine (nom et description), pour lever
  un doute ou montrer le plat au serveur.
- **Sélection de plats** — bouton « + » sur chaque plat, barre de sélection
  flottante avec compteur et total, récapitulatif modifiable (quantités).
- **Commande bilingue** — la sélection validée s'affiche dans les deux langues
  côte à côte, celle du client et celle de la carte, à montrer au serveur.
- **Options de plats** — le restaurateur crée des groupes d'options (cuisson,
  accompagnement, suppléments…), obligatoires ou non, à choix unique ou
  multiple, avec supplément de prix. Les libellés sont traduits comme le reste
  de la carte et apparaissent dans la commande bilingue.
- **Photos de plats** — import facultatif par le restaurateur, redimensionné à
  900 px et recompressé en JPEG côté navigateur.
- **Endossement de compte par l'administrateur** — depuis la console, un
  administrateur ouvre l'espace d'un restaurateur, voit et modifie sa fiche et
  sa carte en son nom, avec un bandeau permanent rappelant le contexte.
- **Déploiement Ionos** — vhost nginx pour `eatnow.walautao.fr` (fallback SPA,
  cache des assets hachés, en-têtes de sécurité, CSP), script de déploiement
  atomique par versions avec retour arrière, workflow GitHub Actions déclenché
  par tag, et `version.json` exposant la version en ligne.

### Corrigé

- La navigation de l'en-tête débordait sous 640 px et décalait toute la page,
  ce qui affichait les panneaux partiellement hors écran.
- L'utilitaire `.hide-mobile` était sans effet sur les boutons (spécificité
  égale à `.btn`, déclaré avant).
- Les onglets de catégories se superposaient aux titres de section (décalage
  collant calculé sur une hauteur figée).
- Les notifications transitoires interceptaient les appuis et pouvaient
  bloquer le bouton de validation d'un panneau.
- Le moteur de traduction rendait les entrées du glossaire en majuscule au
  milieu d'une phrase, et n'appariait pas les clés contenant une apostrophe
  typographique ou la ligature « œ ».
- La carte d'identité du compte n'était pas repliée sous 860 px dans le
  back-office et déformait la navigation.

## [0.1.0] — 2026-08-21

Première version MVP.

### Ajouté

- **Site public** — recherche de restaurants par géolocalisation (haversine,
  positions de repli si la géoloc est refusée), filtres par type de cuisine,
  tranche de prix, rayon, et case à cocher « menu traduit (inscrit à Eatnow) » ;
  tri par distance, note ou prix.
- **Fiche restaurant publique** — carte organisée en catégories, plat du jour,
  promotions, formules à prix fixe, prix localisés, 14 allergènes réglementaires
  (UE 1169/2011), mentions de régime, sélecteur de langue de lecture, support RTL.
- **Espace restaurateur** — tableau de bord avec indicateurs et check-list de
  qualité, édition de la fiche, éditeur de carte (catégories ordonnables, plats,
  prix, promos, allergènes, disponibilité), formules, publication en un clic.
- **Traductions** — traduction automatique de toute la carte, forçage manuel par
  langue avec priorité sur la machine, indice de confiance et filtre « à vérifier »,
  régénération à la demande.
- **Achat de langues** — 3 plans, tarif à la langue selon le plan, activation
  immédiate avec traduction de la carte, historique de facturation.
- **Console d'administration** — vue globale des restaurants inscrits, contenu de
  leurs cartes langue par langue, couverture des traductions, conformité
  allergènes, revenu mensuel récurrent, publication/dépublication.
- **Identité** — design system bleu canard, logo « assiette et couverts » avec
  « bonjour » en spirale dans toutes les langues, généré par script.
- **CI/CD** — typecheck et build sur chaque push, déploiement GitHub Pages et
  Release GitHub sur chaque tag `vX.Y.Z`.

[0.5.0]: https://github.com/wdemirdjian-14/eatnow/releases/tag/v0.5.0
[0.4.1]: https://github.com/wdemirdjian-14/eatnow/releases/tag/v0.4.1
[0.4.0]: https://github.com/wdemirdjian-14/eatnow/releases/tag/v0.4.0
[0.3.0]: https://github.com/wdemirdjian-14/eatnow/releases/tag/v0.3.0
[0.2.0]: https://github.com/wdemirdjian-14/eatnow/releases/tag/v0.2.0
[0.1.0]: https://github.com/wdemirdjian-14/eatnow/releases/tag/v0.1.0
