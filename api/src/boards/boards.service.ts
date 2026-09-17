import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FIREBASE_ADMIN } from "../firebase/firebase-admin.provider";
import { FIRESTORE } from "../firebase/firebase.module";

@Injectable()
export class BoardsService {
  constructor(
    @Inject(FIRESTORE) private readonly firestore: admin.firestore.Firestore,
    @Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App,
  ) {}

  async create(title: string, ownerId: string) {
    const ref = await this.firestore.collection("boards").add({
      title,
      ownerId,
      memberIds: [ownerId],
      createdAt: Date.now(),
    });
    return { id: ref.id };
  }

  /** Garante que o usuário é membro do board antes de permitir qualquer mutação nele. */
  async assertMember(boardId: string, uid: string) {
    const snap = await this.firestore.collection("boards").doc(boardId).get();
    if (!snap.exists) throw new NotFoundException("Board não encontrado.");
    const data = snap.data()!;
    if (!data.memberIds?.includes(uid)) {
      throw new ForbiddenException("Você não é membro deste board.");
    }
    return { id: snap.id, ...data };
  }

  async addMember(boardId: string, requesterUid: string, email: string) {
    await this.assertMember(boardId, requesterUid);

    const userRecord = await this.firebaseApp.auth().getUserByEmail(email);

    await this.firestore
      .collection("boards")
      .doc(boardId)
      .update({ memberIds: admin.firestore.FieldValue.arrayUnion(userRecord.uid) });
  }
}
