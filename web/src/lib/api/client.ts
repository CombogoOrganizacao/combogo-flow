import { getIdToken } from "@/lib/firebase/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getIdToken();
  if (!token) {
    throw new Error("Usuário não autenticado.");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Erro ${res.status} ao chamar ${path}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Boards
  createBoard: (title: string) =>
    request<{ id: string }>("/boards", { method: "POST", body: JSON.stringify({ title }) }),
  addMember: (boardId: string, email: string) =>
    request<void>(`/boards/${boardId}/members`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  // Lists
  createList: (boardId: string, title: string) =>
    request<{ id: string }>(`/boards/${boardId}/lists`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  renameList: (listId: string, title: string) =>
    request<void>(`/lists/${listId}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  deleteList: (listId: string) => request<void>(`/lists/${listId}`, { method: "DELETE" }),

  // Cards
  createCard: (listId: string, title: string) =>
    request<{ id: string }>(`/lists/${listId}/cards`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  moveCard: (cardId: string, targetListId: string, targetOrder: number) =>
    request<void>(`/cards/${cardId}/move`, {
      method: "PATCH",
      body: JSON.stringify({ targetListId, targetOrder }),
    }),
  updateCard: (cardId: string, data: { title?: string; description?: string }) =>
    request<void>(`/cards/${cardId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCard: (cardId: string) => request<void>(`/cards/${cardId}`, { method: "DELETE" }),
};
