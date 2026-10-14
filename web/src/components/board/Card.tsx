"use client";

import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlignLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import type { BoardMember, Card as CardType } from "@/types";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Markdown from "react-markdown";
import { MarkdownTextarea } from "../markdownTextArea";
import { Skeleton } from "@/components/ui/skeleton";

function MemberAvatar({ member, size = "h-6 w-6" }: { member: BoardMember; size?: string }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [member.photoURL]);

  const initials = member.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!member.photoURL || imageFailed) {
    return (
      <span
        title={member.displayName}
        className={cn(
          size,
          "flex items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-2 ring-background",
        )}
      >
        {initials}
      </span>
    );
  }

  return (
    <span className={cn(size, "relative block shrink-0 overflow-hidden rounded-full ring-2 ring-background")}>
      {!imageLoaded && <Skeleton className="absolute inset-0 rounded-full" />}
      <img
        src={member.photoURL}
        alt={member.displayName}
        title={member.displayName}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageFailed(true)}
        className={cn(size, "rounded-full object-cover transition-opacity", imageLoaded ? "opacity-100" : "opacity-0")}
      />
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
      <div className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm">
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
          "group relative rounded-md border border-slate-200/90 bg-white p-3 text-sm shadow-sm transition-[box-shadow,transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
          isDragging && "rotate-1 opacity-50 shadow-lg",
        )}
    >
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger className="flex w-full text-left">
          <div
            {...attributes}
            {...listeners}
            className="w-full cursor-grab pr-5 text-left active:cursor-grabbing"
          >
            <span className="block font-medium leading-snug text-slate-800">{card.title}</span>
            {card.description && (
              <div className="prose prose-sm mt-1 line-clamp-2 max-w-none text-xs text-slate-500">
                <Markdown>{card.description}</Markdown>
              </div>
            )}
            {card.description && <AlignLeft aria-hidden="true" className="absolute bottom-3 right-3 h-3.5 w-3.5 text-slate-400" />}
            {assignedMembers.length > 0 && (
              <div className="mt-3 flex -space-x-1">
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
          title="Excluir cartão"
          className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
          aria-label="Excluir card"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl">
          <DialogTitle className="sr-only">Editar card</DialogTitle>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold sm:text-xl"
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
