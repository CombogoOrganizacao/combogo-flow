import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FIREBASE_ADMIN } from "../firebase/firebase-admin.provider";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(@Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token não informado.");
    }

    const token = authHeader.replace("Bearer ", "");

    try {
      const decoded = await this.firebaseApp.auth().verifyIdToken(token);
      const user: AuthenticatedUser = { uid: decoded.uid, email: decoded.email };
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException("Token inválido ou expirado.");
    }
  }
}
