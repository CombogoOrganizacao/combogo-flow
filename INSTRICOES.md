# Kanban Colaborativo

Quadros Kanban estilo Trello, com atualização em tempo real entre múltiplos usuários conectados
ao mesmo quadro.

## Stack

**Front-end** (`/web`): Next.js, React, TypeScript, TailwindCSS, shadcn/ui, GSAP, `@dnd-kit/core`,
Zustand, Firestore (`onSnapshot`).

**Back-end** (`/api`): Node.js, NestJS, TypeScript, Firebase Authentication (verificação de token
via `firebase-admin`).

**Dados**: Firebase (Firestore + Authentication).

## Arquitetura de dados em tempo real

Este projeto usa um padrão de **escrita centralizada / leitura distribuída**:

1. O front-end **nunca escreve diretamente no Firestore**. Toda ação do usuário (criar board,
   criar lista, criar/mover card) é uma chamada HTTP autenticada (Firebase ID Token) ao back-end
   NestJS.
2. O NestJS valida a permissão do usuário (ele é membro do board?) e as regras de negócio
   (reordenação, etc.), usando o **Firebase Admin SDK**, e só então escreve no Firestore.
3. O front-end **só lê** dados, via listeners `onSnapshot` (Zustand guarda o estado local
   atualizado pelos listeners). Quando o NestJS escreve, todos os clientes conectados —
   inclusive quem disparou a ação — recebem a atualização automaticamente pelo próprio
   `onSnapshot`.

Isso evita ter regra de negócio duplicada (Security Rules vs. client) e mantém uma única fonte
de verdade para escrita. As `firestore.rules` (na raiz) refletem isso: leitura liberada para
membros do board, escrita sempre bloqueada para clientes (só o Admin SDK do backend escreve,
e o Admin SDK ignora as Security Rules).

## Modelo de dados (Firestore)

```
boards/{boardId}
  title: string
  ownerId: string
  memberIds: string[]
  createdAt: number

lists/{listId}
  boardId: string
  title: string
  order: number
  createdAt: number

cards/{cardId}
  boardId: string
  listId: string
  title: string
  description: string
  order: number
  assigneeIds: string[]
  createdAt: number
  updatedAt: number
```

## Estrutura de pastas

```
kanban-app/
├── firestore.rules          # regras de segurança do Firestore
├── web/                     # Next.js (front-end)
│   └── src/
│       ├── app/             # rotas (App Router): "/" e "/board/[boardId]"
│       ├── components/      # AuthProvider, componentes de UI e do board
│       ├── hooks/           # listeners onSnapshot (useMyBoards, useBoardListener)
│       ├── lib/
│       │   ├── firebase/    # init do client SDK + auth
│       │   └── api/         # cliente HTTP para o NestJS
│       ├── store/           # Zustand (useAuthStore, useBoardStore)
│       └── types/           # tipos de domínio (Board, List, Card)
└── api/                      # NestJS (back-end)
    └── src/
        ├── auth/            # guard de verificação do Firebase ID Token
        ├── firebase/        # init do Firebase Admin SDK / Firestore
        ├── boards/          # criar board, adicionar membro
        ├── lists/           # criar lista
        └── cards/           # criar, atualizar e mover card (drag-and-drop)
```

## Como rodar localmente

### 1. Criar um projeto Firebase

1. Crie um projeto em https://console.firebase.google.com.
2. Ative **Authentication** → método de login **Google** (o scaffold já vem com login via Google;
   outros provedores podem ser adicionados depois).
3. Ative o **Firestore** (modo produção) e publique o conteúdo de `firestore.rules` na raiz deste
   repositório (Firestore → Regras).
4. Em **Configurações do projeto → Geral**, crie um app Web e copie as credenciais
   (`apiKey`, `authDomain`, etc.) — elas vão para `web/.env.local`.
5. Em **Configurações do projeto → Contas de serviço**, gere uma nova chave privada
   (JSON) — os campos `project_id`, `client_email` e `private_key` vão para `api/.env`.

### 2. Instalar dependências

Na raiz do monorepo (usa npm workspaces):

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp web/.env.example web/.env.local
cp api/.env.example api/.env
```

Preencha os dois arquivos com as credenciais do passo 1.

> Atenção ao colar a `FIREBASE_PRIVATE_KEY` em `api/.env`: mantenha as quebras de linha como
> `\n` dentro de uma única linha entre aspas, exatamente como vem no JSON da service account.

### 4. Rodar em desenvolvimento

Em dois terminais separados, a partir da raiz:

```bash
npm run dev:api   # NestJS em http://localhost:3001
npm run dev:web   # Next.js em http://localhost:3000
```

Abra `http://localhost:3000`, faça login com Google, crie um board, listas e cards, e teste
o drag-and-drop. Abra a mesma URL em outra aba/navegador (ou peça para outra pessoa entrar)
para ver as atualizações chegando em tempo real.

## Funcionalidades implementadas

Fluxo principal (ponta a ponta):
- Login com Google, boards do usuário em tempo real
- Criar board, criar/renomear/excluir lista, criar/editar/excluir card
- Drag-and-drop de cards entre listas, com sincronização em tempo real entre todos os usuários conectados

Complementares:
- Convidar membro para um board por e-mail (`POST /boards/:id/members`, com UI no header do board)

## Próximos passos sugeridos (fora do fluxo principal)

- Excluir board, transferir propriedade (`ownerId`)
- Atribuir cards a membros (`assigneeIds` já existe no modelo, falta UI)
- Comentários e anexos nos cards
- Testes automatizados (e2e no NestJS, componentes no front)
- Deploy (ex.: Vercel para o `web`, Cloud Run/Render para a `api`)
