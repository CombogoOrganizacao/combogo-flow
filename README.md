# Combogó Flow — Especificação do Projeto

Aplicação web inspirada no Trello: quadros Kanban colaborativos com atualizações em tempo real entre múltiplos usuários conectados simultaneamente ao mesmo quadro.

Este documento é a especificação completa do projeto: stack, arquitetura, modelo de dados, estrutura de pastas e regras de negócio. O objetivo é que seja possível gerar a base funcional do código a partir dele.

---

## 1. Stack tecnológica

| Camada | Tecnologia | Papel |
|---|---|---|
| Frontend | Next.js (App Router) | Rotas, SSR, páginas |
| UI | shadcn/ui + Tailwind | Componentes de interface |
| Animação | GSAP | Transições de drag-and-drop, highlights de updates em tempo real |
| Drag-and-drop | @dnd-kit/core | Mover cards entre colunas e reordenar |
| Estado/cache | React Query (ou Zustand para estado local de UI) | Sincronização de dados com backend |
| Backend | NestJS | API REST, autenticação, regras de negócio |
| Autenticação | Firebase Authentication | Login/cadastro (email+senha, Google, etc.) |
| Banco de dados | Firebase Firestore | Persistência (boards, columns, cards...) |
| Tempo real | Firestore listeners (`onSnapshot`) no client | Sincronização automática entre usuários no mesmo board |
| Validação | class-validator + class-transformer | Validação de DTOs no NestJS |

### Decisão de arquitetura de dados

O banco é **Firestore (NoSQL orientado a documentos)**, não Postgres/relacional. Isso implica:
- Sem joins reais — relações são resolvidas via **subcoleções aninhadas** (hierarquia forte) ou **arrays de IDs** (relações muitos-para-muitos leves).
- Sem "entities" de ORM (nada de `@Entity()` do TypeORM). O "schema" existe como **interfaces TypeScript** + **DTOs validados**.
- Consistência em operações concorrentes (ex: reordenar cards) é garantida via **Firestore Transactions** (`runTransaction`), não transações SQL.

### Decisão de tempo real

**Usar listeners do Firestore diretamente no client (`onSnapshot`)**, não Socket.IO. Motivo: o Firestore já entrega sincronização em tempo real nativamente; adicionar Socket.IO em paralelo seria redundante e criaria duas fontes de verdade para o mesmo dado. O NestJS não participa do broadcast de mudanças — ele cuida de autenticação, validação e regras de negócio antes de escrever no Firestore; a propagação em tempo real acontece pelo próprio Firestore.

---

## 2. Modelo de dados (Firestore)

### Estrutura de coleções

```
users/{uid}
  - displayName: string
  - email: string
  - photoURL: string | null

boards/{boardId}
  - title: string
  - ownerId: string (uid do criador)
  - createdAt: timestamp

boards/{boardId}/members/{uid}
  - role: "owner" | "editor" | "viewer"
  - joinedAt: timestamp

boards/{boardId}/labels/{labelId}
  - name: string
  - color: string (hex)

boards/{boardId}/columns/{columnId}
  - title: string
  - position: number (float, para reordenação sem reindexar tudo)

boards/{boardId}/columns/{columnId}/cards/{cardId}
  - title: string
  - description: string | null
  - position: number (float)
  - dueDate: timestamp | null
  - assigneeIds: string[] (uids)
  - labelIds: string[] (labelIds)
  - createdAt: timestamp
  - updatedAt: timestamp

boards/{boardId}/columns/{columnId}/cards/{cardId}/comments/{commentId}
  - authorId: string (uid)
  - text: string
  - createdAt: timestamp
```

### Regras de modelagem aplicadas

1. **Hierarquia forte (board → column → card → comment)**: vira subcoleção aninhada de verdade. Permite listener granular (escutar só o board aberto) e queries naturais de "todos os cards de uma coluna".
2. **Muitos-para-muitos leve (card ↔ label, card ↔ assignee)**: vira array de IDs dentro do documento do card, não coleção de junção separada.
3. **Membros do board**: subcoleção (`members/{uid}`) em vez de array simples, porque cada membro carrega metadado próprio (`role`).
4. **Posição fracionária**: `position` é float. Ao mover um card entre dois outros, calcula-se a média das posições vizinhas (ex: entre 1.0 e 2.0 → 1.5), evitando reescrever a coluna inteira a cada movimento. Reindexar (normalizar para 1, 2, 3...) só quando o espaço entre posições ficar pequeno demais (ex: diferença < 0.0001).

### Reordenação concorrente (ponto crítico)

Toda operação de mover/reordenar card ou coluna **deve** usar `firestore.runTransaction()` no backend (NestJS via Admin SDK), nunca um `update()` simples. Isso evita que dois usuários movendo cards ao mesmo tempo corrompam a posição final.

---

## 3. Estrutura do backend (NestJS)

### Árvore de pastas

```
backend/
├── src/
│   ├── firebase/
│   │   ├── firebase.module.ts       # @Global(), inicializa Admin SDK
│   │   └── firebase.provider.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── firebase-auth.guard.ts   # valida ID Token do Firebase em cada request
│   │   └── firebase-auth.strategy.ts
│   ├── boards/
│   │   ├── boards.module.ts
│   │   ├── boards.controller.ts
│   │   ├── boards.service.ts
│   │   ├── dto/
│   │   │   ├── create-board.dto.ts
│   │   │   └── update-board.dto.ts
│   │   └── entities/
│   │       └── board.entity.ts      # interface TS, não @Entity()
│   ├── members/
│   │   ├── members.module.ts
│   │   ├── members.controller.ts
│   │   ├── members.service.ts
│   │   └── entities/member.entity.ts
│   ├── columns/
│   │   ├── columns.module.ts
│   │   ├── columns.controller.ts
│   │   ├── columns.service.ts
│   │   ├── dto/
│   │   │   ├── create-column.dto.ts
│   │   │   └── reorder-column.dto.ts
│   │   └── entities/column.entity.ts
│   ├── cards/
│   │   ├── cards.module.ts
│   │   ├── cards.controller.ts
│   │   ├── cards.service.ts
│   │   ├── dto/
│   │   │   ├── create-card.dto.ts
│   │   │   ├── update-card.dto.ts
│   │   │   └── move-card.dto.ts
│   │   └── entities/card.entity.ts
│   ├── comments/
│   │   ├── comments.module.ts
│   │   ├── comments.controller.ts
│   │   ├── comments.service.ts
│   │   └── entities/comment.entity.ts
│   ├── labels/
│   │   ├── labels.module.ts
│   │   ├── labels.controller.ts
│   │   ├── labels.service.ts
│   │   └── entities/label.entity.ts
│   ├── app.module.ts
│   └── main.ts
├── .env
├── package.json
└── tsconfig.json
```

### Convenção de rotas (refletindo a hierarquia do Firestore)

```
POST   /boards
GET    /boards
GET    /boards/:boardId
PATCH  /boards/:boardId
DELETE /boards/:boardId

POST   /boards/:boardId/members
GET    /boards/:boardId/members
DELETE /boards/:boardId/members/:uid

POST   /boards/:boardId/labels
GET    /boards/:boardId/labels

POST   /boards/:boardId/columns
GET    /boards/:boardId/columns
PATCH  /boards/:boardId/columns/:columnId
PATCH  /boards/:boardId/columns/:columnId/reorder
DELETE /boards/:boardId/columns/:columnId

POST   /boards/:boardId/columns/:columnId/cards
GET    /boards/:boardId/columns/:columnId/cards
PATCH  /boards/:boardId/columns/:columnId/cards/:cardId
DELETE /boards/:boardId/columns/:columnId/cards/:cardId
PATCH  /boards/:boardId/cards/:cardId/move   # move entre colunas (recebe columnId de destino + nova position)

POST   /boards/:boardId/cards/:cardId/comments
GET    /boards/:boardId/cards/:cardId/comments
```

### Autenticação

- Todas as rotas (exceto health check) protegidas por `FirebaseAuthGuard`.
- O guard extrai o `Authorization: Bearer <idToken>` do header, valida via `admin.auth().verifyIdToken(token)`, e injeta o `uid` decodificado no `request.user`.
- Autorização por board (é membro? é owner?) é verificada dentro dos services, consultando `boards/{boardId}/members/{uid}` antes de qualquer escrita.

### Padrão de service (exemplo — CardsService)

Responsabilidades:
- `create(boardId, columnId, dto)`: calcula `position` inicial (última posição da coluna + 1), grava via Admin SDK.
- `findAllByColumn(boardId, columnId)`: lista ordenado por `position`.
- `move(boardId, cardId, targetColumnId, targetPosition)`: executa dentro de `runTransaction`, recalculando `position` fracionária.
- `update(boardId, columnId, cardId, dto)`: atualiza campos (título, descrição, assignees, labels, dueDate) + `updatedAt`.
- `remove(boardId, columnId, cardId)`: deleta o documento (e subcoleção de comments, se houver).

---

## 4. Estrutura do frontend (Next.js)

### Árvore de pastas

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # landing / lista de boards do usuário
│   │   ├── login/page.tsx
│   │   └── boards/
│   │       └── [boardId]/
│   │           └── page.tsx             # tela do quadro Kanban
│   ├── components/
│   │   ├── ui/                          # componentes shadcn/ui
│   │   ├── board/
│   │   │   ├── Board.tsx                # renderiza colunas + DndContext
│   │   │   ├── Column.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── CardModal.tsx            # detalhes do card (comments, assignees, labels)
│   │   │   └── PresenceIndicator.tsx    # avatares de quem está online no board
│   │   └── layout/
│   │       ├── Navbar.tsx
│   │       └── Sidebar.tsx
│   ├── hooks/
│   │   ├── useBoard.ts                  # onSnapshot do documento do board
│   │   ├── useColumns.ts                # onSnapshot da subcoleção columns
│   │   ├── useCards.ts                  # onSnapshot da subcoleção cards de uma coluna
│   │   ├── useAuth.ts                   # estado do Firebase Auth
│   │   └── useDragAndDrop.ts            # lógica de mover card (chama API do Nest)
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── client.ts                # inicializa Firebase client SDK
│   │   │   └── auth.ts
│   │   ├── api/
│   │   │   ├── client.ts                # wrapper fetch/axios com Bearer token
│   │   │   ├── boards.ts
│   │   │   ├── columns.ts
│   │   │   └── cards.ts
│   │   └── animations/
│   │       └── gsap-transitions.ts      # helpers de animação de card/coluna
│   ├── types/
│   │   ├── board.ts
│   │   ├── column.ts
│   │   ├── card.ts
│   │   └── comment.ts
│   └── store/
│       └── ui-store.ts                  # Zustand: modal aberto, filtros, etc.
├── .env.local
├── package.json
└── tailwind.config.ts
```

### Padrão de sincronização em tempo real (client)

1. Ao entrar em `/boards/[boardId]`, o hook `useColumns(boardId)` abre um listener `onSnapshot` na subcoleção `columns`, ordenado por `position`.
2. Para cada coluna renderizada, `useCards(boardId, columnId)` abre outro listener na subcoleção `cards` daquela coluna.
3. Toda escrita (criar/mover/editar card ou coluna) é feita via **chamada HTTP ao backend NestJS** (não escrita direta no Firestore pelo client) — o Nest valida, aplica regra de negócio/transação e grava no Firestore.
4. Como o client já está escutando via `onSnapshot`, a mudança feita pelo Nest se propaga automaticamente para todos os usuários conectados no board, incluindo quem fez a ação (sem necessidade de atualização otimista manual, embora otimista ainda melhore a percepção de responsividade).
5. GSAP anima a transição quando um card muda de posição/coluna (`FLIP` technique: capturar posição antes/depois do re-render e animar a diferença) e faz um "highlight" breve (ex: leve destaque de borda) quando a mudança vem de outro usuário, não da própria ação local.

---

## 5. Variáveis de ambiente

### Backend (`.env`)
```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 6. Regras de negócio principais

- Um usuário só pode ver/editar boards em que é membro (`boards/{boardId}/members/{uid}` existe).
- Apenas `owner` pode deletar o board ou remover outros membros.
- `editor` pode criar/mover/editar columns e cards.
- `viewer` só lê (sem POST/PATCH/DELETE).
- Ao criar um board, o criador é automaticamente adicionado como membro com `role: "owner"`.
- Posição de nova coluna/card = maior posição existente + 1000 (facilita inserções futuras com folga numérica).
- Ao mover um item para entre dois existentes, nova posição = média das posições vizinhas.
- Se a diferença entre posições vizinhas ficar menor que um limiar (ex: 0.0001), reindexar toda a coluna/board em uma transação.

---

## 7. Ordem sugerida de implementação

1. Setup do projeto Firebase (Auth + Firestore) e criação das credenciais de service account.
2. Backend: módulo `firebase` + `auth` (guard funcionando, testável via rota protegida simples).
3. Backend: módulo `boards` completo (CRUD + membership automática do owner).
4. Backend: módulos `columns` e `cards` com lógica de posição fracionária e `runTransaction`.
5. Frontend: tela de login (Firebase Auth) + listagem de boards do usuário.
6. Frontend: tela do board com colunas e cards renderizados via `onSnapshot` (sem drag-and-drop ainda).
7. Frontend: integrar `@dnd-kit` + chamadas à API do Nest para mover cards/colunas.
8. Frontend: GSAP para transições de movimento e highlight de updates remotos.
9. Features complementares: comments, labels, assignees, modal de detalhes do card.
10. Polimento: indicador de presença (quem está no board agora), estados de loading/erro, responsividade.

---

## 8. Fora de escopo inicial (mencionar, mas não implementar no MVP)

- Notificações por email/push.
- Anexos de arquivo em cards.
- Histórico de atividades (activity log) por board.
- Múltiplos workspaces por organização.
- Planos pagos / limites de uso.
