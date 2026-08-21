#!/usr/bin/env bash
# ============================================================
# Déploie la version courante d'Eatnow sur le serveur Ionos.
#
#   ./deploy/deploy-ionos.sh              # déploie l'état local
#   IONOS_HOST=... IONOS_USER=... ./deploy/deploy-ionos.sh
#
# Le déploiement est atomique : la nouvelle version est envoyée dans un
# dossier horodaté, puis le lien symbolique `current` bascule dessus.
# Un retour arrière consiste à refaire pointer `current` sur la version
# précédente (voir la commande affichée en fin de script).
# ============================================================
set -euo pipefail

HOST="${IONOS_HOST:-eatnow.walautao.fr}"
USER="${IONOS_USER:-root}"
PORT="${IONOS_PORT:-22}"
BASE="${IONOS_PATH:-/var/www/eatnow}"

VERSION="$(node -p "require('./package.json').version")"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
RELEASE="${BASE}/releases/v${VERSION}-${STAMP}"

echo "▶ Build de la version ${VERSION}"
npm ci
npm run typecheck
npm run build

# Empreinte déployée, lisible depuis https://eatnow.walautao.fr/version.json
cat > dist/version.json <<JSON
{
  "version": "${VERSION}",
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "commit": "$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
}
JSON

echo "▶ Envoi vers ${USER}@${HOST}:${RELEASE}"
ssh -p "${PORT}" "${USER}@${HOST}" "mkdir -p '${RELEASE}'"
rsync -az --delete -e "ssh -p ${PORT}" dist/ "${USER}@${HOST}:${RELEASE}/"

echo "▶ Bascule de current -> $(basename "${RELEASE}")"
ssh -p "${PORT}" "${USER}@${HOST}" "
  ln -sfn '${RELEASE}' '${BASE}/current'
  # Ne garder que les 5 dernières versions.
  ls -1dt '${BASE}'/releases/*/ | tail -n +6 | xargs -r rm -rf
  nginx -t && systemctl reload nginx
"

echo
echo "✅ Version ${VERSION} en ligne : https://${HOST}/"
echo "   Vérification : curl -s https://${HOST}/version.json"
echo "   Retour arrière : ssh ${USER}@${HOST} \"ln -sfn ${BASE}/releases/<version> ${BASE}/current && systemctl reload nginx\""
