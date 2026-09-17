import { create } from "zustand";
import type { Board, Card, List } from "@/types";

interface BoardState {
  board: Board | null;
  lists: List[];
  cards: Card[];
  setBoard: (board: Board | null) => void;
  setLists: (lists: List[]) => void;
  setCards: (cards: Card[]) => void;
  cardsByList: (listId: string) => Card[];
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  lists: [],
  cards: [],
  setBoard: (board) => set({ board }),
  setLists: (lists) => set({ lists: [...lists].sort((a, b) => a.order - b.order) }),
  setCards: (cards) => set({ cards: [...cards].sort((a, b) => a.order - b.order) }),
  cardsByList: (listId) => get().cards.filter((c) => c.listId === listId),
}));
