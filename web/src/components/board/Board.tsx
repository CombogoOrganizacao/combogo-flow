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
import type { Card } from "@/types";
import Image from "next/image";
import Link from "next/link";
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
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

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
    <div className="flex h-screen flex-col bgg">
      <header className="flex items-center justify-between border-b border-border p-4 bg-black/40 backdrop-blur-2xl">
        <Link href="/" className="flex gap-2 items-center">
          <Image
            src="/cmb-icon.svg"
            alt="Combogó Flow"
            width={32}
            height={32}
            className="rounded-md"
          />
          <h1 className="text-xl font-semibold">Combogó Flow</h1>
          <h1 className="text-lg font-semibold"> - {board.title}</h1>
        </Link>
        
        <div className="flex items-center gap-2">
          <Input
            placeholder="Convidar por e-mail"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            className="h-8 w-52 text-xs"
          />
          <Button size="sm" variant="outline" onClick={handleInvite} disabled={inviting}>
            Convidar
          </Button>
        </div>
      </header>
      {inviteMessage && (
        <p className="border-b border-border bg-muted px-4 py-1 text-xs text-muted-foreground">
          {inviteMessage}
        </p>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div ref={containerRef} className="flex flex-1 gap-4 overflow-x-auto p-4 ">
          {lists.map((list) => (
            <List key={list.id} list={list} cards={cardsByList(list.id)} />
          ))}

          <div className="flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-dashed border-border p-3">
            <Input
              placeholder="Nova lista"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddList()}
              className="h-8 text-xs"
            />
            <Button size="sm" onClick={handleAddList}>
              Adicionar lista
            </Button>
          </div>
        </div>

        <DragOverlay>{activeCard ? <CardComponent card={activeCard} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
