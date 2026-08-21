#!/usr/bin/env bash
# Tests d'intégration de l'API, exécutés contre un serveur lancé sur une base
# fraîchement chargée par `npm run seed`.
#
#   EATNOW_ADMIN_PASSWORD=eatnow-test npm run dev      # dans un terminal
#   API=http://127.0.0.1:3001 ./test/api.sh            # dans un autre
#
# Le mot de passe administrateur est paramétrable : les tests ne doivent
# contenir aucun secret réel.
#
# Couvre : accès public, authentification, cloisonnement entre restaurateurs,
# endossement administrateur, autorité du serveur sur les tarifs, remplacement
# de carte et téléversement de photos.
set -u
API=${API:-http://127.0.0.1:3001}
ADMIN_LOGIN=${ADMIN_LOGIN:-warren}
ADMIN_PW=${ADMIN_PW:-eatnow-test}
J=$(mktemp -d)
trap 'rm -rf "$J"' EXIT
pass=0; fail=0
check() { # libellé attendu obtenu
  if [ "$2" = "$3" ]; then echo "  ✓ $1"; pass=$((pass+1))
  else echo "  ✗ $1 — attendu [$2], obtenu [$3]"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "— Données publiques"
check "annuaire accessible sans session" 200 "$(code $API/api/public/state)"
N=$(curl -s $API/api/public/state | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["restaurants"]),len(d["dishes"]))')
echo "  restaurants/plats servis : $N"

echo "— Sécurité"
check "état privé refusé sans session" 401 "$(code $API/api/state)"
check "écriture refusée sans session" 401 "$(code -X PATCH -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d '{}' $API/api/restaurants/r1)"
check "écriture refusée sans en-tête client (CSRF)" 403 "$(code -X PATCH -H 'Content-Type: application/json' -d '{}' $API/api/restaurants/r1)"
check "mauvais mot de passe rejeté" 401 "$(code -X POST -H 'Content-Type: application/json' -d "{\"login\":\"$ADMIN_LOGIN\",\"password\":\"faux\"}" $API/api/auth/login)"
check "compte inexistant rejeté" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{"login":"personne","password":"x"}' $API/api/auth/login)"

echo "— Connexion restaurateur"
check "connexion camille" 200 "$(code -c $J/camille.txt -X POST -H 'Content-Type: application/json' -d '{"login":"camille@lecomptoirbleu.fr","password":"eatnow"}' $API/api/auth/login)"
ME=$(curl -s -b $J/camille.txt $API/api/auth/me | python3 -c 'import sys,json;u=json.load(sys.stdin)["user"];print(u["role"],u["restaurantId"])')
echo "  identité : $ME"
check "cookie httpOnly" "HttpOnly" "$(grep -o HttpOnly $J/camille.txt || echo absent)"

echo "— Cloisonnement entre restaurateurs"
check "modification de son restaurant" 200 "$(code -b $J/camille.txt -X PATCH -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d '{"hours":"Mar-Sam 12h-23h"}' $API/api/restaurants/r1)"
check "modification du restaurant d'un autre refusée" 403 "$(code -b $J/camille.txt -X PATCH -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d '{"name":"pirate"}' $API/api/restaurants/r2)"
check "carte d'un autre refusée" 403 "$(code -b $J/camille.txt -X PUT -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d '{"categories":[],"dishes":[],"menus":[]}' $API/api/restaurants/r3/menu)"
check "endossement refusé à un restaurateur" 403 "$(code -b $J/camille.txt -X POST -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d '{"ownerId":"o2"}' $API/api/auth/impersonate)"

echo "— Persistance"
H=$(curl -s $API/api/public/state | python3 -c 'import sys,json;print([r["hours"] for r in json.load(sys.stdin)["restaurants"] if r["id"]=="r1"][0])')
check "modification persistée et publiée" "Mar-Sam 12h-23h" "$H"

echo "— Tarif serveur non falsifiable"
BEFORE=$(curl -s -b $J/camille.txt $API/api/state | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["purchases"]))')
AMT=$(curl -s -b $J/camille.txt -X POST -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d '{"lang":"hy","amount":0}' $API/api/restaurants/r1/languages | python3 -c 'import sys,json;print(json.load(sys.stdin)["amount"])')
check "montant imposé par le serveur (plan pro)" "9" "$AMT"
AFTER=$(curl -s -b $J/camille.txt $API/api/state | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["purchases"]))')
check "achat enregistré" "$((BEFORE+1))" "$AFTER"
DUP=$(curl -s -b $J/camille.txt -X POST -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d '{"lang":"hy"}' $API/api/restaurants/r1/languages | python3 -c 'import sys,json;print(json.load(sys.stdin)["alreadyOwned"])')
check "achat en double ignoré" "True" "$DUP"

echo "— Administrateur et endossement"
check "connexion warren" 200 "$(code -c $J/warren.txt -X POST -H 'Content-Type: application/json' -d "{\"login\":\"$ADMIN_LOGIN\",\"password\":\"$ADMIN_PW\"}" $API/api/auth/login)"
check "admin voit tous les comptes" 200 "$(code -b $J/warren.txt $API/api/state)"
OW=$(curl -s -b $J/warren.txt $API/api/state | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["owners"]))')
echo "  restaurateurs visibles : $OW"
check "endossement d'un restaurateur" 200 "$(code -b $J/warren.txt -X POST -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d '{"ownerId":"o3"}' $API/api/auth/impersonate)"
ACT=$(curl -s -b $J/warren.txt $API/api/auth/me | python3 -c 'import sys,json;u=json.load(sys.stdin)["user"];print(u["restaurantId"],u["impersonating"])')
echo "  agit désormais comme : $ACT"
check "modifie la fiche du restaurateur endossé" 200 "$(code -b $J/warren.txt -X PATCH -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d '{"emoji":"🍶"}' $API/api/restaurants/r3)"
check "bascule directe vers un autre restaurateur" 200 "$(code -b $J/warren.txt -X POST -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d '{"ownerId":"o4"}' $API/api/auth/impersonate)"
# Pendant un endossement, l'admin ne voit plus l'ensemble des comptes mais
# uniquement celui qu'il endosse — le client en a besoin pour afficher l'espace.
SCOPE=$(curl -s -b $J/warren.txt $API/api/state | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["owners"]))')
check "pendant l'endossement, périmètre réduit au compte endossé" "1" "$SCOPE"
WHO=$(curl -s -b $J/warren.txt $API/api/state | python3 -c 'import sys,json;print(json.load(sys.stdin)["owners"][0]["restaurantId"])')
check "et c'est bien le bon compte" "r4" "$WHO"
check "retour au compte admin" 200 "$(code -b $J/warren.txt -X POST -H 'X-Eatnow-Client: 1' $API/api/auth/stop-impersonating)"
BACK=$(curl -s -b $J/warren.txt $API/api/auth/me | python3 -c 'import sys,json;u=json.load(sys.stdin)["user"];print(u["role"],u["impersonating"])')
check "redevenu admin" "admin False" "$BACK"

echo "— Remplacement de carte"
PAY='{"categories":[{"id":"c1","name":{"source":"Test","auto":{},"manual":{}},"order":0}],"dishes":[{"id":"d1","categoryId":"c1","name":{"source":"Plat test","auto":{},"manual":{}},"description":{"source":"","auto":{},"manual":{}},"price":10,"allergens":[],"tags":[],"available":true,"dishOfDay":false,"order":0,"options":[]},{"id":"orphelin","categoryId":"inconnue","name":{"source":"Orphelin","auto":{},"manual":{}},"description":{"source":"","auto":{},"manual":{}},"price":5,"allergens":[],"tags":[],"available":true,"dishOfDay":false,"order":1,"options":[]}],"menus":[]}'
check "carte remplacée" 200 "$(code -b $J/warren.txt -X PUT -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d "$PAY" $API/api/restaurants/r6/menu)"
CNT=$(curl -s $API/api/public/state | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len([x for x in d["dishes"] if x["restaurantId"]=="r6"]))')
check "plat orphelin écarté" "1" "$CNT"
check "carte invalide rejetée" 400 "$(code -b $J/warren.txt -X PUT -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d '{"categories":[]}' $API/api/restaurants/r6/menu)"

echo "— Photos"
PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
URL=$(curl -s -b $J/camille.txt -X POST -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d "{\"dataUrl\":\"$PNG\"}" $API/api/dishes/r1d1/photo | python3 -c 'import sys,json;print(json.load(sys.stdin)["photo"])')
echo "  photo enregistrée : $URL"
check "photo servie" 200 "$(code $API$URL)"
check "format non image rejeté" 400 "$(code -b $J/camille.txt -X POST -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d '{"dataUrl":"data:text/html;base64,PGgxPg=="}' $API/api/dishes/r1d1/photo)"
check "photo d'un autre restaurant refusée" 403 "$(code -b $J/camille.txt -X POST -H 'Content-Type: application/json' -H 'X-Eatnow-Client: 1' -d "{\"dataUrl\":\"$PNG\"}" $API/api/dishes/r2d1/photo)"

echo "— Déconnexion"
check "déconnexion" 200 "$(code -b $J/camille.txt -c $J/camille.txt -X POST -H 'X-Eatnow-Client: 1' $API/api/auth/logout)"
check "session invalidée" 401 "$(code -b $J/camille.txt $API/api/state)"

echo
echo "RÉSULTAT : $pass réussis, $fail échoués"
