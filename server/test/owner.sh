#!/usr/bin/env bash
set -u
API=${API:-http://127.0.0.1:3011}
J=$(mktemp -d); trap 'rm -rf "$J"' EXIT
pass=0; fail=0
ck(){ if [ "$2" = "$3" ]; then echo "  ✓ $1"; pass=$((pass+1)); else echo "  ✗ $1 — attendu [$2], obtenu [$3]"; fail=$((fail+1)); fi }
H='-H Content-Type:application/json -H X-Eatnow-Client:1'
code(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }

curl -s -c $J/adm.txt $H -X POST -d '{"login":"warren","password":"eatnow-test"}' $API/api/auth/login >/dev/null
curl -s -c $J/cam.txt $H -X POST -d '{"login":"camille@lecomptoirbleu.fr","password":"eatnow"}' $API/api/auth/login >/dev/null

echo "— Accès refusé aux non-administrateurs"
ck "création refusée à un restaurateur" 403 "$(code -b $J/cam.txt $H -X POST -d '{"name":"X","login":"x@y.fr"}' $API/api/admin/restaurants/r2/owner)"
ck "réinitialisation refusée à un restaurateur" 403 "$(code -b $J/cam.txt $H -X POST -d '{}' $API/api/admin/restaurants/r1/owner/password)"
ck "réinitialisation refusée sans session" 401 "$(code $H -X POST -d '{}' $API/api/admin/restaurants/r1/owner/password)"

echo "— Création d'un accès"
ck "refusée si le restaurant a déjà un accès" 409 "$(code -b $J/adm.txt $H -X POST -d '{"name":"Double","login":"double@x.fr"}' $API/api/admin/restaurants/r1/owner)"
# On détache l'accès de r2 pour simuler un restaurant orphelin
sqlite3 "$EATNOW_DB" "UPDATE users SET restaurant_id = NULL WHERE id = 'o2'; UPDATE restaurants SET owner_id = NULL WHERE id = 'r2';" 2>/dev/null \
  || python3 -c "
import sqlite3,os
c=sqlite3.connect(os.environ['EATNOW_DB'])
c.execute(\"UPDATE users SET restaurant_id = NULL WHERE id = 'o2'\")
c.execute(\"UPDATE restaurants SET owner_id = NULL WHERE id = 'r2'\")
c.commit()"
ck "identifiant déjà pris rejeté" 409 "$(code -b $J/adm.txt $H -X POST -d '{"name":"X","login":"camille@lecomptoirbleu.fr"}' $API/api/admin/restaurants/r2/owner)"
ck "champs manquants rejetés" 400 "$(code -b $J/adm.txt $H -X POST -d '{"name":"X"}' $API/api/admin/restaurants/r2/owner)"
ck "mot de passe trop court rejeté" 400 "$(code -b $J/adm.txt $H -X POST -d '{"name":"X","login":"neuf@resto.fr","password":"court"}' $API/api/admin/restaurants/r2/owner)"

NEW=$(curl -s -b $J/adm.txt $H -X POST -d '{"name":"Nouveau Gérant","login":"neuf@resto.fr"}' $API/api/admin/restaurants/r2/owner)
PW=$(printf '%s' "$NEW" | python3 -c 'import sys,json; print(json.load(sys.stdin)["password"])')
ck "mot de passe généré de 12 caractères" 12 "${#PW}"
ck "le nouvel accès permet de se connecter" 200 "$(code -c $J/new.txt $H -X POST -d "{\"login\":\"neuf@resto.fr\",\"password\":\"$PW\"}" $API/api/auth/login)"
SCOPE=$(curl -s -b $J/new.txt -H 'X-Eatnow-Client: 1' $API/api/auth/me | python3 -c 'import sys,json; u=json.load(sys.stdin)["user"]; print(u["role"], u["restaurantId"])')
ck "le compte est bien rattaché à r2" "owner r2" "$SCOPE"

echo "— Réinitialisation"
ck "restaurant sans accès refusé" 404 "$(code -b $J/adm.txt $H -X POST -d '{}' $API/api/admin/restaurants/inconnu/owner/password)"
RST=$(curl -s -b $J/adm.txt $H -X POST -d '{}' $API/api/admin/restaurants/r1/owner/password)
NPW=$(printf '%s' "$RST" | python3 -c 'import sys,json; print(json.load(sys.stdin)["password"])')
ck "ancien mot de passe invalidé" 401 "$(code $H -X POST -d '{"login":"camille@lecomptoirbleu.fr","password":"eatnow"}' $API/api/auth/login)"
ck "nouveau mot de passe accepté" 200 "$(code $H -X POST -d "{\"login\":\"camille@lecomptoirbleu.fr\",\"password\":\"$NPW\"}" $API/api/auth/login)"
ck "session précédente invalidée" 401 "$(code -b $J/cam.txt -H 'X-Eatnow-Client: 1' $API/api/state)"

echo "— E-mail"
MS=$(curl -s -b $J/adm.txt -H 'X-Eatnow-Client: 1' $API/api/admin/mail-status | python3 -c 'import sys,json; print(json.load(sys.stdin)["configured"])')
ck "SMTP annoncé non configuré" "False" "$MS"
MR=$(curl -s -b $J/adm.txt $H -X POST -d '{"email":true}' $API/api/admin/restaurants/r1/owner/password | python3 -c 'import sys,json; m=json.load(sys.stdin)["mail"]; print(m["sent"], m.get("reason"))')
ck "envoi refusé explicitement, pas silencieux" "False smtp-non-configure" "$MR"

echo "— Aucune fuite d'empreinte"
LEAK=$(curl -s -b $J/adm.txt -H 'X-Eatnow-Client: 1' $API/api/state | grep -o -E '"(password_hash|passwordHash|salt)"' | sort -u | tr '\n' ' ')
ck "ni empreinte ni sel dans /api/state" "" "$LEAK"

echo
echo "RÉSULTAT : $pass réussis, $fail échoués"
exit $([ $fail -eq 0 ] && echo 0 || echo 1)
