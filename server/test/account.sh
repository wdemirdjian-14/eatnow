#!/usr/bin/env bash
# Mot de passe choisi par le restaurateur, et forçage par l'administrateur.
set -u
API=${API:-http://127.0.0.1:3011}
ADMIN_LOGIN=${ADMIN_LOGIN:-warren}
ADMIN_PW=${ADMIN_PW:-eatnow-test}
J=$(mktemp -d); trap 'rm -rf "$J"' EXIT
pass=0; fail=0
ck(){ if [ "$2" = "$3" ]; then echo "  ✓ $1"; pass=$((pass+1)); else echo "  ✗ $1 — attendu [$2], obtenu [$3]"; fail=$((fail+1)); fi }
H='-H Content-Type:application/json -H X-Eatnow-Client:1'
code(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }

curl -s -c $J/cam.txt $H -X POST -d '{"login":"camille@lecomptoirbleu.fr","password":"eatnow"}' $API/api/auth/login >/dev/null
curl -s -c $J/cam2.txt $H -X POST -d '{"login":"camille@lecomptoirbleu.fr","password":"eatnow"}' $API/api/auth/login >/dev/null
curl -s -c $J/adm.txt $H -X POST -d "{\"login\":\"$ADMIN_LOGIN\",\"password\":\"$ADMIN_PW\"}" $API/api/auth/login >/dev/null

echo "— Le restaurateur choisit son mot de passe"
ck "refusé sans session" 401 "$(code $H -X POST -d '{"current":"eatnow","next":"nouveaumdp1"}' $API/api/account/password)"
ck "mauvais mot de passe actuel rejeté" 401 "$(code -b $J/cam.txt $H -X POST -d '{"current":"faux","next":"nouveaumdp1"}' $API/api/account/password)"
ck "nouveau trop court rejeté" 400 "$(code -b $J/cam.txt $H -X POST -d '{"current":"eatnow","next":"court"}' $API/api/account/password)"
ck "changement accepté" 200 "$(code -b $J/cam.txt $H -X POST -d '{"current":"eatnow","next":"MonPropreMdp1"}' $API/api/account/password)"
ck "ancien mot de passe refusé" 401 "$(code $H -X POST -d '{"login":"camille@lecomptoirbleu.fr","password":"eatnow"}' $API/api/auth/login)"
ck "nouveau mot de passe accepté" 200 "$(code $H -X POST -d '{"login":"camille@lecomptoirbleu.fr","password":"MonPropreMdp1"}' $API/api/auth/login)"
ck "sa propre session reste ouverte" 200 "$(code -b $J/cam.txt -H 'X-Eatnow-Client: 1' $API/api/state)"
ck "les autres appareils sont déconnectés" 401 "$(code -b $J/cam2.txt -H 'X-Eatnow-Client: 1' $API/api/state)"

echo "— Interdit pendant un endossement"
OID=$(curl -s -b $J/adm.txt -H 'X-Eatnow-Client: 1' $API/api/state | python3 -c "import sys,json; print([o['id'] for o in json.load(sys.stdin)['owners'] if o['email'].startswith('camille')][0])")
curl -s -b $J/adm.txt $H -X POST -d "{\"ownerId\":\"$OID\"}" $API/api/auth/impersonate >/dev/null
ck "changement refusé pendant l'endossement" 403 "$(code -b $J/adm.txt $H -X POST -d '{"current":"MonPropreMdp1","next":"AutreMdp123"}' $API/api/account/password)"
curl -s -b $J/adm.txt -H 'X-Eatnow-Client: 1' -X POST $API/api/auth/stop-impersonating >/dev/null

echo "— L'administrateur force un mot de passe précis"
FORCED='MotDePasseForce7'
RES=$(curl -s -b $J/adm.txt $H -X POST -d "{\"password\":\"$FORCED\"}" $API/api/admin/restaurants/r1/owner/password)
GOT=$(printf '%s' "$RES" | python3 -c 'import sys,json; print(json.load(sys.stdin)["password"])')
ck "le mot de passe imposé est bien celui retenu" "$FORCED" "$GOT"
ck "le restaurateur peut se connecter avec" 200 "$(code $H -X POST -d "{\"login\":\"camille@lecomptoirbleu.fr\",\"password\":\"$FORCED\"}" $API/api/auth/login)"
ck "celui qu'il s'était choisi ne marche plus" 401 "$(code $H -X POST -d '{"login":"camille@lecomptoirbleu.fr","password":"MonPropreMdp1"}' $API/api/auth/login)"
ck "mot de passe imposé trop court rejeté" 400 "$(code -b $J/adm.txt $H -X POST -d '{"password":"court"}' $API/api/admin/restaurants/r1/owner/password)"

echo
echo "RÉSULTAT : $pass réussis, $fail échoués"
exit $([ $fail -eq 0 ] && echo 0 || echo 1)
