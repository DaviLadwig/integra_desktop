# Integra Desktop 1.0.4 — Correção de Relatórios e teste do atualizador

## 1. Diagnóstico

No teste da versão 1.0.3, o PDF do checklist funcionou, mas a página Relatórios não conseguiu exportar Excel e PDF. A leitura do código identificou uma diferença de fluxo:

- O checklist obtém diretamente as bases armazenadas no histórico local (`historyGetAll` e `historyGet`).
- Os relatórios exigem `window._siapsLoaded` e o objeto agregado `D` já ativo no painel. Após abrir/reinstalar o aplicativo, pode existir histórico local acessível no checklist sem que uma base esteja ativada no painel.
- Os botões da tela Relatórios estavam vinculados por `onclick` no HTML, sem um fluxo próprio que mostrasse a ausência de uma base selecionada.

A versão 1.0.4 mantém os geradores de arquivo e o salvamento nativo já existentes, mas adiciona a seleção explícita da base local e eventos de clique próprios na tela Relatórios.

## 2. Arquivos alterados/criados (caminhos relativos)

| Caminho | Tipo | Parte alterada |
| --- | --- | --- |
| `app/index.html` | Alterado | Seção `sectionReports`: seleção `reportBaseSelect`, status `reportSourceStatus`, atributos `data-report-export` nos botões, inclusão de `reports-source.js`. |
| `app/assets/styles/reports.css` | Alterado | Seção `.reports-source`: layout responsivo, legibilidade e estados de erro/sucesso nos temas claro e escuro. |
| `app/assets/scripts/app.js` | Alterado | `initializeApp()` registra a tela Relatórios; `showSection()` atualiza as bases quando a aba é aberta. |
| `app/assets/scripts/reports-source.js` | **Novo** | `initializeReportExports`, `refreshReportExportSources`, `selectReportHistoryBase` e `runReportExport`; acesso somente ao histórico local e exportação após escolha da base. |
| `package.json` | Alterado | Versão `1.0.4`. |
| `src-tauri/Cargo.toml` | Alterado | Versão `1.0.4` e manutenção da dependência `serde_json = "1"` da correção E0433. |
| `CHANGELOG_RELEASE.md` | Alterado | Notas da versão 1.0.4. |
| `README.md` | Alterado | Correções da nova versão e passos de build MSI/NSIS. |
| `CONFIGURAR_ATUALIZADOR.md` | Alterado | Orientação para publicar 1.0.4 sem publicar a versão 1.0.3 com falha nos relatórios. |
| `scripts/preparar-atualizacao-1.0.4.cjs` | **Novo** | Ajusta somente a versão do Tauri e do `package-lock.json`, preservando a chave pública assinada. |
| `tests/smoke-reports-ui.cjs` | **Novo** | Testa escolha de competência, bloqueio de exportação sem dados e acionamento dos botões. |
| `tests/smoke-reports-files.cjs` | **Novo** | Testa Excel com três abas e PDF com dados fictícios. |
| `tests/smoke-version-1.0.4.cjs` | **Novo** | Testa idempotência do ajuste de versão e preservação da chave pública. |
| `RELATORIO_TECNICO_1.0.4.md` | **Novo** | Este documento. |

**Não incluir/substituir `src-tauri/tauri.conf.json` pelo ZIP.** Esse arquivo contém a chave pública específica da instalação da assinatura. O script incluso ajusta o campo `version` de `1.0.3` para `1.0.4` sem mudar a chave.

## 3. Aplicação segura sobre o repositório existente

1. Mantenha a versão 1.0.3 instalada no Windows: ela será a origem do teste de atualização automática.
2. Extraia o ZIP na raiz do projeto original `INTEGRA_DESKTOP_TAURI_FINAL` e permita substituir os arquivos do pacote. Não inclua arquivos de acesso, pastas de usuários nem chaves privadas no Git.
3. No PowerShell, com a pasta original aberta no VS Code, execute:

   ```powershell
   node scripts/preparar-atualizacao-1.0.4.cjs
   ```

   Resultado esperado: `OK: Integra 1.0.4 preparado; chave pública mantida sem alteração.`

4. Faça os testes rápidos locais:

   ```powershell
   node tests/smoke-reports-ui.cjs
   node tests/smoke-reports-files.cjs
   node tests/smoke-version-1.0.4.cjs
   node tests/smoke-exports.cjs
   node tests/smoke-pdf.cjs
   ```

5. Verifique `git status` e `git diff --check`. Adicione apenas os arquivos do pacote e os dois arquivos ajustados de versão (`src-tauri/tauri.conf.json` e `package-lock.json`). Não execute `git add .` sem conferir o conteúdo.
6. Faça commit e push para `main`, execute o workflow manual `Gerar e publicar Integra para Windows` e confirme que ele ficou verde.
7. Depois da compilação válida, envie a tag **`v1.0.4`** para acionar a publicação automática da Release assinada.
8. Na instalação **1.0.3**, com internet, clique em **Atualizações** para detectar e instalar 1.0.4. Confirme a versão e a preservação dos dados locais. Repita o uso offline e teste os relatórios.

## 4. Requisitos de segurança e compatibilidade

- Nenhum dado de paciente, planilha ou credencial é transmitido pela correção.
- A seleção de competência consulta o IndexedDB local e exige escolha explícita antes de usar uma base histórica nos relatórios.
- A versão permanece no mesmo identificador Tauri; o pacote não modifica o schema do IndexedDB nem a lógica de autenticação.
- O código de exportação permanece no backend Rust com escolha do destino pelo usuário, validação de extensão e assinatura do arquivo.
- A chave privada continua exclusivamente fora do repositório, nos GitHub Actions Secrets.
- Não se deve publicar uma Release com arquivos de instalador diferentes da assinatura e do `latest.json` gerados no mesmo build.

## 5. Validação realizada e pendente

**Verificado neste ambiente:** sintaxe dos scripts, contratos de salvamento, geração de Excel com três abas, PDF com cabeçalho válido, ações da tela Relatórios, seleção e ativação de base salva, atualização de versão idempotente e integridade do ZIP.

**Pendente no Windows:** compilação Rust/Tauri 1.0.4 pelo GitHub Actions, atualização real da instalação 1.0.3 via Tauri, exportação com uma base SIAPS de teste, testes de contraste do modo claro e preservação de IndexedDB/credencial após a atualização.
