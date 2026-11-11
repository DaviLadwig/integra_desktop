# Integra Desktop — Tauri 0.2.0

Aplicativo desktop offline baseado na versão mais recente do **Integra — Sistema de Produção Isolada**.

## O que esta versão preserva

- Login por usuário e senha.
- Dados isolados por usuário no armazenamento local.
- `administrador` preserva a base histórica legada.
- Importação inteligente das planilhas SIAPS.
- Histórico de competências.
- Dashboard, Equipes, Boas práticas, Checklist, Relatórios e Painel BI.
- Modo claro e modo escuro.
- Logos Integra específicas para claro/escuro.
- Ícone oficial `icone-sistema.png` convertido para os ícones do executável/instalador.
- Correções de contraste do modo escuro, incluindo a tela Equipes.

## Estrutura

- `app/`: aplicação web offline empacotada pelo Tauri.
- `src-tauri/`: projeto Rust/Tauri e configuração do instalador.
- `admin-tools/`: ferramentas administrativas que não devem ser entregues aos usuários finais.
- `.github/workflows/build-windows.yml`: build do instalador no GitHub Actions.
- `BUILD_WINDOWS.cmd`: build local no Windows.

## Armazenamento

Esta versão mantém o IndexedDB atual para reduzir risco de regressão. Os bancos são separados pelo nome do usuário autenticado:

- `administrador`: mantém `siaps_local_history` e `siaps_local_checklist`.
- outros usuários: `siaps_local_history__usuario` e `siaps_local_checklist__usuario`.

Assim, um login novo inicia sem importar o histórico de outro acesso.

## Observação sobre novos acessos após a instalação

Na versão 0.2.0, a lista de credenciais é carregada de `app/acessos.js` e é empacotada no instalador. Portanto, novos acessos criados depois de um Setup já instalado exigem atualizar/recompilar o aplicativo. A migração da autenticação para armazenamento desktop gravável deve ser feita em uma etapa própria.
