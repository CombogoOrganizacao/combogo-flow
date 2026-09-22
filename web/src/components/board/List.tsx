"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Trash2 } from "lucide-react";
import { Card } from "./Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import type { BoardMember, Card as CardType, List as ListType } from "@/types";

export function List({ list, cards, members }: { list: ListType; cards: CardType[]; members: BoardMember[] }) {
  const { setNodeRef } = useDroppable({ id: list.id, data: { type: "list", list } });
  const [newCardTitle, setNewCardTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(list.title);

  async function handleAddCard() {
    if (!newCardTitle.trim()) return;
    setAdding(true);
    try {
      await api.createCard(list.id, newCardTitle.trim());
      setNewCardTitle("");
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
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-gray-900/20 p-3 backdrop-blur-md shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        {editingTitle ? (
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="h-7 text-xs font-semibold"
          />
        ) : (
          <h3
            className="cursor-text truncate text-sm font-semibold"
            onClick={() => setEditingTitle(true)}
          >
            {list.title}
          </h3>
        )}
        <button
          onClick={handleDeleteList}
          className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
          aria-label="Excluir lista"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div ref={setNodeRef} className="flex min-h-[8px] flex-col gap-2">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <Card key={card.id} card={card} members={members} />
          ))}
        </SortableContext>
      </div>

      <div className="mt-3 flex gap-1">
        <Input
          placeholder="Novo card"
          value={newCardTitle}
          onChange={(e) => setNewCardTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCard()}
          className="h-8 text-xs"
        />
        <Button size="sm" onClick={handleAddCard} disabled={adding}>
          +
        </Button>
      </div>
    </div>
  );
}
