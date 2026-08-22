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

### Trouver un restaurant

La recherche combine trois entrées : la **géolocalisation**, les **filtres**
(type de cuisine, tranche de prix, case « menu traduit ») et la **carte**.

La carte s'affiche en bandeau au-dessus des résultats, avec des pastilles
numérotées qui reprennent le rang des vignettes — une pastille renvoie à une
fiche sans ambiguïté. Déplacer ou zoomer la carte propose de **relancer la
recherche sur la zone affichée**, ce qui remplace alors le filtre de distance.

Le fond de plan vient d'OpenStreetMap via Leaflet : aucune clé d'API, aucun
compte à ouvrir. Les tuiles nécessitent le réseau ; hors connexion la liste
reste consultable, la carte non.

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

## Tester l'envoi d'e-mails depuis le serveur

Quand un e-mail ne part pas, la cause est presque toujours la configuration,
pas le code. Cette commande la lit et la met à l'épreuve sans passer par
l'application :

```bash
cd /var/www/eatnow/api

# Connexion et authentification seulement, aucun message envoyé
sudo -u www-data node dist/cli/mail-test.js

# Envoi réel à une adresse
sudo -u www-data node dist/cli/mail-test.js vous@exemple.fr
```

Elle lit `/etc/eatnow/api.env` elle-même, d'où le `sudo -u www-data` : le
fichier n'est lisible que par le compte du service. Passer par le shell
(`env $(grep …)`) échouerait deux fois — la substitution s'exécute avec les
droits de l'appelant, et `source` casserait sur
`EATNOW_SMTP_FROM=Eatnow <no-reply@…>`, où bash prend le `<` pour une
redirection.

Elle affiche d'abord les réglages effectivement chargés — hôte, port, compte,
présence d'un mot de passe, expéditeur — ce qui écarte d'emblée le piège le
plus courant : un fichier correct que le service n'a jamais relu. En cas
d'échec, le message du serveur SMTP est repris tel quel, accompagné des
causes correspondantes.

Deux options utiles : `--env <chemin>` pour un autre fichier, `--no-env` pour
n'utiliser que l'environnement déjà présent.

## Architecture d'ensemble

```
Navigateur ──► nginx ─┬─► /            fichiers statiques (client React)
                      ├─► /api/        service Node (Fastify) ──► SQLite
                      └─► /uploads/    photos de plats sur disque
```

Le client et l'API partagent la même origine : le cookie de session reste
`SameSite=Strict` et aucune configuration CORS n'est nécessaire.

## Démarrer

Deux processus : l'API et le client.

```bash
# 1. API
cd server
npm install
EATNOW_ADMIN_PASSWORD=choisissez-en-un npm run seed   # données de démonstration
EATNOW_ADMIN_PASSWORD=choisissez-en-un EATNOW_SECURE_COOKIES=false npm run dev

# 2. Client, dans un autre terminal
npm install
npm run dev        # http://localhost:5173, /api est relayé vers le port 3001
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

Il est créé au tout premier démarrage de l'API, à partir de
`EATNOW_ADMIN_LOGIN` et `EATNOW_ADMIN_PASSWORD` définis dans
`/etc/eatnow/api.env`. Sans mot de passe défini, **aucun compte n'est créé** :
mieux vaut un serveur sans administrateur qu'un administrateur au mot de passe
prévisible.

Les mots de passe sont hachés par **scrypt** et ne quittent jamais le serveur.
Le bundle JavaScript n'en contient aucun — c'est vérifié par les tests.

Depuis la console, **« + Nouveau restaurant »** crée en une fois la fiche du
restaurant et l'accès de son restaurateur, avec des catégories de départ. Il
n'y a pas d'inscription en autonomie : c'est le seul chemin d'entrée.

L'administrateur donne accès à la console : tous les restaurants inscrits,
le contenu de leurs cartes langue par langue, la couverture des traductions,
la conformité allergènes et le revenu récurrent.

Depuis la console (ou depuis la fiche d'un restaurant), le bouton
**« Ouvrir l'espace »** fait basculer l'administrateur dans l'espace du
restaurateur : il voit exactement ce que voit ce dernier et peut modifier sa
fiche, sa carte, ses prix et ses traductions en son nom. Un bandeau rayé
rappelle en permanence au nom de qui il agit ; « Quitter » revient à la
console. Les modifications sont bien enregistrées sur le compte du
restaurateur.

## Installation sur le téléphone

Eatnow est une **application web installable** (PWA).

- **Android / Chrome** — une invite « Installer Eatnow » apparaît sur la page
  d'accueil ; sinon, menu ⋮ → *Installer l'application*.
- **iOS / Safari** — bouton *Partager* → *Sur l'écran d'accueil*. Safari
  n'expose pas d'invite automatique : l'application affiche la marche à suivre.

Une fois installée, elle s'ouvre en plein écran, sans barre d'adresse.

### Hors connexion

Le service worker met en cache la coque applicative et les ressources. **Une
carte de restaurant ouverte reste consultable sans réseau** — cas courant en
salle, en sous-sol ou à l'étranger sans données. Un bandeau signale la perte
de connexion, et un badge indique en ligne que la carte restera accessible.

Les cartes elles-mêmes vivent dans le stockage du navigateur : elles sont donc
disponibles hors connexion par construction, mais propres à chaque appareil.

## Le QR code : côté restaurateur et côté client

L'espace restaurateur expose une page **Mon QR code** : aperçu, lien copiable,
export SVG (impression sans perte) et PNG, et un **chevalet de table
imprimable** portant l'invitation à scanner dans toutes les langues publiées
par le restaurant.

Le code pointe vers la carte publique du restaurant. Il utilise le niveau de
correction d'erreur H (30 % de redondance) pour rester lisible malgré la
pastille Eatnow au centre et une impression médiocre. Prévoyez au moins 3 cm
de côté pour un scan confortable.

Côté client, le bouton QR de la barre de recherche ouvre la caméra en plein
écran : viser le code posé sur la table suffit, la carte s'ouvre sans rien
valider. Le décodage passe par `BarcodeDetector` quand le navigateur le
propose (Chrome Android), sinon par jsQR — ce qui couvre iOS Safari. Si la
caméra est refusée ou absente, une photo du code prise avec l'appareil fait
le même travail.

**Un code n'ouvre jamais une adresse extérieure tout seul.** Seul un lien qui
désigne une carte de l'annuaire — ou une adresse de ce même site — provoque
une navigation, et le slug lu sert à naviguer *à l'intérieur* de
l'application. Tout autre contenu est affiché tel quel et attend un geste du
client : un autocollant malveillant collé par-dessus celui du restaurant ne
peut pas l'emmener ailleurs à son insu.

Le vhost doit autoriser la caméra (`Permissions-Policy: camera=(self)`) :
sans cet en-tête le navigateur refuse l'accès sans même afficher de demande.

## Architecture

```
src/
├── types.ts              Modèle de données (langues, allergènes, options, sélection)
├── data/
│   ├── seed.ts           17 restaurants de démonstration, 120 plats, options, formules
│   └── dishArt.ts        Illustrations de démonstration pour le champ photo
├── store/store.tsx       État applicatif + persistance localStorage + actions
├── lib/
│   ├── api.ts            Client de l'API (cookie de session, en-tête anti-CSRF)
│   ├── translate.ts      Moteur de traduction + résolution manuel > auto > source
│   ├── pwa.ts            Service worker, invite d'installation, connectivité
│   ├── qr.ts             Génération des QR codes en SVG
│   ├── qrscan.ts         Lecture des QR codes (caméra, BarcodeDetector/jsQR)
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

server/
├── src/
│   ├── config.ts         Configuration par variables d'environnement
│   ├── db.ts             SQLite, migrations versionnées
│   ├── auth.ts           scrypt, sessions, contrôle d'accès
│   ├── store.ts          Lignes SQL ⇄ objets du client
│   ├── app.ts            Routes HTTP
│   └── cli/seed.ts       Chargement des données de démonstration
├── test/api.sh           33 tests d'intégration
└── seed-data.json        Produit par `npm run export:seed` à la racine
```

### Le moteur de synchronisation

Le client garde une copie complète de l'annuaire en mémoire et applique les
modifications immédiatement : l'interface reste instantanée. Un mécanisme de
détection par comparaison de références repère les restaurants touchés, puis
envoie leur fiche et leur carte entières après 700 ms de calme — c'est
idempotent et insensible à l'ordre des modifications.

Hors connexion, les modifications restent en attente, un indicateur les
signale dans l'en-tête, et elles repartent dès le retour du réseau.

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

### Depuis le serveur lui-même (le plus simple)

Connectez-vous en SSH au serveur, puis :

```bash
git clone https://github.com/wdemirdjian-14/eatnow
cd eatnow
git checkout claude/eatnow-mvp-first-version-n9lfbt

./deploy/setup-server.sh      # une seule fois : nginx, TLS, Node, arborescence
./deploy/deploy-local.sh      # à chaque nouvelle version
```

`setup-server.sh` est idempotent : vous pouvez le relancer sans risque. Pour
recevoir les alertes d'expiration du certificat :
`EATNOW_EMAIL=vous@exemple.fr ./deploy/setup-server.sh`.

### Depuis un autre poste, par SSH

```bash
IONOS_USER=lenomdutilisateur ./deploy/deploy-ionos.sh
```

Remplacez `lenomdutilisateur` par le compte SSH réel — ne tapez pas de
chevrons, le shell les interpréterait comme une redirection.

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

**Volontairement bouchonné** — paiement simulé (aucune transaction réelle) et
traduction par glossaire.

**Prochaines étapes** — paiement (Stripe), traduction via DeepL, création de
compte restaurateur en autonomie, réinitialisation de mot de passe, envoi de la
commande en cuisine, avis clients.

## Tests

```bash
cd server
npm run seed -- --force
EATNOW_ADMIN_PASSWORD=eatnow-test EATNOW_SECURE_COOKIES=false npm run dev &
npm test          # 33 tests d'intégration
```

Ils couvrent l'accès public, l'authentification, le cloisonnement entre
restaurateurs, l'endossement administrateur, l'autorité du serveur sur les
tarifs, le remplacement de carte et le téléversement de photos.
