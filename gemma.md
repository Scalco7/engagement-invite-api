# Documentação Oficial - Engagement Invite API

Esta é a documentação centralizada e completa do projeto **Engagement Invite API**. Ela serve como um guia abrangente sobre a arquitetura da aplicação, arquivos de configuração, banco de dados, fluxo de desenvolvimento local e guias de implantação para futuras manutenções.

---

## 📂 1. Estrutura do Projeto

O projeto adota uma arquitetura de camadas limpa (MVC adaptada), onde cada diretório tem uma responsabilidade estrita. A pasta de geração do client Prisma agora reside fora do código-fonte, na raiz do projeto:

```text
├── generated/            # Prisma Client gerado automaticamente (Fora do src)
├── api/
│   └── index.ts          # Ponto de entrada do Vercel (Serverless Function)
├── prisma/
│   └── schema.prisma     # Modelos e definições do banco de dados (Prisma)
├── prisma.config.ts      # Configurações do Prisma 7 (CLI e Migrations)
├── src/
│   ├── app.ts            # Definição e middlewares do Express
│   ├── local.ts          # Ponto de entrada local (executa em porta local)
│   ├── controllers/      # Camada HTTP: valida requests e formata responses
│   │   └── rsvp.controller.ts
│   ├── db/
│   │   └── prisma.ts     # Singleton do Prisma Client configurado com Neon
│   ├── routes/           # Camada de Roteamento: mapeia rotas a controllers
│   │   ├── index.ts      # Roteador central (health check e sub-rotas)
│   │   └── rsvp.route.ts # Roteador específico de RSVP
│   ├── services/         # Camada de Negócio: manipula DB e lógica
│   │   └── rsvp.service.ts
│   └── utils/            # Utilitários compartilhados reutilizáveis
│       └── phone.ts      # Higienização e prefixação de telefone (+55)
├── swagger.json          # Especificação OpenAPI 3.0 do projeto
├── package.json          # Gerenciamento de scripts e dependências do Node.js
├── tsconfig.json         # Configurações do compilador TypeScript
├── vercel.json           # Configurações de empacotamento e rotas no Vercel
├── .gitignore            # Arquivos ignorados pelo Git
└── gemma.md              # Documentação oficial do projeto (este arquivo)
```

---

## 🛠️ 2. Arquitetura e Decisões de Projeto

### ⚡ 2.1 Integração Serverless com Vercel
Servidores Express tradicionais rodam em processos contínuos que escutam em uma porta. Em ambientes serverless como o Vercel:
* As requisições HTTP disparam funções efêmeras que tratam o tráfego sob demanda.
* Para acomodar o Express, usamos a regra de redirecionamento global no arquivo `vercel.json` encaminhando todas as requisições (`/(.*)`) para a pasta de funções do Vercel em `/api/index.ts`.
* O arquivo `api/index.ts` não inicializa um servidor ouvindo uma porta; ele simplesmente exporta a instância do aplicativo Express (`export default app`). O runtime do Node.js da Vercel intercepta esse export e gerencia as chamadas de requisição e resposta.

### 🔌 2.2 Conexão Otimizada com o Banco de Dados (Prisma 7 + Neon)
A arquitetura Serverless pode escalar horizontalmente e disparar centenas de funções simultâneas. Para evitar o esgotamento de conexões com o Postgres:
1. **Driver Serverless de WebSocket:** Utilizamos a biblioteca oficial `@neondatabase/serverless` junto com `@prisma/adapter-neon` e `ws`. Essa combinação permite que o Prisma faça consultas através de WebSockets rápidos em vez de conexões TCP tradicionais, permitindo maior concorrência e reaproveitamento de conexões na nuvem.
2. **Padrão Singleton:** No arquivo `src/db/prisma.ts`, o cliente Prisma é instanciado e salvo no objeto `global`. Em ambiente de desenvolvimento local (onde o recarregamento do código roda constantemente com `tsx watch`), isso impede a recriação infinita de instâncias do `PrismaClient` a cada modificação de código.

### 📐 2.3 Estrutura do Prisma 7
A partir da versão 7 do Prisma, o arquivo `schema.prisma` foi simplificado e não gerencia mais strings de conexão. A nova especificação exige:
* O desacoplamento do `DATABASE_URL` do arquivo `.prisma` para o novo arquivo de configuração global do ecossistema: `prisma.config.ts`.
* A necessidade de declarar explicitamente o driver adapter (`PrismaNeon`) no construtor do cliente do Prisma ao rodar em ambiente Node.

### 📝 2.4 Documentação Interativa com Swagger UI
Para facilitar o entendimento e teste dos endpoints da API, o **Swagger UI** foi integrado à aplicação:
* **Especificação OpenAPI 3.0 (`swagger.json`)**: Contém a descrição formal de todas as rotas, formatos de dados, parâmetros e respostas.
* **Resolução de Módulos JSON**: O compilador TypeScript foi configurado com `resolveJsonModule: true` para importar o arquivo `swagger.json` diretamente de forma segura em TypeScript.
* **Segurança do Helmet**: Configurado `contentSecurityPolicy: false` no Helmet para permitir que o CSS e os scripts inline do Swagger UI sejam renderizados sem bloqueio.
* **Empacotamento Vercel (`vercel.json`)**: Inclui a regra de empacotamento (`functions`) garantindo que as folhas de estilo estáticas do `swagger-ui-dist` sejam copiadas no bundle de produção.

### 🗂️ 2.5 Arquitetura de Camadas (Layers)
Buscando a separação clara de responsabilidade e melhoria da legibilidade do código, a API foi dividida em 4 camadas estruturais dentro da pasta `src/`:
1.  **Rotas (`routes/`)**: Apenas recebem as chamadas HTTP e as redirecionam para seus respectivos controladores.
2.  **Controladores (`controllers/`)**: São responsáveis por receber os dados do HTTP, realizar a validação de segurança e regras gramaticais estritas, chamar a camada de serviço correspondente e estruturar a resposta JSON final (cabeçalhos, mensagens de erro e códigos de status).
3.  **Serviços (`services/`)**: Responsáveis únicos pela lógica de negócio e queries persistentes com o banco de dados (Prisma). Eles não conhecem objetos do Express (como `req` ou `res`).
4.  **Utilitários (`utils/`)**: Funções auxiliares agnósticas reutilizadas entre as demais camadas (ex: higienização e formatação de números).

---

## 📂 3. Explicação Arquivo por Arquivo (File-by-File)

Abaixo está o detalhamento de cada arquivo do projeto e sua finalidade:

### ⚙️ 3.1 Arquivos de Configuração

*   **[`package.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/package.json)**
    *   **Função:** Configura metadados do projeto, dependências de produção (`express`, `cors`, `dotenv`, `helmet`, `swagger-ui-express`, `@prisma/client`, `@prisma/adapter-neon`, `@neondatabase/serverless`, `ws`), dependências de desenvolvimento (`typescript`, `tsx`, `prisma`, `@types/...`) e os scripts de execução (`dev`, `build`, `start`).
*   **[`tsconfig.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/tsconfig.json)**
    *   **Função:** Configura as opções do compilador TypeScript. Inclui `"resolveJsonModule": true` para permitir o import do arquivo `swagger.json` diretamente no código-fonte. Inclui o caminho `"generated/**/*"` na lista de inclusão do scanner de compilação.
*   **[`vercel.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/vercel.json)**
    *   **Função:** Configuração do Vercel. Inclui o bloco `functions` direcionando o empacotador a adicionar a pasta `node_modules/swagger-ui-dist/**` ao arquivo compilado do `api/index.ts`.
*   **[`prisma.config.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma.config.ts)**
    *   **Função:** Arquivo do Prisma 7 que expõe as configurações do datasource e do caminho do schema utilizando variáveis de ambiente.
*   **[`prisma/schema.prisma`](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma/schema.prisma)**
    *   **Função:** Define a infraestrutura e modelos do banco Postgres, definindo a pasta de destino do client na raiz como `../generated/prisma`.
*   **[`swagger.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/swagger.json)**
    *   **Função:** Arquivo JSON padronizado com as regras do OpenAPI 3.0 descrevendo os endpoints da API para o Swagger UI renderizar.
*   **[`.gitignore`](file:///d:/felipe/Develop/julia/engagement-invite-api/.gitignore)**
    *   **Função:** Lista arquivos locais a serem ignorados pelo controle de versão do Git (incluindo o client gerado pelo Prisma na pasta `generated/` no diretório raiz).

### 📦 3.2 Código Fonte e Pontos de Entrada

*   **[`api/index.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/api/index.ts)**
    *   **Função:** Entrada serverless padrão da Vercel. Exporta por padrão o Express configurado em `src/app`.
*   **[`src/app.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/app.ts)**
    *   **Função:** Inicializa o Express, adiciona os middlewares necessários e monta as rotas da API em `/api` e o Swagger UI na rota `/api-docs`.
*   **[`src/local.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/local.ts)**
    *   **Função:** Entrada local executando a API em porta clássica (default `3000`).
*   **[`src/db/prisma.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/db/prisma.ts)**
    *   **Função:** Inicializador de conexão singleton do Prisma utilizando drivers otimizados de WebSocket Neon, com importação vinda de `../../generated/prisma/client`.
*   **[`src/utils/phone.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/utils/phone.ts)**
    *   **Função:** Contém o helper `sanitizeAndFormatPhone` para limpar e prefixar com `+55` qualquer número telefônico brasileiro enviado.
*   **[`src/services/rsvp.service.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/services/rsvp.service.ts)**
    *   **Função:** Responsável pelas operações SQL no banco via Prisma (`createRsvp` e `getAllRsvps`).
*   **[`src/controllers/rsvp.controller.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/controllers/rsvp.controller.ts)**
    *   **Função:** Valida campos recebidos na requisição POST de RSVP, aplica a sanitização de telefone, orquestra a chamada de banco por meio da Service e trata as respostas e exceções HTTP.
*   **[`src/routes/rsvp.route.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/routes/rsvp.route.ts)**
    *   **Função:** Conecta os verbos HTTP `GET` e `POST` aos respectivos handlers `RsvpController.list` e `RsvpController.create`.
*   **[`src/routes/index.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/routes/index.ts)**
    *   **Função:** Agrupa os roteadores. Monta as rotas de infraestrutura (`/health` e `/db-test`) e delega as rotas de negócios `/rsvp` ao `rsvp.route.ts`.

---

## 🔑 4. Variáveis de Ambiente (.env)

A aplicação utiliza as seguintes chaves de ambiente:

| Variável | Obrigatório | Descrição | Exemplo de Valor |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Sim** | String de conexão completa com o Neon Postgres. | `postgresql://user:pass@ep-cool-fog-1234.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `PORT` | Não | Porta onde o servidor Express local irá escutar (Local apenas). | `3000` |
| `NODE_ENV` | Não | Indica se o ambiente está em `development` ou `production`. | `development` |

---

## 🚀 5. Guia Completo de Desenvolvimento Local

Para clonar e testar esta API em sua máquina, siga rigorosamente as etapas abaixo:

### Passo 1: Instalar Dependências
```bash
npm install
```

### Passo 2: Configurar o Arquivo `.env`
Crie o arquivo `.env` na raiz do projeto:
```env
DATABASE_URL="postgresql://usuario:senha@endereco-do-banco.neon.tech/dbname?sslmode=require"
```

### Passo 3: Gerar Código do Prisma Client
```bash
npx prisma generate
```

### Passo 4: Executar o Servidor Local
```bash
npm run dev
```
O console exibirá:
```text
[server]: Server is running at http://localhost:3000
```
*Acesse a documentação interativa local em:* `http://localhost:3000/api-docs`

---

## ☁️ 6. Guia de Configuração e Deploy na Vercel

### 6.1 Configurando o Banco de Dados (Vercel Storage)
1. Entre no painel da **Vercel** -> Vá para a aba **Storage**.
2. Clique em **Create Database** -> Escolha **Postgres** (Neon).
3. Após criar, a variável `DATABASE_URL` será associada automaticamente ao Vercel.

### 6.2 Sincronizando Variáveis Localmente
1. Vincule seu diretório local ao projeto Vercel:
   ```bash
   vercel link
   ```
2. Puxe as variáveis do painel:
   ```bash
   vercel env pull
   ```

---

## 📊 7. Modelagem e Comandos do Prisma 7

### 7.1 Modelo de RSVP (`Rsvp`)
```prisma
model Rsvp {
  id           String  @id @default(uuid())
  name         String
  phone_number String
  will_go      Boolean
}
```

### 7.2 Comandos Úteis do Prisma 7
*   **Sincronizar Schema com Banco (Sem Migrations):** `npx prisma db push`
*   **Criar Migração Oficial:** `npx prisma migrate dev --name nome_da_mudanca`
*   **Interface Visual do Banco:** `npx prisma studio`

---

## 🛣️ 8. Especificação Completa das Rotas e Endpoints

### 8.1 GET `/api-docs`
*   **Descrição:** Documentação interativa Swagger UI.
*   **Método:** `GET`
*   **Response:** Página HTML com interface interativa Swagger.

### 8.2 GET `/`
*   **Descrição:** Rota principal de verificação básica da API.
*   **Método:** `GET`
*   **Response (JSON):**
    ```json
    {
      "message": "Welcome to the Engagement Invite API",
      "status": "online",
      "version": "1.0.0",
      "documentation": "/api-docs"
    }
    ```

### 8.3 GET `/api`
*   **Descrição:** Retorna o status base do roteador da API.
*   **Método:** `GET`
*   **Response (JSON):**
    ```json
    {
      "message": "Hello from the Engagement Invite API Router!"
    }
    ```

### 8.4 GET `/api/health`
*   **Descrição:** Health check que detalha o tempo de atividade (`uptime`) da API.
*   **Método:** `GET`
*   **Response (JSON):**
    ```json
    {
      "status": "ok",
      "timestamp": "2026-06-17T23:03:00.000Z",
      "uptime": 25.43
    }
    ```

### 8.5 GET `/api/db-test`
*   **Descrição:** Testa a conexão com o Postgres executando query nativa `SELECT NOW()`.
*   **Método:** `GET`
*   **Response (JSON):**
    ```json
    {
      "status": "connected",
      "result": [ { "db_time": "2026-06-17T23:05:12.456Z" } ]
    }
    ```

### 8.6 GET `/api/rsvp`
*   **Descrição:** Retorna a lista de todas as confirmações de presença (RSVPs) cadastradas no banco de dados.
*   **Método:** `GET`
*   **Response de Sucesso (JSON - 200):**
    ```json
    {
      "status": "success",
      "count": 1,
      "data": [
        {
          "id": "a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6",
          "name": "Maria Silva",
          "phone_number": "+5511999999999",
          "will_go": true
        }
      ]
    }
    ```

### 8.7 POST `/api/rsvp`
*   **Descrição:** Valida e salva uma nova resposta de convite (aceito/rejeitado) no banco.
*   **Método:** `POST`
*   **Request Body (JSON):**
    ```json
    {
      "name": "Maria Silva",
      "phone_number": "11 99999-9999",
      "will_go": true
    }
    ```
*   **Response de Sucesso (JSON - 201):**
    ```json
    {
      "status": "success",
      "message": "Confirmação de convite salva com sucesso!",
      "data": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6",
        "name": "Maria Silva",
        "phone_number": "+5511999999999",
        "will_go": true
      }
    }
    ```
*   **Response de Erro de Validação (JSON - 400):**
    ```json
    {
      "status": "error",
      "message": "Falha de validação nos dados enviados.",
      "errors": [
        "O campo 'name' deve ter pelo menos 2 caracteres.",
        "O número de telefone fornecido em 'phone_number' é muito curto..."
      ]
    }
    ```

---

## 📝 9. Histórico de Alterações (Changelog)

### [17/06/2026] - Correção de Inicialização e Falha de Conexão (ECONNREFUSED)
*   **Importação Antecipada do dotenv**:
    *   Adicionado `import 'dotenv/config'` no topo de [src/db/prisma.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/db/prisma.ts) para evitar race conditions onde as variáveis de ambiente não haviam sido carregadas no momento de inicializar o Prisma.
*   **Compatibilidade de Variáveis do Vercel Storage**:
    *   Ajustada a string de conexão para buscar em cadeia `DATABASE_URL`, `POSTGRES_PRISMA_URL` e `POSTGRES_URL`. Isso garante compatibilidade com as chaves de conexão automática injetadas pelo painel do Vercel Storage.

### [17/06/2026] - Correção do Script de Build para deploy no Vercel
*   **Ajuste no package.json**:
    *   Modificado o script `build` em [package.json](file:///d:/felipe/Develop/julia/engagement-invite-api/package.json) de `"tsc"` para `"prisma generate && tsc"`.
    *   Isso garante que, durante o deploy no Vercel (onde a pasta `generated/` ignorada no `.gitignore` está ausente), o Prisma Client seja gerado antes de iniciar a compilação do TypeScript, evitando o erro de compilação `TS2307` por falta das declarações de tipos do Prisma.

### [17/06/2026] - Refatoração de Arquitetura em Camadas e Reorganização do Prisma
*   **Refatoração Arquitetural**:
    *   Código Express modularizado sob a estrutura de 4 camadas: **Rotas** (`src/routes/`), **Controladores** (`src/controllers/`), **Serviços** (`src/services/`) e **Utilitários** (`src/utils/`).
    *   Criado o utilitário [src/utils/phone.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/utils/phone.ts) contendo a função de sanitização de telefone.
    *   Criada a Service [src/services/rsvp.service.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/services/rsvp.service.ts) encapsulando chamadas ao banco com Prisma.
    *   Criado o Controller [src/controllers/rsvp.controller.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/controllers/rsvp.controller.ts) gerenciando validações e respostas HTTP.
    *   Criado o roteador modular [src/routes/rsvp.route.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/routes/rsvp.route.ts) integrado ao roteador central.
*   **Relocalização do Prisma Client**:
    *   Modificado o caminho de compilação em [prisma/schema.prisma](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma/schema.prisma) de `../src/generated/prisma` para a raiz `../generated/prisma`.
    *   Atualizado o arquivo [tsconfig.json](file:///d:/felipe/Develop/julia/engagement-invite-api/tsconfig.json) para incluir `"generated/**/*"` na compilação do TypeScript.
    *   Ajustado o path de importação no singleton [src/db/prisma.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/db/prisma.ts) para `../../generated/prisma/client`.
    *   Deletada a pasta antiga obsoleta `src/generated`.

### [17/06/2026] - Criação da Tabela de RSVP, Validações e Regra de Telefone (+55)
*   **Banco de Dados (Prisma)**:
    *   Modificado o schema substituindo `Guest` por `Rsvp`.
    *   Regerado o Prisma Client via `npx prisma generate`.
*   **Implementação das Rotas e Regras de Negócio**:
    *   Criada lógica de higienização de telefones e prefixo `+55` em [src/routes/index.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/routes/index.ts).
    *   Implementadas validações com códigos HTTP 400.
    *   Criadas as rotas `POST /api/rsvp` e `GET /api/rsvp` no banco de dados com Prisma.
*   **Documentação e Swagger**:
    *   Atualizado o arquivo [swagger.json](file:///d:/felipe/Develop/julia/engagement-invite-api/swagger.json).

### [17/06/2026] - Integração do Swagger UI para Documentação da API
*   **Instalação de Dependências**:
    *   Instalada a biblioteca `swagger-ui-express` e sua tipagem `@types/swagger-ui-express`.
*   **Configuração de TypeScript e Assets**:
    *   Modificado [tsconfig.json](file:///d:/felipe/Develop/julia/engagement-invite-api/tsconfig.json) ativando `"resolveJsonModule": true`.
    *   Modificado [vercel.json](file:///d:/felipe/Develop/julia/engagement-invite-api/vercel.json) para incluir `swagger-ui-dist` nas Serverless Functions do Vercel.
*   **Roteamento e Visualização**:
    *   Criado o arquivo descritivo [swagger.json](file:///d:/felipe/Develop/julia/engagement-invite-api/swagger.json).
    *   Acoplado o Swagger UI no endpoint `/api-docs` dentro do arquivo [src/app.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/app.ts) desativando CSP no Helmet.
*   **Correção de CORS e Mixed Content**:
    *   Ajustado o array `servers` em `swagger.json` para usar URL relativa (`"/"`).

### [17/06/2026] - Preparação e Consolidação de Documentação
*   **Ajuste de README e Documentação:**
    *   Criado o arquivo [README.md](file:///d:/felipe/Develop/julia/engagement-invite-api/README.md).
    *   Centralizado e enriquecido o arquivo [gemma.md](file:///d:/felipe/Develop/julia/engagement-invite-api/gemma.md).

### [17/06/2026] - Integração do Vercel Storage (Neon Postgres) com Prisma 7
*   **Instalação de Dependências:**
    *   Prisma CLI, Prisma Client, `@prisma/adapter-neon`, `@neondatabase/serverless`, `ws` e `@types/ws`.
*   **Estrutura de Banco:**
    *   Criado `prisma.config.ts` e configurado `schema.prisma`.
    *   Criação de singleton de conexão em [src/db/prisma.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/db/prisma.ts) e rota de testes `/api/db-test`.

### [17/06/2026] - Inicialização do Projeto
*   **Configurações do Projeto:**
    *   Criação inicial de arquivos base (`package.json`, `tsconfig.json`, `vercel.json` e `.gitignore`).
*   **Criação do Servidor:**
    *   Desenvolvimento do ponto de entrada do Express (`src/app.ts`), ponto de entrada local (`src/local.ts`), ponto de entrada do Vercel (`api/index.ts`) e o roteador de rotas base (`src/routes/index.ts`).
