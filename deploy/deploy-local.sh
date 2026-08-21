#!/usr/bin/env bash
# ============================================================
# Déploiement d'Eatnow depuis le serveur lui-même (pas de SSH).
#
#   ./deploy/deploy-local.sh
#
# Construit l'application, l'installe dans un dossier horodaté,
# puis bascule le lien `current` dessus. Retour arrière immédiat.
# ============================================================
set -euo pipefail

BASE="${EATNOW_PATH:-/var/www/eatnow}"
DOMAIN="${EATNOW_DOMAIN:-eatnow.walautao.fr}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi
say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

if [ ! -d "${BASE}/releases" ]; then
  echo "Le serveur n'est pas préparé (${BASE}/releases absent)." >&2
  echo "Lancez d'abord : ./deploy/setup-server.sh" >&2
  exit 1
fi

VERSION="$(node -p "require('./package.json').version")"
RELEASE="${BASE}/releases/v${VERSION}-$(date -u +%Y%m%d-%H%M%S)"

say "Build du client — version ${VERSION}"
npm ci
npm run typecheck
npm run build

say "Build de l'API"
(cd server && npm ci && npm run build)

say "Installation dans ${RELEASE}"
$SUDO mkdir -p "${RELEASE}"
$SUDO cp -r dist/. "${RELEASE}/"
$SUDO chown -R www-data:www-data "${RELEASE}" 2>/dev/null || true

say "Installation de l'API dans ${BASE}/api"
$SUDO mkdir -p "${BASE}/api"
$SUDO rm -rf "${BASE}/api/dist" "${BASE}/api/node_modules"
$SUDO cp -r server/dist "${BASE}/api/dist"
$SUDO cp server/package.json server/package-lock.json server/seed-data.json "${BASE}/api/"
# Dépendances de production uniquement : better-sqlite3 compile ou récupère
# son binaire natif ici, sur la machine qui l'exécutera.
$SUDO npm --prefix "${BASE}/api" ci --omit=dev

say "Bascule de current vers $(basename "${RELEASE}")"
$SUDO ln -sfn "${RELEASE}" "${BASE}/current"

# Ne conserver que les 5 dernières versions.
$SUDO bash -c "ls -1dt '${BASE}'/releases/*/ | tail -n +6 | xargs -r rm -rf"

API_PORT=$(grep -E '^PORT=' /etc/eatnow/api.env 2>/dev/null | cut -d= -f2 | tr -d ' ' || true)
API_PORT="${API_PORT:-3011}"

say "Redémarrage de l'API (port ${API_PORT})"
if systemctl list-unit-files 2>/dev/null | grep -q '^eatnow-api.service'; then
  $SUDO systemctl restart eatnow-api
  sleep 2
  if $SUDO systemctl is-active --quiet eatnow-api; then
    echo "API active."
    # Le service tourne, mais répond-il vraiment sur ce port ? Si un autre
    # programme l'occupe, nginx lui transmettrait silencieusement les
    # requêtes d'Eatnow — panne difficile à diagnostiquer depuis l'extérieur.
    BODY=$(curl -fsS --max-time 5 "http://127.0.0.1:${API_PORT}/api/version" 2>/dev/null || true)
    if printf '%s' "$BODY" | grep -q '"version"'; then
      echo "Réponse de l'API : $BODY"
    else
      printf '\033[1;31m✗ Le port %s ne répond pas comme l'"'"'API Eatnow.\033[0m\n' "${API_PORT}"
      echo "  Reçu : ${BODY:-<vide>}"
      echo "  Un autre programme occupe probablement ce port :"
      $SUDO ss -lptn "sport = :${API_PORT}" 2>/dev/null | sed 's/^/    /' || true
      echo "  Choisissez un port libre et relancez la préparation :"
      echo "    EATNOW_PORT=3012 ./deploy/setup-server.sh && ./deploy/deploy-local.sh"
      exit 1
    fi
  else
    printf '\033[1;31m✗ L'"'"'API n'"'"'a pas démarré. Journal :\033[0m\n'
    $SUDO journalctl -u eatnow-api -n 30 --no-pager || true
    exit 1
  fi
else
  printf '\033[1;33m⚠ Service eatnow-api absent — lancez ./deploy/setup-server.sh.\033[0m\n'
fi

if command -v nginx >/dev/null 2>&1; then
  if $SUDO nginx -t 2>/dev/null; then
    $SUDO systemctl reload nginx || true
  else
    printf '\033[1;33m⚠ Configuration nginx invalide — version installée mais pas rechargée.\033[0m\n'
    $SUDO nginx -t || true
  fi
else
  printf '\033[1;33m⚠ nginx introuvable — lancez ./deploy/setup-server.sh.\033[0m\n'
fi

printf '\n\033[1;32m✅ Version %s en ligne.\033[0m\n' "${VERSION}"
echo "   https://${DOMAIN}/"
echo "   Vérification : curl -s https://${DOMAIN}/version.json"
echo "   API          : curl -s https://${DOMAIN}/api/version"
echo
echo "   Versions disponibles pour un retour arrière :"
$SUDO ls -1dt "${BASE}"/releases/*/ | head -5 | sed 's|^|     |'
echo "   Retour arrière : sudo ln -sfn <version> ${BASE}/current && sudo systemctl reload nginx"
