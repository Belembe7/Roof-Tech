# Roof Tech

Plataforma imobiliária digital para o mercado moçambicano. O MVP começa com arrendamento residencial em Maputo.

## Requisitos

- Node.js 22.12 ou superior
- pnpm 11

## Desenvolvimento local

1. Instale as dependências com `pnpm install`.
2. Copie `.env.example` para `.env` na raiz e substitua os dois campos `replace-with-a-local-random-password` pela mesma palavra-passe local.
3. Execute `pnpm db:setup` para iniciar o PostgreSQL local, gerar o cliente Prisma, aplicar a migração e carregar dados demonstrativos.
4. Inicie frontend e API com `pnpm dev`.
5. Abra `http://localhost:5173`.

O PostgreSQL da Roof Tech fica limitado a `127.0.0.1:55432` e usa um volume Docker próprio. `pnpm db:down` pára apenas este contentor. O frontend encaminha `/api` para a API local. `GET /api/v1/health` confirma que a API está activa e `GET /api/v1/health/ready` confirma também a ligação à base de dados.

## Estrutura

- `apps/web`: React, Vite e TypeScript.
- `apps/api`: Express, TypeScript e validação Zod.
- `packages/shared`: contratos e tipos partilhados.
- `docs`: decisões de arquitectura e notas técnicas.
- `apps/api/prisma`: esquema, migrações e seed de desenvolvimento.

## Estado das fases

- **Fase 1 — Fundação:** monorepositório, API de saúde, tokens e componentes Terra Living.
- **Fase 2 — Interface pública:** Home, pesquisa combinável, filtros na URL, cartões, detalhes, galeria e custos iniciais.
- **Fase 3 — PostgreSQL:** esquema relacional Prisma, migração inicial, seed demonstrativa e endpoints públicos de consulta.
- **Fase 4 — Autenticação:** registo, entrada, sessão, edição do perfil e protecção da rota de conta.
- **Fase 5 — Anunciantes:** painel, gestão de anúncios, disponibilidade, verificação e uploads privados/públicos.
- **Fase 6 — Administração:** painel protegido, moderação de anúncios, revisão de documentos, denúncias, estado de contas e auditoria.
- **Fase 7 — Integração pública (concluída):** página inicial, pesquisa e detalhes ligados à API, com estados de carregamento, erro e ausência de resultados.
- **Fase 8 — Hospedagem (preparada; publicação pendente):** configuração de SPA estática, container da API, variáveis de produção e migração.

Os dados carregados nesta instalação são demonstrativos. A localização é aproximada e os cartões indicam esse estado. Não há números de contacto reais e os favoritos estão desactivados.

As fotografias demonstrativas são carregadas do Unsplash com variantes responsivas. A interface pública consulta os endpoints da API; a base de dados local continua preenchida apenas com anúncios demonstrativos.

Se a API pública estiver indisponível ou ainda não devolver anúncios, o frontend usa o catálogo demonstrativo estático de `packages/shared` para mostrar a experiência pública. Esses exemplos continuam identificados como ilustrativos e não são enviados para a API nem representam imóveis reais.

Na Fase 3, `GET /api/v1/properties` aceita `q`, `city`, `neighborhood`, `type` (`HOUSE`, `APARTMENT`, `ROOM`, `ANNEX`), `max`, `rooms`, `water`, `parking`, `security`, `available`, `sort`, `page` e `limit`. Também existem `GET /api/v1/properties/:slug` e `GET /api/v1/neighborhoods?city=maputo`. As respostas monetárias são strings decimais; os resultados assinalam `isDemo`, e registos demonstrativos são excluídos em produção.

Na Fase 4, a interface disponibiliza `/entrar`, `/registar` e `/conta`. A API publica `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/session`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` e `PATCH /api/v1/auth/me`. O cookie de sessão é HttpOnly; o token CSRF fica apenas na memória da aplicação. Para produção, configure `WEB_ORIGIN` para a origem exacta do frontend e publique frontend/API no mesmo site para compatibilidade com o cookie `SameSite=Lax`.

Na Fase 5, anunciantes autenticados usam `/anunciante`, `/anunciante/imoveis` e `/anunciante/verificacao`. A API guarda rascunhos e anúncios pendentes, valida que o anunciante só altera os próprios registos e nunca permite auto-aprovação. Cada anúncio aceita até dez fotografias; a API valida o conteúdo, converte para WebP e mantém a ordenação. Pedidos de verificação aceitam até três ficheiros PDF ou imagem e só ficam acessíveis ao anunciante dono pela rota privada de download. O armazenamento local de desenvolvimento mantém fotografias e documentos em pastas separadas; documentos não são publicados como ficheiros estáticos.

Para produção, configure `STORAGE_PROVIDER=r2`, duas buckets R2 distintas e credenciais restritas no servidor da API. `R2_PUBLIC_BASE_URL` deve usar um domínio próprio para as fotografias; a bucket privada não recebe URL público. As credenciais R2 ainda não estão configuradas neste ambiente.

Na Fase 6, `/administracao` exige uma conta com o papel `ADMIN`. A API protege `/api/v1/admin` por papel e CSRF, regista decisões em `audit_logs` e nunca expõe chaves dos documentos privados. O formulário de denúncia ligado a anúncios reais aprovados grava pedidos para revisão; anúncios demonstrativos não aceitam denúncias.

Para criar uma conta administrativa, use o comando local `pnpm --filter @roof-tech/api admin:create`. O comando cria uma conta nova e recusa alterar uma conta existente. No PowerShell, pode pedir os dados sem escrever a palavra-passe no histórico:

```powershell
$env:ROOFTECH_ADMIN_NAME = Read-Host 'Nome do administrador'
$env:ROOFTECH_ADMIN_EMAIL = Read-Host 'E-mail do administrador'
$securePassword = Read-Host 'Palavra-passe (12 a 128 caracteres)' -AsSecureString
$env:ROOFTECH_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
try { pnpm --filter @roof-tech/api admin:create }
finally {
  Remove-Item Env:\ROOFTECH_ADMIN_NAME, Env:\ROOFTECH_ADMIN_EMAIL, Env:\ROOFTECH_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Variable securePassword -ErrorAction SilentlyContinue
}
```

Não use o formulário público para criar administradores nem guarde estas variáveis no repositório. Em produção, a operação também exige `ROOFTECH_ALLOW_ADMIN_BOOTSTRAP=true` apenas durante a criação controlada.

Na Fase 7, a página inicial carrega destaques da API; `/pesquisa` envia filtros, paginação e ordenação para `GET /api/v1/properties`; `/imoveis/:slug` carrega os detalhes e anúncios relacionados. Os estados de carregamento, erro e lista vazia são apresentados na interface. A denúncia de um anúncio real aprovado é enviada para `POST /api/v1/properties/:slug/reports`. O contacto directo com anunciantes ainda não está implementado; os dados de demonstração não representam disponibilidade ou anunciantes reais.

A preparação da Fase 8 está documentada em [docs/deployment.md](docs/deployment.md). A publicação continua pendente da criação das contas/serviços, domínios, PostgreSQL gerido e credenciais/buckets R2.
