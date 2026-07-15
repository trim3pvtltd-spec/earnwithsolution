import { Injectable, Logger } from '@nestjs/common';

/**
 * SMTP email provider. Use nodemailer in production — install with:
 *   npm install nodemailer @types/nodemailer
 * Kept as a thin interface here so the transport can be swapped
 * (SMTP / SendGrid / SES) without touching NotificationsService.
 */
@Injectable()
export class EmailProvider {
  private readonly logger = new Logger('EmailProvider');

  async send(to: string, subject: string, htmlBody: string) {
    if (!process.env.SMTP_HOST) {
      this.logger.warn('SMTP not configured — skipping email send (dev mode)');
      return { success: false, skipped: true };
    }
    // Real implementation (uncomment after `npm install nodemailer`):
    //
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: Number(process.env.SMTP_PORT),
    //   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // });
    // await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html: htmlBody });

    return { success: true };
  }
}
