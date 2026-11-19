# Arquitectura da Roof Tech

## Decisões da Fase 1

- Monorepositório `pnpm` com aplicações separadas para o cliente web e a API.
- SPA React/Vite/TypeScript; a API é Express/TypeScript e publica contratos REST em `/api/v1`.
- `packages/shared` guarda contratos e tipos que possam ser usados pelo navegador e pelo servidor.
- A lógica da API será organizada em routes, controllers, services, repositories, middlewares, validations e config à medida que os módulos forem implementados.
- Tailwind CSS fornece utilitários; tokens Terra Living vivem no CSS global para manter uma única origem de cores e tipografia. Clash Display local é usada em títulos; a pilha sans do sistema fica no texto corrido e nos controlos.
- O navegador usa o proxy `/api` do Vite durante o desenvolvimento. Em produção, o frontend e o servidor Node serão publicados separadamente e ligados por domínios próprios.
- A API valida o ambiente no arranque e não recebe credenciais do navegador. O ficheiro `.env.example` documenta apenas variáveis locais não secretas.

## Limites da Fase 1

A Fase 1 não liga PostgreSQL nem cria migrações; isso pertence à Fase 3. Também não cria autenticação, operações de imóveis, moderação ou armazenamento de fotografias.

## Decisões da Fase 2

- As rotas públicas são `/`, `/pesquisa` e `/imoveis/:slug`; `/design-system` preserva a pré-visualização da Fase 1.
- Os dados são locais e fictícios. A pesquisa combina bairro, renda máxima, tipo, quartos, água, estacionamento, segurança e disponibilidade; os critérios ficam na query string para partilha e navegação.
- Os valores iniciais distinguem primeiro mês, caução, outros custos declarados e taxa de visita. Valores não indicados não entram no subtotal.
- Na primeira versão, não havia telefone/WhatsApp real, o botão de contacto só mostrava um aviso demonstrativo e as denúncias não eram guardadas. A integração posterior passou a aceitar denúncias para anúncios reais aprovados.
- As localizações públicas mostram apenas bairros. Não há selos de verificação na interface demonstrativa.
- As imagens são carregadas do Unsplash em variantes responsivas e são rotuladas como ilustrativas.

## Limites da Fase 2

Esta fase usava dados locais e não tinha PostgreSQL, autenticação ou persistência de denúncias. As fases seguintes acrescentaram API, base de dados e contas; a integração pública foi concluída na Fase 7.

## Decisões da Fase 3

- PostgreSQL 16 local em Docker, isolado na porta `127.0.0.1:55432` e no volume `rooftech_roof-tech-postgres-data`; a configuração existente na porta 5432 não é alterada.
- Prisma ORM 7 com adapter `pg`; o cliente é gerado para `apps/api/src/generated/prisma`.
- O esquema mantém estados de moderação e disponibilidade separados, usa UUIDs, `Decimal(12,2)` para valores monetários, índices compostos para pesquisa/moderação e restrições SQL para impedir valores monetários ou contagens negativos.
- Os dados demo partem de `packages/shared/src/demo-properties.ts`, são marcados com `isDemo` e a seed recusa execução quando `NODE_ENV=production`.
- A API pública consulta apenas imóveis aprovados, não expõe e-mail, telefone, morada exacta nem documentos privados, valida query strings com Zod e fornece paginação.
- `/api/v1/health` mede disponibilidade do processo; `/api/v1/health/ready` também testa PostgreSQL.

## Limites da Fase 3

Na altura, os endpoints de imóveis e bairros eram apenas de leitura e a interface ainda usava dados locais. As fases posteriores acrescentaram autenticação, publicação, moderação e integração da interface pública. A base de dados desta instalação continua a usar dados demonstrativos.

## Decisões da Fase 4

- As palavras-passe são processadas com Argon2id (`m=19456 KiB`, `t=2`, `p=1`); a API aceita palavras-passe de 12 a 128 caracteres.
- A sessão usa um identificador aleatório opaco de 256 bits. A base de dados guarda apenas o SHA-256 do identificador; as sessões expiram após sete dias e podem ser revogadas no logout.
- O cookie é HttpOnly, SameSite=Lax, Path=/ e Secure em produção, onde usa o prefixo `__Host-`. O frontend não persiste credenciais ou tokens de sessão em localStorage/sessionStorage.
- Cada sessão tem um token CSRF independente, guardado em memória no frontend e exigido no cabeçalho `X-CSRF-Token` em pedidos autenticados de alteração. A API valida também a origem do frontend (`WEB_ORIGIN`) e o Origin/Referer dos pedidos que alteram dados.
- O registo permite apenas `CLIENT` ou `ADVERTISER`; administradores não podem ser criados pelo formulário público. Anunciantes escolhem `OWNER` ou `AGENT` e começam com verificação `NOT_SUBMITTED`.
- Login e registo têm limites de cinco pedidos por IP em quinze minutos, com armazenamento em memória do processo. Uma publicação com várias instâncias deverá trocar este armazenamento por um backend partilhado.
- Rotas privadas exigem uma sessão activa. O perfil de anunciante exige também o papel `ADVERTISER`; actualização de perfil e logout exigem CSRF.

## Limites da Fase 4

Não há recuperação de palavra-passe, verificação de e-mail ou MFA. A gestão administrativa foi acrescentada na Fase 6 e a pesquisa pública passou a consultar a API na Fase 7.

## Decisões da Fase 5

- O painel do anunciante é separado por papel e sessão: `/anunciante` mostra métricas e pedidos; `/anunciante/imoveis` gere anúncios; `/anunciante/verificacao` acompanha documentos.
- Os anúncios só podem ser alterados pelo anunciante dono. Um anúncio é submetido com estado `PENDING`; o anunciante não tem operação de aprovação. A mudança de disponibilidade é registada em `availability_checks` e só é permitida depois da aprovação administrativa.
- Os dados de anúncios usam os modelos Prisma existentes. Os formulários guardam rascunho, edição, características, imagem principal e ordenação; o limite é dez fotografias por anúncio.
- Fotografias são aceites em JPEG, PNG ou WebP, verificadas pela assinatura binária, limitadas a 8 MB no envio, descodificadas e recomprimidas em WebP até 2000×1500 e 5 MB. Os metadados de orientação são aplicados e os restantes metadados são removidos.
- Documentos de identidade/autorização são aceites em PDF, JPEG, PNG ou WebP; cada pedido contém até três ficheiros de 8 MB. Imagens são optimizadas e PDFs ficam em armazenamento privado. A resposta de listagem expõe apenas metadados; o download exige sessão do próprio anunciante, devolve `no-store` e não expõe a chave de armazenamento.
- Cloudflare R2 é o destino de produção através da API S3 compatível. `property-images` e `verification-documents` usam buckets separadas, e o contrato impede a bucket privada de partilhar URL público. Em desenvolvimento usa-se armazenamento local excluído do Git; só a pasta pública é servida como estática.
- Os carregamentos passam pelo servidor Express e por `sharp`, sem credenciais ou URLs de escrita no navegador. A configuração de produção exige R2 e domínio próprio para as fotografias. As credenciais e buckets ainda precisam de ser criadas/configuradas para publicação.
- As rotas de anunciantes usam o token CSRF para alterações e um limite de carregamentos autenticados. As credenciais e buckets de produção ainda precisam de ser criadas/configuradas.

## Decisões da Fase 6

- O painel administrativo vive em `/administracao`; rotas web e API exigem sessão activa com papel `ADMIN`. Alterações também exigem o token CSRF.
- Revisões de anúncios só aceitam registos reais pendentes. Aprovação publica o anúncio; rejeição exige um motivo. Cada decisão é escrita em `audit_logs` na mesma transacção.
- Documentos de verificação continuam privados e são descarregados por uma rota administrativa autenticada; aprovação/rejeição actualiza o pedido, o perfil quando se trata de identidade e a auditoria atomicamente. Motivos de rejeição ficam visíveis ao anunciante.
- Denúncias públicas só podem referir anúncios reais aprovados, recebem limite por IP e ficam disponíveis na fila administrativa. O formulário público actual não submete denúncias porque ainda apresenta anúncios demonstrativos.
- Gestão de utilizadores não altera papéis. A suspensão revoga as sessões, impede auto-suspensão e protege a última conta de administrador activa.
- Administradores são criados por comando operacional fora do formulário público. O comando só cria uma conta nova e não promove nem redefine utilizadores existentes.

## Decisões da Fase 7

- A página inicial consulta os destaques aprovados pela API e mantém a imagem ilustrativa do hero como alternativa visual.
- `/pesquisa` envia os filtros e a paginação para a API, sincroniza critérios com a query string e mostra carregamento, erro, lista vazia e paginação.
- `/imoveis/:slug` consulta detalhes e anúncios relacionados pela API, mantendo um estado explícito para anúncio indisponível ou inexistente.
- As imagens da API usam o mesmo modelo de galeria; anúncios demonstrativos ficam marcados na listagem e no detalhe.
- Denúncias para anúncios reais aprovados são submetidas à API e aparecem na fila administrativa. O contacto directo com anunciantes ainda não foi implementado.

## Próxima fase

- Fase 8: a configuração de publicação está preparada em `docs/deployment.md`, `vercel.json` e `apps/api/Dockerfile`. A publicação aguarda alojamento da API, PostgreSQL gerido, domínios e credenciais R2.
