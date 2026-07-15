import { Injectable, Logger } from '@nestjs/common';

/**
 * Wraps WhatsApp Business API (Meta Cloud API). WhatsApp requires
 * pre-approved message templates for business-initiated conversations —
 * `templateName` must match a template approved in Meta Business Manager.
 */
@Injectable()
export class WhatsappProvider {
  private readonly logger = new Logger('WhatsappProvider');

  async send(mobile: string, templateName: string, params: string[] = []) {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      this.logger.warn('WhatsApp API not configured — skipping send (dev mode)');
      return { success: false, skipped: true };
    }

    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: mobile,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components: [
              { type: 'body', parameters: params.map((p) => ({ type: 'text', text: p })) },
            ],
          },
        }),
      });
      return { success: res.ok };
    } catch (err) {
      this.logger.error('WhatsApp send failed', err as any);
      return { success: false };
    }
  }
}
