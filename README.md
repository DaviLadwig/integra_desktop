# Integra Desktop v0.3 — Primeiro acesso universal

Projeto Tauri pronto para gerar o instalador Windows do Integra.

## Novidades desta versão

- frontend totalmente separado em `app/assets/`;
- primeiro acesso por arquivo `.integra`;
- validação da assinatura RSA-SHA256;
- usuários novos salvos localmente;
- `Lembrar de mim` guarda somente o usuário;
- dados SIAPS continuam isolados pelo usuário autenticado;
- modo dark e correções visuais preservados;
- ícone oficial do Integra preservado no instalador.

## Build no GitHub

1. Suba este conteúdo para a raiz do repositório.
2. Faça commit e push.
3. Abra **Actions** no GitHub.
4. Execute **Gerar Integra para Windows**.
5. Baixe o artifact `Integra-Windows`.

## Segurança

A chave privada administrativa NÃO faz parte deste projeto. O aplicativo contém apenas a chave pública necessária para validar arquivos `.integra`.
