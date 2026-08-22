/**
 * Teste l'envoi d'e-mails directement sur le serveur, sans passer par
 * l'application.
 *
 *   node dist/cli/mail-test.js                    # connexion seulement
 *   node dist/cli/mail-test.js vous@exemple.fr    # envoi réel
 *
 * Lire la configuration depuis le même fichier que le service évite le piège
 * classique : un réglage correct dans /etc/eatnow/api.env mais jamais relu
 * par l'API. Pensez à charger l'environnement du service :
 *
 *   sudo -u www-data env $(grep -v '^#' /etc/eatnow/api.env | xargs) \
 *     node dist/cli/mail-test.js vous@exemple.fr
 */
import { config } from '../config.js'
import { sendTest, smtpConfigured, verifySmtp } from '../mail.js'

const to = process.argv[2]

console.log('Réglages SMTP chargés')
console.log(`  hôte        : ${config.smtp.host || '(vide)'}`)
console.log(`  port        : ${config.smtp.port}${config.smtp.port === 465 ? ' (TLS implicite)' : ' (STARTTLS)'}`)
console.log(`  compte      : ${config.smtp.user || '(vide)'}`)
console.log(`  mot de passe: ${config.smtp.pass ? `renseigné (${config.smtp.pass.length} caractères)` : '(vide)'}`)
console.log(`  expéditeur  : ${config.smtp.from}`)
console.log()

if (!smtpConfigured()) {
  console.error('✗ Aucun hôte SMTP configuré : renseignez EATNOW_SMTP_HOST.')
  console.error('  Si le fichier est bien rempli, c\'est que cette commande ne le lit pas :')
  console.error('  relancez-la en chargeant /etc/eatnow/api.env (voir l\'en-tête de ce fichier).')
  process.exit(1)
}

const step = to ? `Envoi d'un message à ${to}` : 'Ouverture de la connexion (aucun envoi)'
console.log(`${step}…`)

const result = to ? await sendTest(to) : await verifySmtp()

if (result.sent) {
  console.log(to ? `✓ Message accepté par ${config.smtp.host}. Vérifiez la boîte de ${to}.` : '✓ Connexion et authentification réussies.')
  process.exit(0)
}

console.error(`✗ Échec : ${result.detail ?? result.reason}`)
console.error()
console.error('Pistes selon le message ci-dessus :')
console.error('  « Invalid login » / 535   → identifiant ou mot de passe refusé par Ionos.')
console.error('  « ETIMEDOUT » / « ECONNREFUSED » → le port sortant est bloqué ou l\'hôte est faux.')
console.error('  « self signed certificate » → port et chiffrement incohérents (465 = TLS implicite).')
console.error('  « Sender address rejected » → l\'expéditeur doit être la boîte authentifiée.')
process.exit(1)
