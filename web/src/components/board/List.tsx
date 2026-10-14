"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "./Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import type { BoardMember, Card as CardType, List as ListType } from "@/types";

export function List({ list, cards, members }: { list: ListType; cards: CardType[]; members: BoardMember[] }) {
  const { setNodeRef } = useDroppable({ id: list.id, data: { type: "list", list } });
  const [newCardTitle, setNewCardTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(list.title);

  async function handleAddCard() {
    if (!newCardTitle.trim()) return;
    setAdding(true);
    try {
      await api.createCard(list.id, newCardTitle.trim());
      setNewCardTitle("");
      setShowCardForm(false);
    } finally {
      setAdding(false);
    }
  }

  async function handleRename() {
    setEditingTitle(false);
    if (!title.trim() || title.trim() === list.title) {
      setTitle(list.title);
      return;
    }
    await api.renameList(list.id, title.trim());
  }

  async function handleDeleteList() {
    if (!confirm(`Excluir a lista "${list.title}" e todos os seus cards?`)) return;
    await api.deleteList(list.id);
  }

  return (
    <section className="flex h-full max-h-full w-[min(18rem,calc(100vw-2rem))] shrink-0 flex-col rounded-lg border border-slate-200/80 bg-[#f4f5f7] p-2.5 text-slate-800 shadow-xl shadow-slate-950/10">
      <div className="mb-2 flex min-h-9 items-center justify-between gap-2 px-1.5">
        {editingTitle ? (
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="h-8 bg-white text-sm font-semibold"
          />
        ) : (
          <h3
            className="min-w-0 flex-1 cursor-text truncate text-sm font-semibold"
            onClick={() => setEditingTitle(true)}
          >
            {list.title}
          </h3>
        )}
        <button
          type="button"
          onClick={handleDeleteList}
          title="Excluir lista"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-200 hover:text-destructive"
          aria-label="Excluir lista"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-500" aria-label={`${cards.length} cartões`}>
          {cards.length}
        </span>
      </div>

      <div ref={setNodeRef} className="flex min-h-8 flex-1 flex-col gap-2 overflow-y-auto px-0.5 pb-1">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <Card key={card.id} card={card} members={members} />
          ))}
        </SortableContext>
      </div>

      {showCardForm ? (
        <form
          className="mt-2 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAddCard();
          }}
        >
          <Input
            autoFocus
            aria-label="Título do novo cartão"
            placeholder="Insira um título para este cartão…"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setShowCardForm(false)}
            className="min-h-10 bg-white text-xs shadow-sm"
          />
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={adding || !newCardTitle.trim()} className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {adding ? "Adicionando…" : "Adicionar cartão"}
            </Button>
            <button type="button" onClick={() => setShowCardForm(false)} className="text-xs text-slate-500 hover:text-slate-800">Cancelar</button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowCardForm(true)}
          className="mt-2 flex min-h-9 items-center gap-2 rounded-md px-2 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200/80 hover:text-slate-900"
        >
          <Plus className="h-4 w-4" /> Adicionar cartão
        </button>
      )}
    </section>
  );
}
