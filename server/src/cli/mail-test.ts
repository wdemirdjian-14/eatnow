/**
 * Teste l'envoi d'e-mails directement sur le serveur, sans passer par
 * l'application.
 *
 *   sudo -u www-data node dist/cli/mail-test.js                  # connexion seule
 *   sudo -u www-data node dist/cli/mail-test.js vous@exemple.fr  # envoi réel
 *
 * La configuration du service est lue par cette commande elle-même, dans
 * /etc/eatnow/api.env. C'est délibéré : passer par le shell (`env $(grep …)`)
 * échoue de deux façons. La substitution s'exécute avec les droits de
 * l'appelant, qui n'a pas accès au fichier ; et `source` casserait sur
 * `EATNOW_SMTP_FROM=Eatnow <no-reply@…>`, où bash prendrait `<` pour une
 * redirection. On analyse donc le fichier comme le fait systemd.
 *
 *   --env <chemin>   lire un autre fichier
 *   --no-env         ne lire que l'environnement déjà présent
 */
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const flag = (name: string) => args.indexOf(name)

const DEFAULT_ENV = '/etc/eatnow/api.env'
const envIndex = flag('--env')
const envFile = envIndex >= 0 ? args[envIndex + 1] : DEFAULT_ENV
const skipEnv = flag('--no-env') >= 0

/**
 * Analyse un fichier d'environnement systemd.
 *
 * Les valeurs sont prises littéralement : ni expansion de variables, ni
 * interprétation des métacaractères du shell. Les guillemets encadrants sont
 * retirés s'il y en a, car systemd les accepte.
 */
function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

let loadedFrom: string | null = null
if (!skipEnv) {
  try {
    const vars = parseEnvFile(readFileSync(envFile, 'utf8'))
    // L'environnement déjà défini l'emporte : il permet de tester un réglage
    // sans toucher au fichier du service.
    for (const [k, v] of Object.entries(vars)) if (process.env[k] === undefined) process.env[k] = v
    loadedFrom = envFile
  } catch (err) {
    const e = err as NodeJS.ErrnoException
    if (e.code === 'EACCES') {
      console.error(`✗ ${envFile} est illisible pour l'utilisateur courant.`)
      console.error('  Relancez la commande avec le compte du service :')
      console.error('    sudo -u www-data node dist/cli/mail-test.js [destinataire]')
      process.exit(1)
    }
    if (e.code !== 'ENOENT') {
      console.error(`✗ Lecture de ${envFile} impossible : ${e.message}`)
      process.exit(1)
    }
    // Absent : on se contente de l'environnement courant (cas du développement).
  }
}

// Importé après le chargement : la configuration lit process.env dès son
// évaluation, un import statique la figerait trop tôt.
const { config } = await import('../config.js')
const { sendTest, smtpConfigured, verifySmtp } = await import('../mail.js')

const to = args.find((a) => !a.startsWith('--') && a !== envFile)

console.log(loadedFrom ? `Configuration lue dans ${loadedFrom}` : 'Configuration : environnement courant')
console.log('Réglages SMTP chargés')
console.log(`  hôte        : ${config.smtp.host || '(vide)'}`)
console.log(`  port        : ${config.smtp.port}${config.smtp.port === 465 ? ' (TLS implicite)' : ' (STARTTLS)'}`)
console.log(`  compte      : ${config.smtp.user || '(vide)'}`)
console.log(`  mot de passe: ${config.smtp.pass ? `renseigné (${config.smtp.pass.length} caractères)` : '(vide)'}`)
console.log(`  expéditeur  : ${config.smtp.from}`)
console.log()

if (!smtpConfigured()) {
  console.error('✗ Aucun hôte SMTP configuré.')
  console.error(loadedFrom
    ? `  ${loadedFrom} a bien été lu, mais EATNOW_SMTP_HOST y est absent ou vide.`
    : `  Aucun fichier de configuration lu. Attendu : ${envFile}`)
  process.exit(1)
}

const step = to ? `Envoi d'un message à ${to}` : 'Ouverture de la connexion (aucun envoi)'
console.log(`${step}…`)

const result = to ? await sendTest(to) : await verifySmtp()

if (result.sent) {
  console.log(to
    ? `✓ Message accepté par ${config.smtp.host}. Vérifiez la boîte de ${to}.`
    : '✓ Connexion et authentification réussies.')
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
