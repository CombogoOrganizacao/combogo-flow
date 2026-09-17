"use client";

import { AuthProvider } from "@/components/AuthProvider";
import { Board } from "@/components/board/Board";

export default function BoardPage({ params }: { params: { boardId: string } }) {
  return (
    <AuthProvider>
      <Board boardId={params.boardId} />
    </AuthProvider>
  );
}
