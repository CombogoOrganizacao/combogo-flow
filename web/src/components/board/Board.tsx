"use client";

import { useEffect, useRef, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import gsap from "gsap";
import { useBoardStore } from "@/store/useBoardStore";
import { useBoardListener } from "@/hooks/useBoardListener";
import { List } from "./List";
import { Card as CardComponent } from "./Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import type { BoardMember, Card } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import "./bg.css"

export function Board({ boardId }: { boardId: string }) {
  const { loading } = useBoardListener(boardId);
  const board = useBoardStore((s) => s.board);
  const lists = useBoardStore((s) => s.lists);
  const cards = useBoardStore((s) => s.cards);
  const cardsByList = useBoardStore((s) => s.cardsByList);

  const [newListTitle, setNewListTitle] = useState("");
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    let active = true;
    setMembers([]);
    api.getBoardMembers(boardId)
      .then((boardMembers) => {
        if (active) setMembers(boardMembers);
      })
      .catch((err) => {
        if (active) setInviteMessage(err instanceof Error ? err.message : "Não foi possível carregar os membros.");
      });

    return () => {
      active = false;
    };
  }, [boardId, board?.memberIds]);

  // Animação de entrada das colunas quando o board carrega/atualiza
  useEffect(() => {
    if (!containerRef.current || loading) return;
    gsap.fromTo(
      containerRef.current.children,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: "power2.out" },
    );
  }, [loading, lists.length]);

  async function handleAddList() {
    if (!newListTitle.trim()) return;
    await api.createList(boardId, newListTitle.trim());
    setNewListTitle("");
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMessage(null);
    try {
      await api.addMember(boardId, inviteEmail.trim());
      setInviteMessage(`${inviteEmail.trim()} adicionado ao board.`);
      setInviteEmail("");
    } catch (err) {
      setInviteMessage(err instanceof Error ? err.message : "Não foi possível convidar.");
    } finally {
      setInviting(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeCardData = cards.find((c) => c.id === active.id);
    if (!activeCardData) return;

    // over pode ser um card (solto em cima de outro) ou a área vazia de uma lista
    const overIsList = lists.some((l) => l.id === over.id);
    const targetListId = overIsList ? String(over.id) : cards.find((c) => c.id === over.id)?.listId;
    if (!targetListId) return;

    const targetCards = cardsByList(targetListId).filter((c) => c.id !== active.id);
    const overIndex = overIsList
      ? targetCards.length
      : targetCards.findIndex((c) => c.id === over.id);
    const targetOrder = overIndex === -1 ? targetCards.length : overIndex;

    if (targetListId === activeCardData.listId && targetOrder === activeCardData.order) return;

    await api.moveCard(activeCardData.id, targetListId, targetOrder);
  }

  if (loading) return <p className="p-8 text-sm text-muted-foreground">Carregando quadro…</p>;
  if (!board) return <p className="p-8 text-sm text-muted-foreground">Quadro não encontrado.</p>;

  return (
    <div className="flex h-screen min-h-[480px] flex-col overflow-hidden text-slate-900 bgg">
      <header className="flex min-h-14 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src="/cmb-icon.svg"
            alt="Combogó Flow"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="hidden text-sm font-bold tracking-tight text-slate-800 sm:inline">Combogó Flow</span>
        </div>
        <Link href="/" className="hidden text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 sm:block">Meus quadros</Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-white/20 bg-slate-950/10 px-4 py-3 text-white backdrop-blur-sm sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">Quadro Kanban</p>
          <h2 className="mt-0.5 truncate text-lg font-semibold">{board.title}</h2>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {members.length > 0 && (
            <div className="flex items-center -space-x-2" aria-label={`${members.length} membros no quadro`}>
              {members.slice(0, 5).map((member) => (
                <span
                  key={member.id}
                  title={member.displayName}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#247eaa] bg-white text-[10px] font-bold text-slate-700"
                >
                  {member.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              ))}
              {members.length > 5 && <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#247eaa] bg-slate-100 text-[10px] font-semibold text-slate-700">+{members.length - 5}</span>}
            </div>
          )}
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleInvite();
            }}
          >
            <label className="sr-only" htmlFor="invite-email">Convidar por e-mail</label>
            <Input
              id="invite-email"
              type="email"
              placeholder="E-mail do membro"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-9 w-40 border-white/25 bg-white/95 text-xs text-slate-800 placeholder:text-slate-400 sm:w-52"
            />
            <Button type="submit" size="sm" disabled={inviting} className="h-9 gap-1.5 bg-white text-slate-800 hover:bg-slate-100">
              <Users className="h-3.5 w-3.5" />
              <span>{inviting ? "Enviando" : "Convidar"}</span>
            </Button>
          </form>
        </div>
        {inviteMessage && (
          <p role="status" className="w-full text-xs text-white/85">{inviteMessage}</p>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div ref={containerRef} className="flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden p-3 sm:gap-4 sm:p-5">
          {lists.map((list) => (
            <List key={list.id} list={list} cards={cardsByList(list.id)} members={members} />
          ))}

          <form
            className="flex h-fit w-[min(18rem,calc(100vw-2rem))] shrink-0 flex-col gap-2 rounded-lg border border-white/35 bg-white/20 p-3 shadow-sm backdrop-blur-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAddList();
            }}
          >
            <label htmlFor="new-list-title" className="text-xs font-semibold text-white/90">Nova lista</label>
            <Input
              id="new-list-title"
              placeholder="Nova lista"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              className="h-9 border-white/40 bg-white/95 text-xs"
            />
            <Button type="submit" size="sm" disabled={!newListTitle.trim()} className="justify-start gap-2 bg-slate-900/80 text-white hover:bg-slate-900">
              <Plus className="h-4 w-4" /> Adicionar lista
            </Button>
          </form>
        </div>

        <DragOverlay>{activeCard ? <CardComponent card={activeCard} members={members} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
