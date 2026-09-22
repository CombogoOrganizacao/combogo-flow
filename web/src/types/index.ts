export interface Board {
  id: string;
  title: string;
  ownerId: string;
  memberIds: string[];
  createdAt: number;
}

export interface BoardMember {
  id: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

export interface List {
  id: string;
  boardId: string;
  title: string;
  order: number;
  createdAt: number;
}

export interface Card {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description?: string;
  order: number;
  assigneeIds: string[];
  createdAt: number;
  updatedAt: number;
}
