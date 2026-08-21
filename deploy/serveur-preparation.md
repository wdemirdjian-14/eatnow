# Préparer le serveur Ionos (une seule fois)

Eatnow comprend trois éléments servis par nginx :

```
/          fichiers statiques du client React
/api/      service Node (systemd : eatnow-api) ──► SQLite
/uploads/  photos de plats, sur disque
```

## En une commande, depuis le serveur

```bash
git clone https://github.com/wdemirdjian-14/eatnow && cd eatnow
git checkout claude/eatnow-mvp-first-version-n9lfbt

./deploy/setup-server.sh
```

Le script est idempotent. Il installe nginx et Node 20 si besoin, crée
l'arborescence des versions, pose le vhost, obtient le certificat TLS,
installe le service systemd et crée `/etc/eatnow/api.env`.

## Définir le mot de passe administrateur

**Avant le premier démarrage**, ouvrez le fichier de configuration :

```bash
sudo nano /etc/eatnow/api.env
```

et renseignez :

```
EATNOW_ADMIN_LOGIN=warren
EATNOW_ADMIN_PASSWORD=votre-mot-de-passe
```

Ce compte est créé au tout premier démarrage de l'API, **uniquement si aucun
administrateur n'existe déjà en base**. Le mot de passe est immédiatement haché
par scrypt ; il ne quitte jamais le serveur et n'apparaît dans aucune page.

Sans `EATNOW_ADMIN_PASSWORD`, aucun compte n'est créé : mieux vaut un serveur
sans administrateur qu'un administrateur au mot de passe prévisible.

## Déployer

```bash
./deploy/deploy-local.sh
```

Le script construit le client et l'API, installe la nouvelle version dans un
dossier horodaté, bascule le lien `current`, redémarre `eatnow-api` et recharge
nginx. Si l'API refuse de démarrer, le script s'arrête et affiche son journal.

## Charger les données de démonstration (facultatif)

À faire une fois, sur une base vide :

```bash
sudo -u www-data npm --prefix /var/www/eatnow/api run seed
```

Sept restaurants, 43 plats, leurs options et sept comptes restaurateurs
(mot de passe `eatnow`). Ajoutez `-- --force` pour repartir d'une base propre.

## Vérifier

```bash
curl -s https://eatnow.walautao.fr/version.json     # version du client
curl -s https://eatnow.walautao.fr/api/version      # version de l'API
systemctl status eatnow-api
journalctl -u eatnow-api -n 50 --no-pager
```

## Sauvegarder

Tout tient dans un dossier :

```bash
sudo tar czf eatnow-$(date +%F).tar.gz -C /var/lib eatnow
```

`/var/lib/eatnow` contient la base SQLite et les photos. Il est délibérément
placé hors du dossier applicatif : un déploiement remplace le code sans jamais
toucher aux données.

## Retour arrière

```bash
ls -1dt /var/www/eatnow/releases/*/          # versions conservées (les 5 dernières)
sudo ln -sfn /var/www/eatnow/releases/<version> /var/www/eatnow/current
sudo systemctl reload nginx
```

Le retour arrière ne concerne que le client statique. L'API et la base
suivent le code déployé : en cas de changement de schéma, un retour arrière
suppose de restaurer aussi la sauvegarde correspondante.

## Déploiement automatique depuis GitHub

Le workflow `.github/workflows/deploy-ionos.yml` se déclenche sur chaque tag
`vX.Y.Z`. Créez trois secrets dans le dépôt
(*Settings → Secrets and variables → Actions*) :

| Secret | Valeur |
| --- | --- |
| `IONOS_HOST` | `eatnow.walautao.fr` (ou l'IP du serveur) |
| `IONOS_USER` | l'utilisateur SSH de déploiement |
| `IONOS_SSH_KEY` | la **clé privée** SSH complète, autorisée sur le serveur |

```bash
ssh-keygen -t ed25519 -C "github-actions-eatnow" -f ~/.ssh/eatnow_deploy -N ""
ssh-copy-id -i ~/.ssh/eatnow_deploy.pub <user>@eatnow.walautao.fr
cat ~/.ssh/eatnow_deploy      # -> contenu du secret IONOS_SSH_KEY
```
