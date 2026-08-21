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
| **Public** | le client | Recherche par géolocalisation, filtres (type de cuisine, tranche de prix, **case « menu traduit »**), consultation de la carte dans sa langue |
| **Restaurateur** | le client payant | Fiche restaurant, carte (catégories, plats, plat du jour, promos), prix, allergènes, relecture et **forçage des traductions**, **achat de langues en ligne** |
| **Administrateur** | Eatnow | Vue globale des restaurants inscrits, contenu de leurs cartes, couverture des traductions, conformité allergènes, revenu récurrent |

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

## Architecture

```
src/
├── types.ts              Modèle de données (langues, allergènes, cuisines, entités)
├── data/seed.ts          7 restaurants de démonstration, 43 plats, formules
├── store/store.tsx       État applicatif + persistance localStorage + actions
├── lib/
│   ├── translate.ts      Moteur de traduction + résolution manuel > auto > source
│   ├── geo.ts            Haversine, géolocalisation, positions de repli
│   └── format.ts         Prix (Intl), slugs, identifiants
├── i18n/ui.ts            Textes de l'interface
├── components/           Logo, header, footer, cartes restaurant, allergènes
├── pages/                Public · owner/ (back-office) · admin/ (console)
└── styles/app.css        Design system « bleu canard »
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

**Prochaines étapes** — API et base de données, authentification réelle,
paiement (Stripe), traduction via DeepL, photos de plats, carte interactive,
QR code de table, avis clients.
