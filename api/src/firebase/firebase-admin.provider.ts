import { Provider } from "@nestjs/common";
import * as admin from "firebase-admin";

export const FIREBASE_ADMIN = "FIREBASE_ADMIN";

export const FirebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN,
  useFactory: () => {
    if (admin.apps.length) return admin.app();

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // A private key vem do .env com \n escapado; precisa ser desescapada.
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  },
};
