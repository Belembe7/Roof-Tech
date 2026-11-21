# Deploy de produção

## Componentes preparados

- O frontend React/Vite é publicado como SPA estática na Vercel. `vercel.json` encaminha `/api/v1/*` para a função Node `api/index.js` e as restantes rotas para `index.html`.
- A função carrega a API Express já existente em `apps/api`; o comando de build compila a API e o frontend no mesmo projecto e domínio.
- O Prisma Postgres está ligado ao ambiente Production. A API usa `DATABASE_URL_POOLED` para pedidos em runtime e `DATABASE_URL` directo para migrações.
- A API disponibiliza `GET /api/v1/health/ready` para confirmar a ligação à base de dados.
- O armazenamento de ficheiros fica desactivado em produção até serem configurados os buckets R2; pedidos de upload respondem com erro de armazenamento indisponível.

## Configuração do frontend

Configure o projecto Vercel na raiz do repositório e use o `vercel.json` incluído. O frontend chama a API no mesmo domínio em `/api/v1`, sem `VITE_API_URL` adicional.

Use domínios do mesmo site para frontend e API, por exemplo `www.exemplo.co.mz` e `api.exemplo.co.mz`. A sessão usa cookie `SameSite=Lax`; domínios temporários do Vercel e Render pertencem a sites diferentes e não suportam o fluxo de sessão actual em pedidos fetch cross-site.

## Configuração da API

Defina na Vercel, para Production:

- `NODE_ENV=production`
- `DATABASE_URL` e `DATABASE_URL_POOLED`, geradas pela integração Prisma Postgres
- `WEB_ORIGIN=https://roof-tech-theta.vercel.app`
- Para activar uploads, configure `STORAGE_PROVIDER=r2`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET` e `R2_PUBLIC_BASE_URL`. Sem essas variáveis, a API mantém o armazenamento desactivado e a autenticação continua disponível.

Não defina `API_PORT` no alojamento quando a plataforma fornece `PORT`. O processo usa `PORT` e escuta em `0.0.0.0`. Conceda ao token R2 acesso apenas aos dois buckets necessários. O bucket público de fotografias usa domínio próprio; o bucket de documentos permanece privado e não recebe domínio público. Os nomes dos buckets têm de ser diferentes.

O container Docker continua disponível para serviços Node externos. Ele não executa migrações ao arrancar para evitar que réplicas concorrentes alterem a base de dados ao mesmo tempo; aplique migrações com `pnpm --filter @roof-tech/api prisma:deploy` antes de publicar mudanças no schema.

## Primeira publicação

1. A base Prisma Postgres gratuita já está ligada ao ambiente Production e recebeu as migrações actuais.
2. O deploy da Vercel publica o frontend e a função API no mesmo domínio.
3. Para activar uploads de anúncios e documentos, ligue os dois buckets R2 e defina as respectivas variáveis.
4. Crie uma conta `ADMIN` com `ROOFTECH_ALLOW_ADMIN_BOOTSTRAP=true` apenas durante a operação controlada; remova a variável depois.

A seed contém anúncios demonstrativos e recusa correr com `NODE_ENV=production`; anúncios demonstrativos também são ocultados pela pesquisa em produção. A base de dados publicada começa sem anúncios até serem submetidos e aprovados anúncios reais. Se a API pública estiver indisponível ou não devolver anúncios, o frontend mostra o catálogo demonstrativo estático do pacote partilhado, sempre marcado como ilustrativo. Fotografias guardadas no disco local de desenvolvimento não são transferidas para R2 automaticamente.

## Estado e dependências externas

O frontend e a API usam o projecto Vercel `roof-tech`; a base Prisma Postgres está ligada apenas a Production. O armazenamento de imagens e documentos depende da configuração futura de R2.

Referências oficiais: [Vercel SPA Vite](https://vercel.com/docs/frameworks/frontend/vite), [Vercel rewrites](https://vercel.com/docs/routing/rewrites), [Render web services](https://render.com/docs/web-services), [Cloudflare R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) e [Cloudflare R2 S3 API](https://developers.cloudflare.com/r2/get-started/s3/).
