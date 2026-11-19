# Preparação de produção

## Componentes preparados

- O frontend React/Vite pode ser publicado como SPA estática. `vercel.json` define o build do workspace e encaminha rotas profundas para `index.html`.
- A API pode correr num serviço Node/container. `apps/api/Dockerfile` instala o workspace, gera o cliente Prisma e compila a API; o processo escuta em `0.0.0.0` e respeita `PORT` do alojamento. O contexto de build deve ser a raiz do repositório, por exemplo `docker build -f apps/api/Dockerfile .`.
- As migrações de produção são aplicadas separadamente com `pnpm --filter @roof-tech/api prisma:deploy` antes de encaminhar tráfego para a nova versão.
- A API disponibiliza `GET /api/v1/health/ready` para verificar o processo e a ligação à base de dados.

## Configuração do frontend

Configure o projecto Vercel na raiz do repositório e use o `vercel.json` incluído. Defina `VITE_API_URL` no ambiente Production para a origem da API mais `/api/v1`, por exemplo `https://api.exemplo.co.mz/api/v1`. Esta variável entra no bundle durante o build e não pode conter segredos.

Use domínios do mesmo site para frontend e API, por exemplo `www.exemplo.co.mz` e `api.exemplo.co.mz`. A sessão usa cookie `SameSite=Lax`; domínios temporários do Vercel e Render pertencem a sites diferentes e não suportam o fluxo de sessão actual em pedidos fetch cross-site.

## Configuração da API

Defina no serviço de API:

- `NODE_ENV=production`
- `DATABASE_URL` com a ligação privada/TLS fornecida pelo PostgreSQL gerido
- `WEB_ORIGIN` com a origem exacta do frontend, sem caminho, por exemplo `https://www.exemplo.co.mz`
- `STORAGE_PROVIDER=r2`
- `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET` e `R2_PUBLIC_BASE_URL`

Não defina `API_PORT` no alojamento quando a plataforma fornece `PORT`. O processo usa `PORT` e escuta em `0.0.0.0`. Conceda ao token R2 acesso apenas aos dois buckets necessários. O bucket público de fotografias usa domínio próprio; o bucket de documentos permanece privado e não recebe domínio público. Os nomes dos buckets têm de ser diferentes.

Configure o health check do serviço para `/api/v1/health/ready`. O container não executa migrações ao arrancar para evitar que réplicas concorrentes alterem a base de dados ao mesmo tempo; use o comando de migração como etapa de release/pre-deploy.

## Primeira publicação

1. Criar o PostgreSQL gerido, o serviço da API, os domínios e os dois buckets R2.
2. Configurar as variáveis de ambiente e publicar a API.
3. Executar `pnpm --filter @roof-tech/api prisma:deploy` contra a base de dados de produção.
4. Criar uma conta `ADMIN` com `ROOFTECH_ALLOW_ADMIN_BOOTSTRAP=true` apenas durante a operação controlada; remover a variável depois.
5. Definir `VITE_API_URL` na Vercel, publicar o frontend e validar saúde, sessão, uploads públicos e download privado de documentos.

A seed contém anúncios demonstrativos e recusa correr com `NODE_ENV=production`; anúncios demonstrativos também são ocultados pela pesquisa em produção. A base de dados publicada começa sem anúncios até serem submetidos e aprovados anúncios reais. Fotografias guardadas no disco local de desenvolvimento não são transferidas para R2 automaticamente.

## Estado e dependências externas

Os ficheiros de preparação estão prontos, mas ainda não foi criado nenhum serviço externo nem publicada a aplicação. O checkout não tem remoto Git configurado e a conta Vercel ligada não tem um projecto Roof Tech. A publicação depende de ligar o repositório a um remoto, escolher/aceder às contas de alojamento, definir os domínios e disponibilizar as credenciais do PostgreSQL e R2.

Referências oficiais: [Vercel SPA Vite](https://vercel.com/docs/frameworks/frontend/vite), [Vercel rewrites](https://vercel.com/docs/routing/rewrites), [Render web services](https://render.com/docs/web-services), [Cloudflare R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) e [Cloudflare R2 S3 API](https://developers.cloudflare.com/r2/get-started/s3/).
