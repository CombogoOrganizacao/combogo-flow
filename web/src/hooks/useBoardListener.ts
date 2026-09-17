import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useBoardStore } from "@/store/useBoardStore";
import type { Board, Card, List } from "@/types";

/**
 * Fonte única de leitura em tempo real para a tela de um board.
 * Três listeners independentes: board (metadados), lists e cards.
 * Qualquer escrita feita via API do NestJS chega aqui automaticamente.
 */
export function useBoardListener(boardId: string) {
  const setBoard = useBoardStore((s) => s.setBoard);
  const setLists = useBoardStore((s) => s.setLists);
  const setCards = useBoardStore((s) => s.setCards);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!boardId) return;

    const unsubBoard = onSnapshot(doc(db, "boards", boardId), (snap) => {
      setBoard(snap.exists() ? ({ id: snap.id, ...snap.data() } as Board) : null);
    });

    const listsQuery = query(collection(db, "lists"), where("boardId", "==", boardId));
    const unsubLists = onSnapshot(listsQuery, (snap) => {
      setLists(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as List));
    });

    const cardsQuery = query(collection(db, "cards"), where("boardId", "==", boardId));
    const unsubCards = onSnapshot(cardsQuery, (snap) => {
      setCards(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Card));
      setLoading(false);
    });

    return () => {
      unsubBoard();
      unsubLists();
      unsubCards();
    };
  }, [boardId, setBoard, setLists, setCards]);

  return { loading };
}
