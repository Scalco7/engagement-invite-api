# Engagement Invite API

Esta é uma API desenvolvida com **Express** e **TypeScript**, pré-configurada para rodar de forma nativa e serverless no **Vercel** usando **Prisma 7** e **Neon Postgres** (Vercel Storage).

## 🚀 Início Rápido

1. **Instalar Dependências:**
   ```bash
   npm install
   ```

2. **Gerar o Cliente Prisma:**
   ```bash
   npx prisma generate
   ```

3. **Configurar as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto e insira a URL de conexão com o banco Postgres (Neon):
   ```env
   DATABASE_URL="postgresql://USUARIO:SENHA@HOST:PORTA/BANCO?schema=public"
   ```

4. **Executar o Servidor de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   A API estará rodando localmente em `http://localhost:3000`.

## 📚 Documentação Completa e Detalhes Técnicos

Para obter informações completas sobre a arquitetura do projeto, descrição de cada arquivo, passo a passo para conectar o banco de dados no Vercel, guia de comandos do Prisma 7, especificações detalhadas de endpoints e histórico de mudanças, acesse o arquivo de documentação centralizado do projeto:

👉 **[Documentação do Gemma (gemma.md)](file:///d:/felipe/Develop/julia/engagement-invite-api/gemma.md)**
