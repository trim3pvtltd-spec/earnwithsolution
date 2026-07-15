import { Injectable, Logger } from '@nestjs/common';

/**
 * Thin wrapper around an SMS gateway (MSG91 / Twilio / etc).
 * Swap the fetch call inside `send()` for your chosen provider's API —
 * kept provider-agnostic so switching gateways doesn't touch business logic.
 */
@Injectable()
export class SmsProvider {
  private readonly logger = new Logger('SmsProvider');

  async send(mobile: string, message: string) {
    const apiKey = process.env.SMS_API_KEY;
    if (!apiKey) {
      this.logger.warn('SMS_API_KEY not configured — skipping SMS send (dev mode)');
      return { success: false, skipped: true };
    }

    try {
      // Example shape for MSG91 — replace with your gateway's actual endpoint/payload
      const res = await fetch('https://api.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: apiKey },
        body: JSON.stringify({
          sender: process.env.SMS_SENDER_ID,
          mobiles: mobile,
          message,
        }),
      });
      return { success: res.ok };
    } catch (err) {
      this.logger.error('SMS send failed', err as any);
      return { success: false };
    }
  }
}
