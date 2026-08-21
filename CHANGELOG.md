# Journal des versions

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
[versionnage sémantique](https://semver.org/lang/fr/).

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

[0.1.0]: https://github.com/wdemirdjian-14/eatnow/releases/tag/v0.1.0
