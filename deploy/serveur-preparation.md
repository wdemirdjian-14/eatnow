# Préparer le serveur Ionos (une seule fois)

À exécuter en SSH sur le serveur, avant le premier déploiement.

```bash
# 1. Arborescence des versions
sudo mkdir -p /var/www/eatnow/releases /var/www/certbot
sudo chown -R "$USER":www-data /var/www/eatnow

# 2. Vhost nginx
sudo cp deploy/nginx-eatnow.conf /etc/nginx/sites-available/eatnow
sudo ln -sf /etc/nginx/sites-available/eatnow /etc/nginx/sites-enabled/eatnow

# 3. Placeholder pour que nginx démarre avant le premier déploiement
sudo mkdir -p /var/www/eatnow/releases/bootstrap
echo '<h1>Eatnow — déploiement en cours</h1>' | sudo tee /var/www/eatnow/releases/bootstrap/index.html
sudo ln -sfn /var/www/eatnow/releases/bootstrap /var/www/eatnow/current

# 4. Certificat TLS (le DNS de eatnow.walautao.fr doit déjà pointer sur ce serveur)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d eatnow.walautao.fr

# 5. Vérification
sudo nginx -t && sudo systemctl reload nginx
```

## Déploiement automatique depuis GitHub

Le workflow `.github/workflows/deploy-ionos.yml` déploie à chaque tag `vX.Y.Z`.
Il faut créer trois secrets dans le dépôt
(*Settings → Secrets and variables → Actions*) :

| Secret | Valeur |
| --- | --- |
| `IONOS_HOST` | `eatnow.walautao.fr` (ou l'IP du serveur) |
| `IONOS_USER` | l'utilisateur SSH de déploiement |
| `IONOS_SSH_KEY` | la **clé privée** SSH complète, autorisée sur le serveur |

Générer la paire de clés dédiée :

```bash
ssh-keygen -t ed25519 -C "github-actions-eatnow" -f ~/.ssh/eatnow_deploy -N ""
ssh-copy-id -i ~/.ssh/eatnow_deploy.pub <user>@eatnow.walautao.fr
cat ~/.ssh/eatnow_deploy      # -> contenu à coller dans le secret IONOS_SSH_KEY
```

## Déploiement manuel depuis votre poste

```bash
IONOS_USER=<user> ./deploy/deploy-ionos.sh
```
