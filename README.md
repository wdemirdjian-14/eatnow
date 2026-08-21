<div align="center">
  <img src="public/logo.svg" width="120" alt="Eatnow" />
  <h1>Eatnow</h1>
  <p><strong>Tous les restaurants autour de vous — avec leur carte traduite dans votre langue.</strong></p>
</div>

---

## Le produit

Eatnow répertorie les restaurants autour de l'utilisateur et publie **leur carte
traduite** : plats, catégories, formules, prix et allergènes, dans 13 langues.

Trois publics, trois espaces :

| Espace | Qui | Ce qu'il fait |
| --- | --- | --- |
| **Public** | le client | Recherche par géolocalisation, filtres (type de cuisine, tranche de prix, **case « menu traduit »**), carte interactive dans sa langue, sélection de plats et **commande bilingue** |
| **Restaurateur** | le client payant | Fiche restaurant, carte (catégories, plats, plat du jour, promos), **options et photos**, prix, allergènes, relecture et **forçage des traductions**, **achat de langues en ligne** |
| **Administrateur** | Eatnow | Vue globale des restaurants inscrits, contenu de leurs cartes, couverture des traductions, conformité allergènes, revenu récurrent, **endossement d'un compte restaurateur** |

### L'expérience client, sur mobile

L'application est conçue pour le mobile : c'est là qu'un client la sort, à
table, devant une carte qu'il ne comprend pas.

1. Il choisit sa langue dans le bandeau en haut de la carte.
2. La carte s'affiche comme une **carte papier** — papier crème, titres
   sérif, filets pointillés — mais elle est tactile.
3. **Un appui sur un plat déplie dessous le texte d'origine**, pour lever un
   doute ou montrer le plat au serveur.
4. Le **+** met le plat de côté ; si le plat a des options (cuisson,
   accompagnement…), un panneau les propose avant l'ajout.
5. Une **barre flottante** affiche le nombre de plats retenus et le total.
6. À la validation, la commande s'affiche **dans les deux langues côte à
   côte** — celle du client et celle du restaurant — pour être montrée au
   serveur.

Le modèle économique est vendu au restaurateur : un plan mensuel + des langues
supplémentaires facturées à l'unité.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
```

Autres commandes :

```bash
npm run typecheck  # TypeScript strict, aucune émission
npm run build      # tsc -b && vite build -> dist/
npm run preview    # sert le build de production
npm run logo       # régénère public/logo.svg, public/favicon.svg et la spirale
```

### Comptes de démonstration

Mot de passe pour tous : **`eatnow`**

| Rôle | Identifiant |
| --- | --- |
| Administrateur | `admin@eatnow.app` |
| Restaurateur | `camille@lecomptoirbleu.fr` (Le Comptoir Bleu, plan Pro, 6 langues) |
| Restaurateur | `marco@trattoriasole.fr` (Trattoria Sole, plan Starter) |
| Restaurateur | `lea@greenandbowl.fr` (Green & Bowl, essai, carte non publiée) |

Les écrans de connexion proposent ces comptes en un clic.

#### Le compte administrateur

`admin@eatnow.app` donne accès à la console : tous les restaurants inscrits,
le contenu de leurs cartes langue par langue, la couverture des traductions,
la conformité allergènes et le revenu récurrent.

Depuis la console (ou depuis la fiche d'un restaurant), le bouton
**« Ouvrir l'espace »** fait basculer l'administrateur dans l'espace du
restaurateur : il voit exactement ce que voit ce dernier et peut modifier sa
fiche, sa carte, ses prix et ses traductions en son nom. Un bandeau rayé
rappelle en permanence au nom de qui il agit ; « Quitter » revient à la
console. Les modifications sont bien enregistrées sur le compte du
restaurateur.

## Architecture

```
src/
├── types.ts              Modèle de données (langues, allergènes, options, sélection)
├── data/
│   ├── seed.ts           7 restaurants de démonstration, 44 plats, options, formules
│   └── dishArt.ts        Illustrations de démonstration pour le champ photo
├── store/store.tsx       État applicatif + persistance localStorage + actions
├── lib/
│   ├── translate.ts      Moteur de traduction + résolution manuel > auto > source
│   ├── selection.ts      Sélection du client : prix unitaire, options, total
│   ├── photo.ts          Redimensionnement des photos de plats à l'import
│   ├── geo.ts            Haversine, géolocalisation, positions de repli
│   └── format.ts         Prix (Intl), slugs, identifiants
├── i18n/ui.ts            Textes de l'interface
├── components/
│   ├── menu/             Panneau glissant, choix d'options, sélection, commande
│   └── …                 Logo, header, footer, carte restaurant
├── pages/                Public · owner/ (back-office) · admin/ (console)
└── styles/app.css        Design system « bleu canard », mobile first
```

### Le champ multilingue

Chaque texte traduisible est un `I18nField` :

```ts
{ source: 'Tartare de bœuf', auto: { en: 'Beef tartare' }, manual: { en: 'Steak tartare' } }
```

La résolution à l'affichage est toujours **`manual` > `auto` > `source`**. Modifier
le texte source relance la traduction automatique sans jamais écraser un forçage
manuel. Acheter une langue déclenche la traduction de toute la carte.

### Le moteur de traduction

`src/lib/translate.ts` est **un bouchon volontairement remplaçable** : un
glossaire culinaire français → 12 langues, appliqué par segments, qui renvoie
aussi un indice de confiance. C'est cet indice qui alimente le badge
« à vérifier » côté restaurateur.

En production, remplacez `autoTranslate()` par un appel à DeepL ou Google
Translate — le reste de l'application (stockage, forçage manuel, régénération,
facturation par langue) n'a pas besoin de changer.

## Design

Couleur signature : **bleu canard** (`--teal-600 #0E7C86`), accents jaune doré et
corail. Typographies Outfit (titres) et Inter (texte).

Le logo est une assiette bleu canard avec fourchette et couteau, et le mot
« bonjour » écrit **en spirale dans toutes les langues** de l'application. La
spirale est une spirale d'Archimède générée par `scripts/gen-logo.mjs` ; sous
64 px le tracé remplace le texte pour rester lisible jusqu'en favicon.

## Déploiement sur le serveur Ionos (eatnow.walautao.fr)

Le site est servi par nginx depuis `/var/www/eatnow/current`, un lien
symbolique vers la version en cours. Chaque déploiement envoie un dossier
horodaté dans `releases/` puis bascule le lien : la mise en ligne est
atomique et le retour arrière immédiat.

**Préparation du serveur, une seule fois** — voir
[`deploy/serveur-preparation.md`](deploy/serveur-preparation.md) : arborescence,
vhost nginx, certificat TLS via certbot.

**Déploiement manuel depuis votre poste :**

```bash
IONOS_USER=<utilisateur> ./deploy/deploy-ionos.sh
```

**Déploiement automatique par tag** — le workflow
`.github/workflows/deploy-ionos.yml` se déclenche sur chaque tag `vX.Y.Z`.
Il faut d'abord créer trois secrets dans le dépôt GitHub
(*Settings → Secrets and variables → Actions*) : `IONOS_HOST`, `IONOS_USER`
et `IONOS_SSH_KEY`.

La version réellement en ligne est lisible sur
`https://eatnow.walautao.fr/version.json`.

Le vhost fourni ([`deploy/nginx-eatnow.conf`](deploy/nginx-eatnow.conf))
inclut le repli SPA, un cache long sur les assets hachés, un `no-cache` sur
`index.html` (sans quoi une nouvelle version reste invisible pour les
navigateurs déjà venus), la compression et les en-têtes de sécurité.

## Déploiement par version

Chaque version est un tag Git `vX.Y.Z` :

```bash
./scripts/release.sh 0.2.0
git push -u origin <branche> && git push origin v0.2.0
```

Le tag déclenche `.github/workflows/release.yml`, qui :

1. vérifie que `package.json` correspond au tag ;
2. typecheck puis build avec `BASE_PATH=/<repo>/` ;
3. déploie sur **GitHub Pages** ;
4. publie une **Release GitHub** avec l'archive `eatnow-vX.Y.Z.tar.gz`.

`.github/workflows/ci.yml` typecheck et build à chaque push et chaque PR.

> Activez Pages une fois pour toutes : *Settings → Pages → Source : GitHub Actions*.

## Périmètre du MVP

**Implémenté** — recherche géolocalisée et filtres, fiche restaurant publique
multilingue, carte par catégories, plat du jour, promos, formules, 14 allergènes
réglementaires, back-office restaurateur complet, forçage des traductions, achat
de langues, console d'administration, CI/CD versionnée.

**Volontairement bouchonné** — persistance dans le `localStorage` du navigateur
(pas de backend), authentification en clair côté client, paiement simulé,
traduction par glossaire.

> Conséquence directe de l'absence de backend : **les données ne sont pas
> partagées entre appareils**. Une carte modifiée sur un ordinateur n'apparaît
> pas modifiée sur un téléphone, et « Réinitialiser la démo » remet les données
> de départ. C'est le premier chantier à ouvrir pour une mise en production.

**Prochaines étapes** — API et base de données (prérequis au partage entre
appareils), authentification réelle, paiement (Stripe), traduction via DeepL,
carte interactive géographique, QR code de table, envoi de la commande en
cuisine, avis clients.
