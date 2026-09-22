import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FIRESTORE } from "../firebase/firebase.module";
import { BoardsService } from "../boards/boards.service";

@Injectable()
export class CardsService {
  constructor(
    @Inject(FIRESTORE) private readonly firestore: admin.firestore.Firestore,
    private readonly boardsService: BoardsService,
  ) {}

  private async getListOrThrow(listId: string) {
    const snap = await this.firestore.collection("lists").doc(listId).get();
    if (!snap.exists) throw new NotFoundException("Lista não encontrada.");
    return { id: snap.id, ...snap.data() } as { id: string; boardId: string };
  }

  private async getCardOrThrow(cardId: string) {
    const snap = await this.firestore.collection("cards").doc(cardId).get();
    if (!snap.exists) throw new NotFoundException("Card não encontrado.");
    return { id: snap.id, ...snap.data() } as {
      id: string;
      boardId: string;
      listId: string;
      order: number;
    };
  }

  async create(listId: string, requesterUid: string, title: string) {
    const list = await this.getListOrThrow(listId);
    await this.boardsService.assertMember(list.boardId, requesterUid);

    const existing = await this.firestore.collection("cards").where("listId", "==", listId).get();

    const ref = await this.firestore.collection("cards").add({
      boardId: list.boardId,
      listId,
      title,
      description: "",
      order: existing.size,
      assigneeIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { id: ref.id };
  }

  async update(
    cardId: string,
    requesterUid: string,
    data: { title?: string; description?: string; assigneeIds?: string[] },
  ) {
    const card = await this.getCardOrThrow(cardId);
    const board = await this.boardsService.assertMember(card.boardId, requesterUid);

    if (data.assigneeIds) {
      const memberIds = new Set((board.memberIds ?? []) as string[]);
      if (data.assigneeIds.some((uid) => !memberIds.has(uid))) {
        throw new BadRequestException("Todos os responsáveis precisam ser membros do board.");
      }
    }

    await this.firestore
      .collection("cards")
      .doc(cardId)
      .update({ ...data, updatedAt: Date.now() });
  }

  async delete(cardId: string, requesterUid: string) {
    const card = await this.getCardOrThrow(cardId);
    await this.boardsService.assertMember(card.boardId, requesterUid);

    const siblingsSnap = await this.firestore
      .collection("cards")
      .where("listId", "==", card.listId)
      .get();

    const batch = this.firestore.batch();
    batch.delete(this.firestore.collection("cards").doc(cardId));

    siblingsSnap.docs
      .filter((doc) => doc.id !== cardId)
      .sort((a, b) => a.data().order - b.data().order)
      .forEach((doc, index) => {
        if (doc.data().order !== index) batch.update(doc.ref, { order: index });
      });

    await batch.commit();
  }

  /**
   * Move um card para outra posição/lista e reordena (order sequencial 0..n)
   * tanto a lista de destino quanto a de origem, em um único batch write.
   */
  async move(cardId: string, requesterUid: string, targetListId: string, targetOrder: number) {
    const card = await this.getCardOrThrow(cardId);
    await this.boardsService.assertMember(card.boardId, requesterUid);

    const sourceListId = card.listId;
    const cardsRef = this.firestore.collection("cards");

    const [sourceSnap, targetSnap] = await Promise.all([
      cardsRef.where("listId", "==", sourceListId).get(),
      sourceListId === targetListId ? null : cardsRef.where("listId", "==", targetListId).get(),
    ]);

    const batch = this.firestore.batch();

    if (sourceListId === targetListId) {
      // Reordenação dentro da mesma lista
      const ordered = sourceSnap.docs
        .filter((d) => d.id !== cardId)
        .sort((a, b) => a.data().order - b.data().order);
      ordered.splice(targetOrder, 0, sourceSnap.docs.find((d) => d.id === cardId)!);

      ordered.forEach((doc, index) => {
        batch.update(doc.ref, { order: index, listId: targetListId, updatedAt: Date.now() });
      });
    } else {
      // Fecha o buraco na lista de origem
      const remainingSource = sourceSnap.docs
        .filter((d) => d.id !== cardId)
        .sort((a, b) => a.data().order - b.data().order);
      remainingSource.forEach((doc, index) => {
        if (doc.data().order !== index) batch.update(doc.ref, { order: index });
      });

      // Insere na lista de destino na posição desejada
      const targetOrdered = (targetSnap?.docs ?? []).sort((a, b) => a.data().order - b.data().order);
      targetOrdered.splice(targetOrder, 0, { id: cardId } as any);

      targetOrdered.forEach((item, index) => {
        const ref = item.id === cardId ? cardsRef.doc(cardId) : (item as FirebaseFirestore.QueryDocumentSnapshot).ref;
        batch.update(ref, {
          order: index,
          ...(item.id === cardId ? { listId: targetListId } : {}),
          updatedAt: Date.now(),
        });
      });
    }

    await batch.commit();
  }
}
