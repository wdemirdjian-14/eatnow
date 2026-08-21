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

say "Build de la version ${VERSION}"
npm ci
npm run typecheck
npm run build

say "Installation dans ${RELEASE}"
$SUDO mkdir -p "${RELEASE}"
$SUDO cp -r dist/. "${RELEASE}/"
$SUDO chown -R www-data:www-data "${RELEASE}" 2>/dev/null || true

say "Bascule de current vers $(basename "${RELEASE}")"
$SUDO ln -sfn "${RELEASE}" "${BASE}/current"

# Ne conserver que les 5 dernières versions.
$SUDO bash -c "ls -1dt '${BASE}'/releases/*/ | tail -n +6 | xargs -r rm -rf"

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
echo
echo "   Versions disponibles pour un retour arrière :"
$SUDO ls -1dt "${BASE}"/releases/*/ | head -5 | sed 's|^|     |'
echo "   Retour arrière : sudo ln -sfn <version> ${BASE}/current && sudo systemctl reload nginx"
