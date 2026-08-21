#!/usr/bin/env bash
# Prépare une version : bump package.json + src/version.ts, commit et tag.
#   ./scripts/release.sh 0.2.0
set -euo pipefail

VERSION="${1:-}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage : $0 <x.y.z>" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Arbre de travail non propre — commitez avant de publier." >&2
  exit 1
fi

npm version "$VERSION" --no-git-tag-version
printf "/** Version applicative — alignée sur package.json et le tag Git du déploiement. */\nexport const APP_VERSION = '%s'\n" "$VERSION" > src/version.ts

npm run typecheck
npm run build

git add package.json package-lock.json src/version.ts
git commit -m "release: v$VERSION"
git tag -a "v$VERSION" -m "Eatnow v$VERSION"

echo
echo "Prêt. Publiez avec :"
echo "  git push -u origin \$(git branch --show-current) && git push origin v$VERSION"
