"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import type { Card as CardType } from "@/types";
import { Dialog, DialogClose, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import Markdown from "react-markdown";
import { MarkdownTextarea } from "../markdownTextArea";

export function Card({ card }: { card: CardType }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
  });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.updateCard(card.id, { title: title.trim(), description });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await api.deleteCard(card.id);
  }

  if (editing) {
    return (
      <div className="rounded-md border border-border bg-background p-3 text-sm shadow-sm">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mb-2 h-8 text-xs" />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          className="mb-2 w-full rounded-md border border-border bg-background p-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
          rows={3}
        />
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef}
      className={cn(
        "group relative rounded-md border border-border bg-background p-3 text-sm shadow-sm",
        isDragging && "opacity-50",
      )}
    >
      <Dialog>
        <DialogTrigger className="flex">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab pr-6 active:cursor-grabbing w-full"
          >
            {card.title}
            {card.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{card.description}</p>
            )}
          </div>
          <button
            onClick={handleDelete}
            className="absolute right-2 top-2 hidden text-muted-foreground hover:text-destructive group-hover:block"
            aria-label="Excluir card"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="sm:text-4xl md:text-4xl font-bold" />
          <div className="prose">
            <MarkdownTextarea value={description} onChange={setDescription} placeholder="Descrição (opcional)" />
          </div>
        </DialogContent>
      </Dialog>
    </div>


  );
}
