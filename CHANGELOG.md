# Journal des versions

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
[versionnage sémantique](https://semver.org/lang/fr/).

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

[0.2.0]: https://github.com/wdemirdjian-14/eatnow/releases/tag/v0.2.0
[0.1.0]: https://github.com/wdemirdjian-14/eatnow/releases/tag/v0.1.0
