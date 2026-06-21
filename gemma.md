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
│   │   ├── rsvp.controller.ts
│   │   └── bet.controller.ts # Controlador de apostas e perguntas
│   ├── db/
│   │   └── prisma.ts     # Singleton do Prisma Client configurado com Neon
│   ├── routes/           # Camada de Roteamento: mapeia rotas a controllers
│   │   ├── index.ts      # Roteador central (health check e sub-rotas)
│   │   ├── rsvp.route.ts # Roteador específico de RSVP
│   │   └── bet.route.ts  # Roteador específico do Bolão
│   ├── services/         # Camada de Negócio: manipula DB e lógica
│   │   ├── rsvp.service.ts
│   │   ├── bet.service.ts # Serviços de consultas e cálculo de odds
│   │   └── email.service.ts # Serviço de envio de notificações por e-mail
│   └── utils/            # Utilitários compartilhados reutilizáveis
│       └── phone.ts      # Higienização e prefixação de telefone (+55)
├── swagger.json          # Especificação OpenAPI 3.0 do projeto
├── package.json          # Gerenciamento de scripts e dependências do Node.js
├── tsconfig.json         # Configurações do compilador TypeScript
├── vercel.json           # Configurações de empacotamento e rotas no Vercel
├── .gitignore            # Arquivos ignorados pelo Git
├── README.md             # Instruções de Quick Start
├── bet.md                # Documentação detalhada da mecânica de Odds e Bolão
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

*   **[`package.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/package.json)**: Configura metadados, scripts (`dev`, `build`, `start`), dependências e devDependencies.
*   **[`tsconfig.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/tsconfig.json)**: Configura as opções do compilador TypeScript. Inclui o caminho `"generated/**/*"` na lista de inclusão.
*   **[`vercel.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/vercel.json)**: Configuração do Vercel. Garante o empacotamento das folhas de estilo do Swagger UI.
*   **[`prisma.config.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma.config.ts)**: Configuração global do ecossistema do Prisma 7 que lê as variáveis de ambiente.
*   **[`prisma/schema.prisma`](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma/schema.prisma)**: Define a infraestrutura e modelos do banco Postgres, com saída em `../generated/prisma`.
*   **[`swagger.json`](file:///d:/felipe/Develop/julia/engagement-invite-api/swagger.json)**: Especificação OpenAPI 3.0 organizada nas tags `RSVP`, `Bolão` e `System Status`.
*   **[`.gitignore`](file:///d:/felipe/Develop/julia/engagement-invite-api/.gitignore)**: Lista arquivos ignorados pelo versionamento Git (incluindo o client gerado pelo Prisma na pasta `generated/`).

### 📦 3.2 Código Fonte e Pontos de Entrada

*   **[`api/index.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/api/index.ts)**: Entrada serverless padrão da Vercel. Exporta por padrão o Express configurado em `src/app`.
*   **[`src/app.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/app.ts)**: Inicializa o Express, middlewares e monta rotas do Swagger e da API.
*   **[`src/local.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/local.ts)**: Entrada local executando a API em porta clássica (default `3000`).
*   **[`src/db/prisma.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/db/prisma.ts)**: Inicializador de conexão singleton do Prisma com imports e caminhos adaptados para o Prisma 7 e banco de dados Neon Postgres.
*   **[`src/utils/phone.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/utils/phone.ts)**: Utilitário para formatar telefones com prefixo brasileiro (+55).
*   **[`src/services/rsvp.service.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/services/rsvp.service.ts)**: Persistência e busca de registros de presença de convidados no banco de dados.
*   **[`src/services/bet.service.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/services/bet.service.ts)**: Métodos de negócio do bolão (registro de apostas e geração/cálculo de odds dinâmicas).
*   **[`src/services/email.service.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/services/email.service.ts)**: Serviço de envio de notificações de e-mail (respostas de RSVP).
*   **[`src/controllers/rsvp.controller.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/controllers/rsvp.controller.ts)**: Orquestra o recebimento, validação e resposta HTTP dos RSVPs.
*   **[`src/controllers/bet.controller.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/controllers/bet.controller.ts)**: Valida dados de cadastro de perguntas, valida apostas e manipula retornos HTTP dos endpoints do bolão.
*   **[`src/routes/rsvp.route.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/routes/rsvp.route.ts)**: Conecta os verbos HTTP de RSVP ao RsvpController.
*   **[`src/routes/bet.route.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/routes/bet.route.ts)**: Conecta as rotas do bolão (`POST /questions`, `GET /questions`, `POST /place`) ao BetController.
*   **[`src/routes/index.ts`](file:///d:/felipe/Develop/julia/engagement-invite-api/src/routes/index.ts)**: Agrupa os sub-roteadores da aplicação.

---

## 🔑 4. Variáveis de Ambiente (.env)

A aplicação utiliza as seguintes chaves de ambiente:

| Variável | Obrigatório | Descrição | Exemplo de Valor |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Sim** | String de conexão completa com o Neon Postgres. | `postgresql://user:pass@ep-cool-fog-1234.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `PORT` | Não | Porta onde o servidor Express local irá escutar (Local apenas). | `3000` |
| `NODE_ENV` | Não | Indica se o ambiente está em `development` ou `production`. | `development` |
| `SMTP_HOST` | Não | Servidor SMTP para o envio de e-mails. | `smtp.gmail.com` |
| `SMTP_PORT` | Não | Porta do servidor SMTP. | `587` |
| `SMTP_SECURE` | Não | Se `true` usa SSL na porta 465. Se `false` usa STARTTLS na porta 587. | `false` |
| `SMTP_USER` | Não | Usuário/E-mail de autenticação SMTP. Ativa modo Mock se vazio. | `fscalco7@gmail.com` |
| `SMTP_PASS` | Não | Senha de autenticação SMTP (Senha de aplicativo do Google). | `abcd efgh ijkl mnop` |
| `SMTP_FROM` | Não | E-mail do remetente das notificações de RSVP. | `no-reply@invite-noivado.com` |
| `SMTP_TO` | Não | E-mail destinatário para as notificações (padrão: fscalco7@gmail.com). | `fscalco7@gmail.com` |

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

## 📊 7. Modelagem do Banco de Dados

Abaixo está o diagrama do banco de dados relacional contendo os três modelos e suas relações:

```mermaid
erDiagram
    Rsvp {
        String id PK
        String name
        String email UK
        String phone_number UK
        Boolean will_go
    }
    BetQuestion {
        String id PK
        String title
        String type
        String[] options
    }
    GuestBet {
        String id PK
        String rsvpId FK
        String questionId FK
        String value
    }

    Rsvp ||--o{ GuestBet : "realiza"
    BetQuestion ||--o{ GuestBet : "contém"
```

### 7.1 Definição dos Modelos no Schema
*   **`Rsvp` (Convidados)**: Controla a resposta padrão de presença na festa de noivado. Possui campos únicos de `email` e `phone_number` para evitar duplicidades e permitir a recuperação do RSVP.
*   **`BetQuestion` (Perguntas)**: Cadastra as perguntas que farão parte do bolão dinâmico. O campo `type` pode ser `TEXT`, `NUMBER` ou `GUEST_SELECT`.
*   **`GuestBet` (Apostas/Votos)**: Registra o palpite individual de cada convidado. Possui chave única composta `@@unique([rsvpId, questionId])` para evitar votos duplicados.

---

## 🛣️ 8. Especificação Completa das Rotas e Endpoints

Abaixo estão listadas as rotas montadas sob o prefixo `/api` agrupadas por suas respectivas responsabilidades:

### 8.1 Categoria: RSVP

*   **`GET /api/rsvp`**
    *   **Descrição:** Retorna a lista de todas as presenças respondidas.
*   **`POST /api/rsvp`**
    *   **Descrição:** Valida dados (nome, e-mail e telefone), higieniza o telefone aplicando o prefixo `+55` (padrão Brasil) e persiste o RSVP. Garante e-mail e telefone únicos.
*   **`POST /api/rsvp/lookup`**
    *   **Descrição:** Busca o RSVP correspondente ao e-mail e telefone fornecidos. O telefone é sanitizado e formatado antes da busca. Retorna o RSVP completo (incluindo o ID) caso exista.

### 8.2 Categoria: Bolão (Bets)

*   **`POST /api/bets/questions`**
    *   **Descrição:** Cria uma pergunta para o bolão (tipos: `TEXT`, `NUMBER` ou `GUEST_SELECT`).
*   **`POST /api/bets/place`**
    *   **Descrição:** Registra a aposta de um convidado em uma pergunta específica.
    *   **Regras Estritas:** O convidado deve ter confirmado presença (`will_go: true`). Apenas um palpite é permitido por pergunta. Valida tipos específicos de respostas (`NUMBER` deve ser numérico, `GUEST_SELECT` deve ser um ID de convidado confirmado válido).
*   **`GET /api/bets/questions`**
    *   **Descrição:** Retorna as perguntas cadastradas listando as alternativas e suas cotações (**odds**) calculadas em tempo real sob o modelo de mercado dinâmico totalizador. *(Consulte detalhes de cálculo em [bet.md](file:///d:/felipe/Develop/julia/engagement-invite-api/bet.md))*.

### 8.3 Categoria: Infraestrutura e Status

*   **`GET /`**: Rota de boas-vindas do servidor Express.
*   **`GET /api`**: Confirmação de atividade do roteador central.
*   **`GET /api/health`**: Health check com uptime acumulado do servidor.
*   **`GET /api/db-test`**: Query nativa rápida de ping com o banco Postgres.

---

## 📝 9. Histórico de Alterações (Changelog)

### [21/06/2026] - Implementação de Notificação de RSVP por E-mail
*   **Novo Serviço**:
    *   Desenvolvida a [EmailService](file:///d:/felipe/Develop/julia/engagement-invite-api/src/services/email.service.ts) encapsulando o `nodemailer`.
    *   Suporte a envio real por SMTP (Gmail ou outros provedores) e fallback para console logger (modo Mock) se credenciais não forem providas.
*   **Integração no RsvpController**:
    *   Integrado o envio de e-mail ao método `create` do [RsvpController](file:///d:/felipe/Develop/julia/engagement-invite-api/src/controllers/rsvp.controller.ts) em um bloco `try-catch` isolado (resiliência a falhas do serviço de correio).
*   **Variáveis de Ambiente**:
    *   Adicionadas variáveis de SMTP no arquivo `.env`.

### [18/06/2026] - Adição de E-mail, Unicidade e Rota de Lookup
*   **Banco de Dados (Prisma)**:
    *   Adicionado o campo `email` no modelo `Rsvp` com restrição de chave única (`@unique`).
    *   Adicionada restrição de chave única (`@unique`) ao campo `phone_number` no modelo `Rsvp`.
*   **HTTP, Rotas e Serviços**:
    *   Criada a rota `POST /api/rsvp/lookup` para recuperar um RSVP informando e-mail e telefone.
    *   Atualizados os métodos de criação e validação de RSVP para exigir e-mail válido e gerenciar conflito de chaves únicas (retorno 400 em vez de 500).
*   **Documentação**:
    *   Atualizada a especificação do `swagger.json` e diagramas em `gemma.md`.

### [18/06/2026] - Criação do Bolão e Cálculo de Odds Dinâmicas
*   **Banco de Dados (Prisma)**:
    *   Adicionados os modelos `BetQuestion` e `GuestBet` em [schema.prisma](file:///d:/felipe/Develop/julia/engagement-invite-api/prisma/schema.prisma) e adicionada a relação bidirecional de apostas no modelo `Rsvp`.
    *   Regerado o Prisma Client via `npx prisma generate` direcionado à pasta `generated/prisma` na raiz do projeto.
*   **Mecanismo de Negócio e Serviços**:
    *   Criada a Service [src/services/bet.service.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/services/bet.service.ts) que implementa a fórmula matemática de odds totalizadora (Parimutuel), além de validar regras de negócio de aposta (convidado confirmado, resposta de UUIDs em `GUEST_SELECT` e unicidade).
*   **HTTP e Roteamento**:
    *   Desenvolvido o Controller [src/controllers/bet.controller.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/controllers/bet.controller.ts) para validações sintáticas e respostas estruturadas de erro 400.
    *   Criado o roteador de apostas [src/routes/bet.route.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/routes/bet.route.ts) e montado no roteador principal [src/routes/index.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/routes/index.ts) no caminho `/bets`.
*   **Documentação e OpenAPI**:
    *   Desenvolvido o arquivo de regras de negócio [bet.md](file:///d:/felipe/Develop/julia/engagement-invite-api/bet.md) na raiz do projeto.
    *   Atualizado o [swagger.json](file:///d:/felipe/Develop/julia/engagement-invite-api/swagger.json) dividindo os endpoints em três tags principais (`RSVP`, `Bolão` e `System Status`) e adicionando componentes schemas reutilizáveis.

### [17/06/2026] - Correção de Inicialização e Falha de Conexão (ECONNREFUSED)
*   **Importação Antecipada do dotenv**:
    *   Adicionado `import 'dotenv/config'` no topo de [src/db/prisma.ts](file:///d:/felipe/Develop/julia/engagement-invite-api/src/db/prisma.ts) para evitar race conditions.
*   **Compatibilidade de Variáveis do Vercel Storage**:
    *   Ajustada a string de conexão para buscar em cadeia `DATABASE_URL`, `POSTGRES_PRISMA_URL` e `POSTGRES_URL`.

### [17/06/2026] - Correção do Script de Build para deploy no Vercel
*   **Ajuste no package.json**:
    *   Modificado o script `build` em [package.json](file:///d:/felipe/Develop/julia/engagement-invite-api/package.json) para `"prisma generate && tsc"`.

### [17/06/2026] - Refatoração de Arquitetura em Camadas e Reorganização do Prisma
*   **Refatoração Arquitetural**:
    *   Código Express modularizado sob a estrutura de 4 camadas: **Rotas**, **Controladores**, **Serviços** e **Utilitários**.
    *   Deletada a pasta antiga obsoleta `src/generated`.

### [17/06/2026] - Criação da Tabela de RSVP, Validações e Regra de Telefone (+55)
*   **Banco de Dados e Rotas**:
    *   Adicionada a tabela `Rsvp`.
    *   Adicionadas rotas com validações estritas de erro 400.

### [17/06/2026] - Integração do Swagger UI para Documentação da API
*   **Swagger UI**:
    *   Integrado Swagger UI sob a rota `/api-docs` com ajustes de CSP no Helmet e regras de inclusão no `vercel.json`.

### [17/06/2026] - Inicialização do Projeto
*   **Configurações Iniciais**:
    *   Inicialização base do repositório em Express com TypeScript.
