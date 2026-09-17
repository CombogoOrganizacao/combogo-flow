"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/useAuthStore";
import { useMyBoards } from "@/hooks/useMyBoards";
import { signInWithGoogle, signOut } from "@/lib/firebase/auth";
import { api } from "@/lib/api/client";
import Image from "next/image";

function DashboardContent() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const { boards, loading: boardsLoading } = useMyBoards();
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [creating, setCreating] = useState(false);

  if (loading) return <Centered>Carregando…</Centered>;

  if (!user) {
    return (
      <Centered>
        <h1 className="mb-6 text-2xl font-semibold">Kanban Colaborativo</h1>
        <Button onClick={() => signInWithGoogle()}>Entrar com Google</Button>
      </Centered>
    );
  }

  async function handleCreateBoard() {
    if (!newBoardTitle.trim()) return;
    setCreating(true);
    try {
      const { id } = await api.createBoard(newBoardTitle.trim());
      setNewBoardTitle("");
      router.push(`/board/${id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-10xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <Image
            src="/cmb-icon.svg"
            alt="Combogó Flow"
            width={32}
            height={32}
            className="rounded-md"
          />
          <h1 className="text-xl font-semibold">Combogó Flow</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{user.displayName}</span>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            Sair
          </Button>
        </div>
      </header>

      <div className="mb-6 flex gap-2">
        <Input
          placeholder="Nome do novo quadro"
          value={newBoardTitle}
          onChange={(e) => setNewBoardTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
        />
        <Button onClick={handleCreateBoard} disabled={creating} className="w-40">
          Criar quadro
        </Button>
      </div>

      {boardsLoading ? (
        <p className="text-sm text-muted-foreground">Carregando quadros…</p>
      ) : boards.length === 0 ? (
        <p className="text-sm text-muted-foreground">Você ainda não tem quadros.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {boards.map((board) => (
            <li key={board.id}>
              <button
                onClick={() => router.push(`/board/${board.id}`)}
                className="flex h-24 w-full items-center justify-center rounded-lg border border-border bg-muted p-4 text-center font-medium hover:opacity-80"
              >
                {board.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center">{children}</div>;
}

export default function Home() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
