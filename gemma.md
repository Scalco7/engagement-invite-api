# Documentação Oficial - Engagement Invite API

Esta é a documentação centralizada e completa do projeto **Engagement Invite API**. Ela serve como um guia abrangente sobre a arquitetura da aplicação, arquivos de configuração, banco de dados, fluxo de desenvolvimento local e guias de implantação para futuras manutenções.

---

## 📖 1. Visão Geral do Projeto

A **Engagement Invite API** é um back-end desenvolvido em **Node.js** utilizando o framework **Express** escrito em **TypeScript**. O projeto foi arquitetado especificamente para rodar no modelo **Serverless da Vercel** com conexões otimizadas ao **Vercel Storage (Neon Postgres)** usando a versão mais recente do **Prisma ORM (v7)**.

---

## 🛠️ 2. Arquitetura e Decisões de Projeto

### ⚡ 2.1 Integração Serverless com Vercel
Servidores Express tradicionais rodam em processos contínuos que escutam em uma porta (ex: `app.listen()`). Em ambientes serverless como o Vercel:
* As requisições HTTP disparam funções efêmeras que tratam o tráfego sob demanda.
* Para acomodar o Express, usamos a regra de redirecionamento global no arquivo `vercel.json` encaminhando todas as requisições (`/(.*)`) para a pasta de funções do Vercel em `/api/index.ts`.
* O arquivo `api/index.ts` não inicializa um servidor ouvindo uma porta; ele simplesmente exporta a instância do aplicativo Express (`export default app`). O runtime do Node.js da Vercel intercepta esse export e gerencia as chamadas de requisição e resposta.

### 🔌 2.2 Conexão Otimizada com o Banco de Dados (Prisma 7 + Neon)
A arquitetura Serverless pode escalar horizontalmente e disparar centenas de funções simultâneas. Se cada função abrir uma conexão clássica com o Postgres, o limite de conexões do banco de dados será esgotado rapidamente (Database Connection Exhaustion). Para evitar isso:
1. **Driver Serverless de WebSocket:** Utilizamos a biblioteca oficial `@neondatabase/serverless` junto com `@prisma/adapter-neon` e `ws`. Essa combinação permite que o Prisma faça consultas através de WebSockets rápidos em vez de conexões TCP tradicionais, permitindo maior concorrência e reaproveitamento de conexões na nuvem.
2. **Padrão Singleton:** No arquivo `src/db/prisma.ts`, o cliente Prisma é instanciado e salvo no objeto `global`. Em ambiente de desenvolvimento local (onde o recarregamento do código roda constantemente com `tsx watch`), isso impede a recriação infinita de instâncias do `PrismaClient` a cada modificação de código.

### 📐 2.3 Estrutura do Prisma 7
A partir da versão 7 do Prisma, o arquivo `schema.prisma` foi simplificado e não gerencia mais strings de conexão. A nova especificação exige:
* O desacoplamento do `DATABASE_URL` do arquivo `.prisma` para o novo arquivo de configuração global do ecossistema: `prisma.config.ts`.
* A necessidade de declarar explicitamente o driver adapter (`PrismaNeon`) no construtor do cliente do Prisma ao rodar em ambiente Node.

---

## 📂 3. Explicação Arquivo por Arquivo (File-by-File)

Abaixo está o detalhamento de cada arquivo do projeto e sua finalidade:

### ⚙️ 3.1 Arquivos de Configuração

*   **[`package.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/package.json)**
    *   **Função:** Configura metadados do projeto, dependências de produção (`express`, `cors`, `dotenv`, `helmet`, `@prisma/client`, `@prisma/adapter-neon`, `@neondatabase/serverless`, `ws`), dependências de desenvolvimento (`typescript`, `tsx`, `prisma`, `@types/...`) e os scripts de execução:
        *   `dev`: Executa o código TypeScript localmente usando o runner rápido `tsx` com watch mode (`tsx watch src/local.ts`).
        *   `build`: Compila o TypeScript em JavaScript nativo na pasta `/dist` via comando `tsc`.
        *   `start`: Executa o build de produção compilado (`node dist/src/local.js`).
*   **[`tsconfig.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/tsconfig.json)**
    *   **Função:** Configura as opções do compilador TypeScript. Define o target de compilação como `ES2022`, define a resolução de módulos como `node`, ativa a verificação estrita de tipos (`strict: true`), e mapeia as pastas de entrada (`src` e `api`) e saída (`dist`).
*   **[`vercel.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/vercel.json)**
    *   **Função:** Arquivo de configuração de rotas e comportamento do Vercel. Contém o bloco `rewrites` que direciona 100% das requisições externas para o arquivo de entrada da Serverless Function (`/api/index.ts`).
*   **[`prisma.config.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma.config.ts)**
    *   **Função:** Novo arquivo introduzido no Prisma 7. Ele carrega as variáveis de ambiente através de `dotenv/config` e define a configuração que a CLI do Prisma utilizará para rodar migrações locais e comandos de banco (ex: `npx prisma db push`), mapeando o caminho do schema e a URL do banco a partir de `process.env.DATABASE_URL`.
*   **[`prisma/schema.prisma`](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma/schema.prisma)**
    *   **Função:** Define a infraestrutura do banco de dados (schema).
        *   Define o gerador `prisma-client` com saída para o diretório `src/generated/prisma`.
        *   Declara o provedor do datasource como `postgresql` (sem o campo `url`, que agora reside em `prisma.config.ts`).
        *   Define os modelos de dados da aplicação (atualmente inclui o modelo `Guest` para controle dos convidados).
*   **[`.gitignore`](file:///d:/felipe/Develop/julia/engagement-invite-api/.gitignore)**
    *   **Função:** Lista pastas e arquivos locais que não devem ser salvos no versionamento do Git (como `node_modules/`, `dist/`, configurações locais do Vercel `.vercel/` e o arquivo sensível `.env`).

### 📦 3.2 Código Fonte e Pontos de Entrada

*   **[`api/index.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/api/index.ts)**
    *   **Função:** Ponto de entrada padrão da Vercel. Importa a instância configurada do Express de `src/app` e a exporta como default. Esse arquivo é compilado dinamicamente pelo builder da Vercel.
*   **[`src/app.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/app.ts)**
    *   **Função:** Define e configura o núcleo da aplicação Express:
        *   Carrega variáveis com `dotenv.config()`.
        *   Adiciona segurança HTTP através do middleware `helmet()`.
        *   Configura compartilhamento de recursos externos usando `cors()`.
        *   Define analisadores de corpo JSON e urlencoded.
        *   Monta as rotas principais em `/api` (importado de `src/routes/index.ts`).
        *   Define uma rota raiz `/` padrão para identificar se a API está online.
*   **[`src/local.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/local.ts)**
    *   **Função:** Ponto de entrada exclusivo para desenvolvimento e teste local. Importa o aplicativo do `src/app.ts` e executa a escuta clássica na porta configurada (default `3000`), exibindo o log de sucesso no terminal.
*   **[`src/db/prisma.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/db/prisma.ts)**
    *   **Função:** Gerenciador do ciclo de vida da conexão com o banco de dados. Configura o construtor do WebSocket da Neon (`neonConfig.webSocketConstructor = ws`), instancia o pool de conexão através de `PrismaNeon` e exporta o cliente singleton `prisma` pronto para executar consultas.
*   **[`src/routes/index.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/routes/index.ts)**
    *   **Função:** O arquivo de roteamento da API. Centraliza a declaração dos endpoints expostos, gerenciando requisições e respostas das rotas como `/health` e `/db-test`.

---

## 🔑 4. Variáveis de Ambiente (.env)

A aplicação utiliza as seguintes chaves de ambiente:

| Variável | Obrigatório | Descrição | Exemplo de Valor |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Sim** | String de conexão completa com o Neon Postgres. | `postgresql://user:pass@ep-cool-fog-1234.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `PORT` | Não | Porta onde o servidor Express local irá escutar (Localpenas). | `3000` |
| `NODE_ENV` | Não | Indica se o ambiente está em `development` ou `production`. | `development` |

---

## 🚀 5. Guia Completo de Desenvolvimento Local

Para clonar e testar esta API em sua máquina, siga rigorosamente as etapas abaixo:

### Passo 1: Instalar Dependências
No diretório raiz do projeto, instale os pacotes definidos no `package.json`:
```bash
npm install
```

### Passo 2: Configurar o Arquivo `.env`
Crie um arquivo chamado `.env` na raiz do projeto e defina a variável `DATABASE_URL` com as credenciais do seu banco de dados Postgres (fornecidas pelo Neon/Vercel):
```env
DATABASE_URL="postgresql://usuario:senha@endereco-do-banco.neon.tech/dbname?sslmode=require"
```

### Passo 3: Gerar Código do Prisma Client
Sempre que o arquivo `prisma/schema.prisma` for alterado ou ao baixar o projeto pela primeira vez, você precisa rodar o gerador para criar a tipagem estática do cliente:
```bash
npx prisma generate
```
*Isso gerará os arquivos tipados dentro da pasta `src/generated/prisma`.*

### Passo 4: Executar o Servidor Local
Inicie a API em modo de desenvolvimento com hot-reload automático:
```bash
npm run dev
```
O console exibirá:
```text
[server]: Server is running at http://localhost:3000
```

### Passo 5: Testar Compilação antes de Comitar
Para garantir que não há erros de tipo TypeScript que possam quebrar o deploy na Vercel, execute:
```bash
npm run build
```

---

## ☁️ 6. Guia de Configuração e Deploy na Vercel

Siga estas instruções para publicar a API em produção no Vercel e vinculá-la ao banco de dados:

### 6.1 Configurando o Banco de Dados (Vercel Storage)
1. Entre no painel da **Vercel** e acesse a conta do seu projeto.
2. Navegue até a aba **Storage** no topo do painel.
3. Clique em **Create Database** (ou Connect Database).
4. Selecione **Postgres** (fornecido por Neon) e clique em Continue.
5. Aceite os termos, escolha a região mais próxima de onde sua API vai rodar e clique em **Create**.
6. A Vercel provisionará o banco Neon e injetará automaticamente as credenciais em suas Variáveis de Ambiente do Projeto (`DATABASE_URL`, `POSTGRES_URL`, etc.).

### 6.2 Sincronizando Variáveis Localmente
Para obter a credencial real gerada pelo painel da Vercel e usá-la localmente:
1. Certifique-se de ter a CLI do Vercel instalada (`npm install -g vercel`).
2. Vincule seu diretório local ao projeto Vercel rodando:
   ```bash
   vercel link
   ```
3. Puxe as variáveis de ambiente criadas no painel diretamente para um arquivo local:
   ```bash
   vercel env pull
   ```
   *Isso criará ou atualizará o arquivo `.env.local` ou `.env` contendo a credencial oficial.*

### 6.3 Realizando Deploy do Projeto
Toda vez que você realizar um push para a branch principal do seu repositório conectado (ex: `main`), o Vercel irá disparar o deploy automaticamente.
Se desejar fazer o deploy manualmente por linha de comando:
```bash
vercel --prod
```

---

## 📊 7. Modelagem e Guia de Comandos do Prisma 7

### 7.1 Modelo Inicial (`Guest`)
Atualmente, o banco possui a tabela `Guest` para registrar convidados:
```prisma
model Guest {
  id        String   @id @default(uuid())
  name      String
  email     String?
  confirmed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 7.2 Comandos Úteis do Prisma 7

*   **Sincronizar Schema com Banco (Sem Migrations - bom para testes rápidos):**
    ```bash
    npx prisma db push
    ```
    *Envia as tabelas definidas em `schema.prisma` diretamente ao banco configurado no `prisma.config.ts`.*
*   **Criar Migração Oficial (Para ambiente produtivo/histórico):**
    ```bash
    npx prisma migrate dev --name nome_da_mudanca
    ```
    *Gera os scripts SQL na pasta `prisma/migrations` e atualiza a estrutura do banco.*
*   **Interface Visual do Banco (Prisma Studio):**
    ```bash
    npx prisma studio
    ```
    *Abre um painel web local (geralmente em `http://localhost:5555`) para visualizar, cadastrar e deletar registros manualmente de forma simples.*

---

## 🛣️ 8. Especificação Completa das Rotas e Endpoints

### 8.1 GET `/`
*   **Descrição:** Rota principal de verificação básica da API.
*   **Método:** `GET`
*   **Response (JSON):**
    ```json
    {
      "message": "Welcome to the Engagement Invite API",
      "status": "online",
      "version": "1.0.0"
    }
    ```

### 8.2 GET `/api`
*   **Descrição:** Retorna o status base do roteador da API.
*   **Método:** `GET`
*   **Response (JSON):**
    ```json
    {
      "message": "Hello from the Engagement Invite API Router!"
    }
    ```

### 8.3 GET `/api/health`
*   **Descrição:** Health check que detalha a saúde do servidor Express e tempo de atividade (`uptime`).
*   **Método:** `GET`
*   **Response (JSON):**
    ```json
    {
      "status": "ok",
      "timestamp": "2026-06-17T23:03:00.000Z",
      "uptime": 25.43
    }
    ```

### 8.4 GET `/api/db-test`
*   **Descrição:** Testa a integridade e conexão com o Postgres (Neon) executando uma query SQL nativa (`SELECT NOW()`).
*   **Método:** `GET`
*   **Response de Sucesso (JSON):**
    ```json
    {
      "status": "connected",
      "result": [
        {
          "db_time": "2026-06-17T23:05:12.456Z"
        }
      ]
    }
    ```
*   **Response de Erro (JSON):**
    ```json
    {
      "status": "error",
      "message": "Failed to connect to the database",
      "error": "Descrição detalhada do erro gerado pelo banco"
    }
    ```

---

## 📝 9. Histórico de Alterações (Changelog)

Consulte esta seção para ver a evolução histórica do desenvolvimento:

### [17/06/2026] - Preparação e Consolidação de Documentação
*   **Ajuste de README e Documentação:**
    *   Criado o arquivo [README.md](file:///d:/felipe/Develop/julia/engagement-invite-api/README.md) contendo instruções sucintas de Quick Start.
    *   Centralizado e enriquecido o arquivo [gemma.md](file:///d:/felipe/Develop/julia/engagement-invite-api/gemma.md) com todas as definições técnicas detalhadas passo a passo.

### [17/06/2026] - Integração do Vercel Storage (Neon Postgres) com Prisma 7
*   **Instalação de Dependências:**
    *   Prisma CLI (`prisma`), Prisma Client (`@prisma/client`), `@prisma/adapter-neon`, `@neondatabase/serverless`, `ws` e `@types/ws`.
*   **Estrutura de Banco:**
    *   Criado o arquivo [prisma.config.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma.config.ts) para gerenciar credenciais no Prisma 7.
    *   Definido o schema [prisma/schema.prisma](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma/schema.prisma) com o gerador configurado para criar o cliente tipado em `src/generated/prisma`, além do modelo de dados `Guest`.
    *   Criação de singleton de conexão em [src/db/prisma.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/db/prisma.ts) utilizando o driver WebSocket Neon Serverless.
    *   Criada a rota de testes `/api/db-test` executando queries nativas no arquivo [src/routes/index.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/routes/index.ts).

### [17/06/2026] - Inicialização do Projeto
*   **Configurações do Projeto:**
    *   Criação inicial de arquivos base (`package.json`, `tsconfig.json`, `vercel.json` e `.gitignore`).
*   **Criação do Servidor:**
    *   Desenvolvimento do ponto de entrada do Express (`src/app.ts`), ponto de entrada local (`src/local.ts`), ponto de entrada do Vercel (`api/index.ts`) e o roteador de rotas base (`src/routes/index.ts`).
