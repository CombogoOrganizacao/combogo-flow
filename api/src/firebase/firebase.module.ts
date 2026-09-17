import { Global, Module } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FIREBASE_ADMIN, FirebaseAdminProvider } from "./firebase-admin.provider";

export const FIRESTORE = "FIRESTORE";

@Global()
@Module({
  providers: [
    FirebaseAdminProvider,
    {
      provide: FIRESTORE,
      useFactory: (app: admin.app.App) => app.firestore(),
      inject: [FIREBASE_ADMIN],
    },
  ],
  exports: [FIREBASE_ADMIN, FIRESTORE],
})
export class FirebaseModule {}
