import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FIREBASE_ADMIN } from "../firebase/firebase-admin.provider";
import { FIRESTORE } from "../firebase/firebase.module";

interface BoardRecord {
  id: string;
  title?: string;
  ownerId?: string;
  memberIds: string[];
  createdAt?: number;
}

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
  async assertMember(boardId: string, uid: string): Promise<BoardRecord> {
    const snap = await this.firestore.collection("boards").doc(boardId).get();
    if (!snap.exists) throw new NotFoundException("Board não encontrado.");
    const data = snap.data()!;
    if (!data.memberIds?.includes(uid)) {
      throw new ForbiddenException("Você não é membro deste board.");
    }
    return { id: snap.id, ...data, memberIds: data.memberIds ?? [] } as BoardRecord;
  }

  async addMember(boardId: string, requesterUid: string, email: string) {
    await this.assertMember(boardId, requesterUid);

    const userRecord = await this.firebaseApp.auth().getUserByEmail(email);

    await this.firestore
      .collection("boards")
      .doc(boardId)
      .update({ memberIds: admin.firestore.FieldValue.arrayUnion(userRecord.uid) });
  }

  async getMembers(boardId: string, requesterUid: string) {
    const board = await this.assertMember(boardId, requesterUid);
    const memberIds = (board.memberIds ?? []) as string[];

    return Promise.all(
      memberIds.map(async (uid) => {
        const userRecord = await this.firebaseApp.auth().getUser(uid);
        return {
          id: userRecord.uid,
          displayName: userRecord.displayName ?? userRecord.email ?? "Usuário",
          email: userRecord.email ?? "",
          photoURL: userRecord.photoURL ?? null,
        };
      }),
    );
  }
}
