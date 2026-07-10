import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "./logger";

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    logger.warn(
      "SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS not fully configured — receipt emails will be skipped",
    );
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
  return transporter;
}

export interface SendMailInput {
  to: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using SMTP credentials configured via env vars. Returns
 * false (without throwing) when SMTP isn't configured or sending fails, so
 * callers can treat email delivery as best-effort and never block an order
 * flow on it.
 */
export async function sendMail(input: SendMailInput): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  try {
    await t.sendMail({
      from: `"${input.fromName}" <${process.env.SMTP_USER}>`,
      replyTo: input.fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send email");
    return false;
  }
}
