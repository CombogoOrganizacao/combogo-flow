import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FIRESTORE } from "../firebase/firebase.module";
import { BoardsService } from "../boards/boards.service";

@Injectable()
export class ListsService {
  constructor(
    @Inject(FIRESTORE) private readonly firestore: admin.firestore.Firestore,
    private readonly boardsService: BoardsService,
  ) {}

  private async getListOrThrow(listId: string) {
    const snap = await this.firestore.collection("lists").doc(listId).get();
    if (!snap.exists) throw new NotFoundException("Lista não encontrada.");
    return { id: snap.id, ...snap.data() } as { id: string; boardId: string };
  }

  async create(boardId: string, requesterUid: string, title: string) {
    await this.boardsService.assertMember(boardId, requesterUid);

    const existing = await this.firestore
      .collection("lists")
      .where("boardId", "==", boardId)
      .get();

    const ref = await this.firestore.collection("lists").add({
      boardId,
      title,
      order: existing.size,
      createdAt: Date.now(),
    });

    return { id: ref.id };
  }

  async rename(listId: string, requesterUid: string, title: string) {
    const list = await this.getListOrThrow(listId);
    await this.boardsService.assertMember(list.boardId, requesterUid);

    await this.firestore.collection("lists").doc(listId).update({ title });
  }

  /** Remove a lista, todos os cards dentro dela, e reindexa o order das listas restantes. */
  async delete(listId: string, requesterUid: string) {
    const list = await this.getListOrThrow(listId);
    await this.boardsService.assertMember(list.boardId, requesterUid);

    const [cardsSnap, listsSnap] = await Promise.all([
      this.firestore.collection("cards").where("listId", "==", listId).get(),
      this.firestore.collection("lists").where("boardId", "==", list.boardId).get(),
    ]);

    const batch = this.firestore.batch();

    cardsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(this.firestore.collection("lists").doc(listId));

    listsSnap.docs
      .filter((doc) => doc.id !== listId)
      .sort((a, b) => a.data().order - b.data().order)
      .forEach((doc, index) => {
        if (doc.data().order !== index) batch.update(doc.ref, { order: index });
      });

    await batch.commit();
  }
}
