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
import { ArrowRight, LayoutGrid, Plus } from "lucide-react";

const boardSwatches = [
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-700",
  "from-orange-400 to-rose-500",
  "from-sky-500 to-indigo-600",
  "from-lime-500 to-emerald-700",
  "from-amber-400 to-orange-600",
];

function DashboardContent() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const { boards, loading: boardsLoading } = useMyBoards();
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [creating, setCreating] = useState(false);

  if (loading) return <Centered>Carregando…</Centered>;

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top_left,_#d9f2ee,_transparent_45%),linear-gradient(135deg,_#f5f8fa,_#e9f2f5)] px-5 text-slate-900">
        <section className="w-full max-w-md border-l-4 border-teal-600 py-3 pl-7">
          <div className="mb-8 flex items-center gap-3">
            <Image src="/cmb-icon.svg" alt="" width={42} height={42} className="rounded-lg" />
            <span className="text-lg font-bold tracking-tight">Combogó Flow</span>
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Organize o trabalho</p>
          <h1 className="mb-3 text-3xl font-semibold leading-tight">Seu time, em movimento.</h1>
          <p className="mb-7 max-w-sm text-sm leading-6 text-slate-600">Entre para acessar seus quadros e continuar de onde o trabalho acontece.</p>
          <Button onClick={() => signInWithGoogle()} className="h-10 gap-2 bg-slate-900 px-4 text-white hover:bg-slate-700">
            Entrar com Google <ArrowRight className="h-4 w-4" />
          </Button>
        </section>
      </main>
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
    <div className="min-h-screen bg-[#f5f7f8] text-slate-900">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Image
            src="/cmb-icon.svg"
            alt="Combogó Flow"
            width={30}
            height={30}
            className="rounded-md"
          />
          <h1 className="text-sm font-bold tracking-tight">Combogó Flow</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span className="hidden sm:inline">{user.displayName}</span>
          <Button variant="outline" size="sm" onClick={() => signOut()} className="h-8 border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
            Sair
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden min-h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-slate-200/80 px-4 py-7 md:block">
          <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Espaço de trabalho</p>
          <div className="mb-5 flex items-center gap-2.5 rounded-md bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200/70">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-teal-700 text-xs font-bold text-white">{user.displayName?.[0]?.toUpperCase() ?? "C"}</span>
            <span className="truncate text-xs font-semibold">{user.displayName}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-teal-50 px-3 py-2.5 text-xs font-semibold text-teal-800">
            <LayoutGrid className="h-4 w-4" /> Quadros
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Seu espaço de trabalho</p>
              <h2 className="text-2xl font-semibold tracking-tight">Quadros</h2>
            </div>
            <span className="text-xs text-slate-500">{boards.length} {boards.length === 1 ? "quadro" : "quadros"}</span>
          </div>

          <form
            className="mb-7 flex max-w-xl gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateBoard();
            }}
          >
            <Input
              aria-label="Nome do novo quadro"
              placeholder="Nome do novo quadro"
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button type="submit" disabled={creating || !newBoardTitle.trim()} className="h-10 shrink-0 gap-2 px-3">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Criar quadro</span>
            </Button>
          </form>

          {boardsLoading ? (
            <p className="text-sm text-slate-500">Carregando quadros…</p>
          ) : boards.length === 0 ? (
            <div className="border-t border-slate-200 py-8 text-sm text-slate-500">Você ainda não tem quadros.</div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {boards.map((board, index) => (
                <li key={board.id}>
                  <button
                    onClick={() => router.push(`/board/${board.id}`)}
                    className="group w-full overflow-hidden rounded-md border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    <span className={`block h-20 bg-gradient-to-br ${boardSwatches[index % boardSwatches.length]}`} />
                    <span className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
                      <span className="truncate text-sm font-semibold">{board.title}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-700" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
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
