# Security Spec - AI Cache Fortress

## Data Invariants
- Uma entrada no cache não pode ser alterada após criada (Imutabilidade).
- O ID do documento deve ser o hash (ou chave única) da proposição/voto para evitar duplicidade.

## The Dirty Dozen Payloads (Rejeitados)
1. Tentativa de update em documento existente.
2. Enviar `beneficiaPovo` como string em vez de booleano.
3. Enviar `tituloAmigavel` com mais de 500 caracteres (Denial of Wallet).
4. Criar documento sem `explicacao`.
5. Tentar deletar uma entrada do cache.
6. Enviar campo extra `admin: true` no payload.
7. Enviar `impacto` invalido (ex: 'extremo').
8. Enviar documento com ID Gigante (> 128 chars).
9. Enviar `createdAt` com timestamp futuro.
10. Tentar listar (`list`) toda a coleção de cache (Prevenção de Raspagem Massiva).
11. Tentar criar cache sem estar logado (opcional, dependendo da UX. Permitiremos anônimo por enquanto mas com validação estrita).
12. Enviar ID com caracteres especiais proibidos.

## Rules Draft
- `allow get: if true;`
- `allow list: if false;` (Não queremos ninguem raspando o cache todo).
- `allow create: if isValidAIExplanacao(request.resource.data);`
- `allow update, delete: if false;`
