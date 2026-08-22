import nodemailer from 'nodemailer'
import { config } from './config.js'

/**
 * Envoi des e-mails de service.
 *
 * L'envoi est optionnel par construction : sans hôte SMTP configuré, rien
 * n'est tenté et l'appelant reçoit un refus explicite. Un administrateur doit
 * savoir que le message n'est pas parti, plutôt que de croire le restaurateur
 * prévenu alors que rien n'a quitté le serveur.
 */

export interface MailResult {
  sent: boolean
  /** Pourquoi l'envoi n'a pas eu lieu, le cas échéant. */
  reason?: 'smtp-non-configure' | 'echec-envoi'
  /** Détail technique, journalisé côté serveur et renvoyé à l'administrateur. */
  detail?: string
}

export function smtpConfigured(): boolean {
  return config.smtp.host !== ''
}

let transport: nodemailer.Transporter | null = null

function getTransport(): nodemailer.Transporter {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      // 465 est le port du SMTP implicitement chiffré ; 587 passe par STARTTLS.
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  }
  return transport
}

async function send(to: string, subject: string, text: string): Promise<MailResult> {
  if (!smtpConfigured()) return { sent: false, reason: 'smtp-non-configure' }
  try {
    await getTransport().sendMail({ from: config.smtp.from, to, subject, text })
    return { sent: true }
  } catch (err) {
    return { sent: false, reason: 'echec-envoi', detail: (err as Error).message }
  }
}

/**
 * Transmet ses identifiants à un restaurateur.
 *
 * Le mot de passe voyage en clair dans le message : c'est le compromis usuel
 * d'un envoi d'accès initial, et c'est pourquoi le texte invite à le changer.
 */
export function sendCredentials(
  to: string,
  opts: { name: string; restaurant: string; login: string; password: string; reset: boolean },
): Promise<MailResult> {
  const titre = opts.reset
    ? `Votre nouveau mot de passe Eatnow — ${opts.restaurant}`
    : `Votre accès Eatnow — ${opts.restaurant}`

  const intro = opts.reset
    ? `Le mot de passe de votre espace Eatnow vient d'être réinitialisé.`
    : `Un espace Eatnow vient d'être ouvert pour ${opts.restaurant}.`

  const text = [
    `Bonjour ${opts.name},`,
    '',
    intro,
    '',
    `Adresse    : ${config.smtp.appUrl}/#/pro`,
    `Identifiant: ${opts.login}`,
    `Mot de passe: ${opts.password}`,
    '',
    `Vous y gérez votre fiche, votre carte, vos prix et vos allergènes.`,
    `Les traductions sont calculées automatiquement et vous pouvez en corriger`,
    `chaque ligne.`,
    '',
    `Ce mot de passe vous est transmis une seule fois : conservez-le, ou`,
    `demandez-nous une nouvelle réinitialisation.`,
    '',
    `— L'équipe Eatnow`,
  ].join('\n')

  return send(to, titre, text)
}

/** Réglages effectivement chargés, sans le mot de passe. Sert au diagnostic. */
export function smtpSummary() {
  return {
    configured: smtpConfigured(),
    host: config.smtp.host,
    port: config.smtp.port,
    user: config.smtp.user,
    from: config.smtp.from,
    /** `true` dès le port 465 : TLS implicite, comme l'exige Ionos. */
    secure: config.smtp.port === 465,
    /** Un mot de passe est-il renseigné ? Sa valeur ne sort jamais. */
    hasPassword: config.smtp.pass !== '',
  }
}

/**
 * Ouvre une connexion SMTP sans rien envoyer.
 *
 * Sépare les pannes de connexion et d'authentification d'un refus du
 * destinataire : « ça ne marche pas » devient une erreur nommée.
 */
export async function verifySmtp(): Promise<MailResult> {
  if (!smtpConfigured()) return { sent: false, reason: 'smtp-non-configure' }
  try {
    await getTransport().verify()
    return { sent: true }
  } catch (err) {
    return { sent: false, reason: 'echec-envoi', detail: (err as Error).message }
  }
}

/** Envoie un message de contrôle à l'adresse indiquée. */
export function sendTest(to: string): Promise<MailResult> {
  return send(
    to,
    'Eatnow — e-mail de contrôle',
    [
      "Ce message confirme que l'envoi d'e-mails d'Eatnow fonctionne.",
      '',
      `Serveur : ${config.smtp.host}:${config.smtp.port}`,
      `Expéditeur : ${config.smtp.from}`,
      '',
      "— L'équipe Eatnow",
    ].join('\n'),
  )
}
