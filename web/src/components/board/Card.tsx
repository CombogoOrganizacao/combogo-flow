"use client";

import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import type { BoardMember, Card as CardType } from "@/types";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Markdown from "react-markdown";
import { MarkdownTextarea } from "../markdownTextArea";

function MemberAvatar({ member, size = "h-6 w-6" }: { member: BoardMember; size?: string }) {
  const initials = member.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return member.photoURL ? (
    <img
      src={member.photoURL}
      alt={member.displayName}
      title={member.displayName}
      className={cn(size, "rounded-full object-cover ring-2 ring-background")}
    />
  ) : (
    <span
      title={member.displayName}
      className={cn(size, "flex items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-2 ring-background")}
    >
      {initials}
    </span>
  );
}

export function Card({ card, members }: { card: CardType; members: BoardMember[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
  });

  const [editing, setEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [assigneeIds, setAssigneeIds] = useState(card.assigneeIds ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAssigneeIds(card.assigneeIds ?? []);
  }, [card.assigneeIds]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.updateCard(card.id, { title: title.trim(), description, assigneeIds });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDialogSave() {
    await handleSave();
    setDialogOpen(false);
  }

  async function handleDelete() {
    await api.deleteCard(card.id);
  }

  function toggleAssignee(memberId: string) {
    setAssigneeIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  }

  const assignedMembers = members.filter((member) => assigneeIds.includes(member.id));

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
    <div
      ref={setNodeRef}
      className={cn(
        "group relative rounded-md border border-border bg-background p-3 text-sm shadow-sm",
        isDragging && "opacity-50",
      )}
    >
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger className="flex w-full text-left">
          <div
            {...attributes}
            {...listeners}
            className="w-full cursor-grab pr-6 active:cursor-grabbing"
          >
            {card.title}
            {card.description && (
              <div className="prose prose-sm dark:prose-invert mt-1 line-clamp-2 max-w-none text-muted-foreground">
                <Markdown>{card.description}</Markdown>
              </div>
            )}
            {assignedMembers.length > 0 && (
              <div className="mt-2 flex -space-x-1">
                {assignedMembers.map((member) => (
                  <MemberAvatar key={member.id} member={member} />
                ))}
              </div>
            )}
          </div>
        </DialogTrigger>
        <button
          type="button"
          onClick={handleDelete}
          className="absolute right-2 top-2 hidden text-muted-foreground hover:text-destructive group-hover:block"
          aria-label="Excluir card"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl">
          <DialogTitle className="sr-only">Editar card</DialogTitle>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-bold sm:text-4xl md:text-4xl"
          />
          <div className="prose">
            <MarkdownTextarea value={description} onChange={setDescription} placeholder="Descrição (opcional)" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Pessoas associadas</p>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const selected = assigneeIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleAssignee(member.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-2 py-1 text-xs transition-colors",
                      selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                    )}
                  >
                    <MemberAvatar member={member} size="h-5 w-5" />
                    <span>{member.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleDialogSave} disabled={saving || !title.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>


  );
}
