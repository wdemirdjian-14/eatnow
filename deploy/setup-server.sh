#!/usr/bin/env bash
# ============================================================
# Préparation du serveur pour Eatnow — à exécuter UNE FOIS,
# directement sur le serveur Ionos, depuis le dossier du dépôt :
#
#   ./deploy/setup-server.sh
#
# Crée l'arborescence des versions, installe le vhost nginx et
# (optionnellement) le certificat TLS. Idempotent : relançable.
# ============================================================
set -euo pipefail

DOMAIN="${EATNOW_DOMAIN:-eatnow.walautao.fr}"
BASE="${EATNOW_PATH:-/var/www/eatnow}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m⚠ %s\033[0m\n' "$*"; }

if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

say "1/5 · Arborescence des versions dans ${BASE}"
$SUDO mkdir -p "${BASE}/releases" /var/www/certbot
$SUDO chown -R "$(id -un)":www-data "${BASE}" 2>/dev/null || $SUDO chown -R "$(id -un)" "${BASE}"

say "2/5 · Page d'attente (pour que nginx démarre avant le 1er déploiement)"
if [ ! -e "${BASE}/current" ]; then
  mkdir -p "${BASE}/releases/bootstrap"
  cat > "${BASE}/releases/bootstrap/index.html" <<'HTML'
<!doctype html><meta charset="utf-8"><title>Eatnow</title>
<style>body{font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0e7c86;color:#fff}</style>
<h1>Eatnow — déploiement en cours</h1>
HTML
  ln -sfn "${BASE}/releases/bootstrap" "${BASE}/current"
fi

say "3/5 · Vhost nginx pour ${DOMAIN}"
if ! command -v nginx >/dev/null 2>&1; then
  warn "nginx n'est pas installé. Installation…"
  $SUDO apt-get update -qq && $SUDO apt-get install -y nginx
fi
$SUDO cp "${HERE}/nginx-eatnow.conf" /etc/nginx/sites-available/eatnow
$SUDO ln -sf /etc/nginx/sites-available/eatnow /etc/nginx/sites-enabled/eatnow

# Le vhost livré référence des certificats qui n'existent pas encore : au
# premier passage on ne garde que le bloc HTTP, certbot ajoutera le HTTPS.
if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  warn "Pas encore de certificat : mise en place d'un vhost HTTP temporaire."
  $SUDO tee /etc/nginx/sites-available/eatnow >/dev/null <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    root ${BASE}/current;
    index index.html;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { try_files \$uri \$uri/ /index.html; }
}
NGINX
fi

$SUDO nginx -t && $SUDO systemctl reload nginx
echo "nginx rechargé."

say "4/5 · Certificat TLS"
if [ -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  echo "Certificat déjà présent pour ${DOMAIN}."
else
  if ! command -v certbot >/dev/null 2>&1; then
    $SUDO apt-get install -y certbot python3-certbot-nginx
  fi
  echo "Obtention du certificat pour ${DOMAIN} (le DNS doit déjà pointer ici)…"
  # Renseignez EATNOW_EMAIL pour recevoir les alertes d'expiration.
  if [ -n "${EATNOW_EMAIL:-}" ]; then
    CERTBOT_MAIL=(--email "${EATNOW_EMAIL}")
  else
    warn "Aucun EATNOW_EMAIL : pas d'alerte d'expiration du certificat."
    CERTBOT_MAIL=(--register-unsafely-without-email)
  fi
  if $SUDO certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos \
       "${CERTBOT_MAIL[@]}" --redirect; then
    # Certbot a produit un vhost minimal : on remet le nôtre (cache, CSP…),
    # en réinjectant les lignes de certificat qu'il vient de créer.
    $SUDO cp "${HERE}/nginx-eatnow.conf" /etc/nginx/sites-available/eatnow
    $SUDO sed -i "s|# --- certbot insère ici ssl_certificate / ssl_certificate_key ---|ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;\n    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;\n    include /etc/letsencrypt/options-ssl-nginx.conf;\n    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;|" /etc/nginx/sites-available/eatnow
    $SUDO nginx -t && $SUDO systemctl reload nginx
  else
    warn "Certbot a échoué. Le site restera en HTTP le temps de régler le DNS."
    warn "Relancez : sudo certbot --nginx -d ${DOMAIN}"
  fi
fi

say "5/5 · Node.js"
if command -v node >/dev/null 2>&1 && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]; then
  echo "Node $(node -v) — OK."
else
  warn "Node 20+ est requis pour construire l'application. Installation…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi

printf '\n\033[1;32m✅ Serveur prêt.\033[0m Déployez maintenant avec :\n\n    ./deploy/deploy-local.sh\n\n'
