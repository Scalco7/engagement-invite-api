# Documentação Oficial - Engagement Invite API

Esta é a documentação centralizada e completa do projeto **Engagement Invite API**. Ela serve como um guia abrangente sobre a arquitetura da aplicação, arquivos de configuração, banco de dados, fluxo de desenvolvimento local e guias de implantação para futuras manutenções.

---

## 📂 1. Estrutura do Projeto

O projeto segue a estrutura recomendada para separar o fluxo local das rotas servidas como Serverless Functions no Vercel, incluindo o banco de dados via Prisma 7 e documentação pelo Swagger:

```text
├── api/
│   └── index.ts          # Ponto de entrada do Vercel (Serverless Function)
├── prisma/
│   └── schema.prisma     # Modelos e definições do banco de dados (Prisma)
├── prisma.config.ts      # Configurações do Prisma 7 (CLI e Migrations)
├── src/
│   ├── app.ts            # Definição, middlewares e rotas (Express)
│   ├── local.ts          # Ponto de entrada local (executa em porta local)
│   ├── db/
│   │   └── prisma.ts     # Singleton do Prisma Client configurado com Neon
│   ├── generated/        # Código compilado e gerado automaticamente pelo Prisma
│   └── routes/           # Rotas da aplicação
│       └── index.ts      # Definição de rotas principais e de teste do DB
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
* **Resolução de Módulos JSON**: O compilador TypeScript foi configurado com `resolveJsonModule: true` para importar o arquivo `swagger.json` diretamente de forma segura em TypeScript (`import swaggerDocument from '../swagger.json'`).
* **Segurança do Helmet**: O middleware `helmet` altera os cabeçalhos de segurança (CSP) por padrão, o que bloqueia o carregamento de arquivos CSS e JS inline do Swagger UI. Para resolver isso, configuramos `contentSecurityPolicy: false` no Helmet.
* **Empacotamento Vercel (`vercel.json`)**: Como a Vercel compila e empacota as Serverless Functions de forma isolada, incluímos as diretrizes de empacotamento (`functions`) para garantir que os arquivos estáticos de estilização contidos no diretório `node_modules/swagger-ui-dist/**` sejam copiados para o bundle final na nuvem, evitando páginas do Swagger sem estilo (CSS corrompido) após o deploy.

---

## 📂 3. Explicação Arquivo por Arquivo (File-by-File)

Abaixo está o detalhamento de cada arquivo do projeto e sua finalidade:

### ⚙️ 3.1 Arquivos de Configuração

*   **[`package.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/package.json)**
    *   **Função:** Configura metadados do projeto, dependências de produção (`express`, `cors`, `dotenv`, `helmet`, `swagger-ui-express`, `@prisma/client`, `@prisma/adapter-neon`, `@neondatabase/serverless`, `ws`), dependências de desenvolvimento (`typescript`, `tsx`, `prisma`, `@types/...`) e os scripts de execução (`dev`, `build`, `start`).
*   **[`tsconfig.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/tsconfig.json)**
    *   **Função:** Configura as opções do compilador TypeScript. Inclui `"resolveJsonModule": true` para permitir o import do arquivo `swagger.json` diretamente no código-fonte.
*   **[`vercel.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/vercel.json)**
    *   **Função:** Configuração do Vercel. Inclui o bloco `functions` direcionando o empacotador a adicionar a pasta `node_modules/swagger-ui-dist/**` ao arquivo compilado do `api/index.ts`.
*   **[`prisma.config.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma.config.ts)**
    *   **Função:** Arquivo do Prisma 7 que expõe as configurações do datasource e do caminho do schema utilizando variáveis de ambiente.
*   **[`prisma/schema.prisma`](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma/schema.prisma)**
    *   **Função:** Define a infraestrutura e modelos do banco Postgres, definindo a pasta de destino do client em `src/generated/prisma`.
*   **[`swagger.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/swagger.json)**
    *   **Função:** Arquivo JSON padronizado com as regras do OpenAPI 3.0 descrevendo os endpoints da API para o Swagger UI renderizar.
*   **[`.gitignore`](file:///d:/felipe/Develop/julia/engagement-invite-api/.gitignore)**
    *   **Função:** Lista arquivos locais a serem ignorados pelo controle de versão do Git.

### 📦 3.2 Código Fonte e Pontos de Entrada

*   **[`api/index.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/api/index.ts)**
    *   **Função:** Entrada serverless padrão da Vercel. Exporta por padrão o Express configurado em `src/app`.
*   **[`src/app.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/app.ts)**
    *   **Função:** Inicializa o Express, adiciona os middlewares necessários (incluindo desativação do CSP no Helmet para o Swagger) e monta as rotas da API em `/api` e o Swagger UI na rota `/api-docs`.
*   **[`src/local.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/local.ts)**
    *   **Função:** Entrada local executando a API em porta clássica (default `3000`).
*   **[`src/db/prisma.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/db/prisma.ts)**
    *   **Função:** Inicializador de conexão singleton do Prisma utilizando drivers otimizados de WebSocket Neon.
*   **[`src/routes/index.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/routes/index.ts)**
    *   **Função:** Declara endpoints expostos, gerenciando lógica de requisição e resposta.

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

### 7.1 Modelo Inicial (`Guest`)
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

### [17/06/2026] - Integração do Swagger UI para Documentação da API
*   **Instalação de Dependências**:
    *   Instalada a biblioteca `swagger-ui-express` e sua tipagem `@types/swagger-ui-express`.
*   **Configuração de TypeScript e Assets**:
    *   Modificado o arquivo [tsconfig.json](file:///d:/felipe/Develop/julia/engagement-invite-api/tsconfig.json) ativando `"resolveJsonModule": true` para suportar importação direta de arquivos JSON.
    *   Modificado o arquivo [vercel.json](file:///d:/felipe/Develop/julia/engagement-invite-api/vercel.json) adicionando regras de compilação/empacotamento de funções para incluir a biblioteca estática `swagger-ui-dist` nas Serverless Functions do Vercel.
*   **Roteamento e Visualização**:
    *   Criado o arquivo descritivo [swagger.json](file:///d:/felipe/Develop/julia/engagement-invite-api/swagger.json) documentando todos os contratos de rotas.
    *   Acoplado o Swagger UI no endpoint `/api-docs` dentro do arquivo [src/app.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/app.ts), ajustando também o middleware do `helmet` para desativar a restrição de carregamento de recursos estáticos do Swagger (CSP).

### [17/06/2026] - Preparação e Consolidação de Documentação
*   **Ajuste de README e Documentação:**
    *   Criado o arquivo [README.md](file:///d:/felipe/Develop/julia/engagement-invite-api/README.md) contendo instruções sucintas de Quick Start.
    *   Centralizado e enriquecido o arquivo [gemma.md](file:///d:/felipe/Develop/julia/engagement-invite-api/gemma.md) com todas as definições técnicas detalhadas passo a passo.

### [17/06/2026] - Integração do Vercel Storage (Neon Postgres) com Prisma 7
*   **Instalação de Dependências:**
    *   Prisma CLI (`prisma`), Prisma Client (`@prisma/client`), `@prisma/adapter-neon`, `@neondatabase/serverless`, `ws` e `@types/ws`.
*   **Estrutura de Banco:**
    *   Criado o arquivo [prisma.config.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma.config.ts) e configurado o [prisma/schema.prisma](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma/schema.prisma).
    *   Criação de singleton de conexão em [src/db/prisma.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/db/prisma.ts) e rota de testes `/api/db-test`.

### [17/06/2026] - Inicialização do Projeto
*   **Configurações do Projeto:**
    *   Criação inicial de arquivos base (`package.json`, `tsconfig.json`, `vercel.json` e `.gitignore`).
*   **Criação do Servidor:**
    *   Desenvolvimento do ponto de entrada do Express (`src/app.ts`), ponto de entrada local (`src/local.ts`), ponto de entrada do Vercel (`api/index.ts`) e o roteador de rotas base (`src/routes/index.ts`).
