import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Wraps Firebase Admin SDK.
 * - Verifies the ID token the client gets after completing Firebase Phone Auth OTP flow.
 * - Sends FCM push notifications.
 *
 * Client-side flow (mobile/web):
 *   1. App uses Firebase Client SDK to send OTP to user's mobile.
 *   2. User enters OTP, Firebase Client SDK returns an idToken.
 *   3. App sends that idToken to POST /api/v1/auth/verify-otp
 *   4. This service verifies the token server-side and issues our own JWT pair.
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (!admin.apps.length) {
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    }
  }

  async verifyIdToken(idToken: string) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      if (!decoded.phone_number) {
        throw new UnauthorizedException('Token does not contain a verified phone number');
      }
      return decoded; // includes phone_number, uid
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired OTP token');
    }
  }

  async sendPush(fcmToken: string, title: string, body: string, data?: Record<string, string>) {
    if (!fcmToken) return null;
    try {
      return await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data,
      });
    } catch (err) {
      // Do not throw — push failure shouldn't break the calling business flow
      return null;
    }
  }
}
