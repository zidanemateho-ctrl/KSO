import { env } from "../config/env";
import { logger } from "../lib/logger";

interface PasswordResetEmailPayload {
  to: string;
  fullName: string;
  resetUrl: string;
}

export class EmailService {
  async sendPasswordResetEmail(payload: PasswordResetEmailPayload) {
    if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
      logger.warn("password_reset_email_provider_missing", {
        to: payload.to
      });
      return false;
    }

    const body = {
      from: env.MAIL_FROM,
      to: [payload.to],
      subject: "Reinitialisation de votre mot de passe KSO",
      html: `
        <p>Bonjour ${payload.fullName},</p>
        <p>Vous avez demande une reinitialisation de mot de passe.</p>
        <p><a href="${payload.resetUrl}">Cliquez ici pour definir un nouveau mot de passe</a></p>
        <p>Ce lien expire bientot. Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
      `
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const reason = await response.text();
      logger.error("password_reset_email_failed", {
        to: payload.to,
        reason
      });
      return false;
    }

    logger.info("password_reset_email_sent", {
      to: payload.to
    });
    return true;
  }
}

export const emailService = new EmailService();
