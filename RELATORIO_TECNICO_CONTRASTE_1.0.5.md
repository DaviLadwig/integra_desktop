# Integra 1.0.5 - Correções de contraste (tema escuro)

## Objetivo

Eliminar textos pouco visíveis nos elementos indicados pelo usuário, sem
alterar o leiaute, os dados exibidos nem os cálculos dos indicadores SIAPS.

## Arquivos criados

### `app/assets/styles/contrast-fixes-1.0.5.css`

Camada de estilos carregada **depois** dos temas existentes para evitar que
regras antigas do modo claro sobreponham o contraste do modo escuro.

1. `#sectionDashboard .toolbar-btn`: fundo grafite-azulado sólido, texto claro
   legível, borda e hover definidos juntos. `toolbar-btn--danger` usa fundo
   vermelho-escuro e texto contrastante. Ajustes complementares nos botões
   secundários das páginas e na variante clara do dashboard.
2. `#sectionImport .history-card__summary`: corrige o contador que aparecia
   quase branco sobre fundo branco no histórico da importação.
3. `#sectionBi .bi-child-profile-block`: fundo, títulos "Sexo" / "Raça / cor",
   categorias, valores, divisórias e trilho de barras com contraste apropriado.
4. `#sectionBi .bi-child-table`: cabeçalho, linhas alternadas, descrições,
   valores de critérios, percentuais, seleção, hover e badges das letras.

### `tests/smoke-contrast-1.0.5.cjs`

Verifica a presença dos seletores e a ordem do novo stylesheet em relação aos
CSS anteriores. Calcula contraste segundo a fórmula WCAG para oito pares de
cores (texto/fundo) usados nas áreas corrigidas, exigindo razão mínima 4,5:1.

## Arquivos alterados

- `app/index.html`: adiciona o stylesheet
  `assets/styles/contrast-fixes-1.0.5.css` depois de `monthly-reports.css`.
- `CHANGELOG_RELEASE.md`: descreve a melhoria visual na versão 1.0.5.
- `PUBLICAR_INTEGRA_1.0.5.md`: inclui os novos arquivos nas instruções de
  teste e `git add` para a publicação posterior.

## Testes executados

- `node tests/smoke-contrast-1.0.5.cjs`: OK, oito combinações com contraste
  mínimo 4,5:1 e ordem do CSS correta.
- Todos os testes `tests/smoke-*.cjs`: OK (11 testes).
- A tentativa de captura automática do layout com Chromium neste ambiente
  foi bloqueada pelo isolamento de processos; conferir visualmente em
  `npm run dev` no Windows antes de publicar.

## Instalação

Esta entrega vem junto de todos os arquivos do pacote de preparação 1.0.5
anterior. Copie o conteúdo do ZIP cumulativo sobre a raiz do projeto
`INTEGRA_DESKTOP_TAURI_FINAL`, sem apagar outras pastas.

1. Abra o aplicativo no tema escuro.
2. Confira os botões **Atualizar base**, **Exportar Excel** e **Limpar dados**
   da Visão Geral, inclusive após passar o mouse.
3. Confira os textos **Sexo**, **Raça / cor**, os nomes e percentuais do
   **Perfil do grupo** no BI individual.
4. Confira descrições, valores e percentuais em **Critérios monitorados**.
5. Repita uma checagem rápida no tema claro e nos botões de Relatórios.

**Nenhum arquivo de assinatura, credencial, banco local ou cálculo clínico foi
modificado por esta etapa visual.**
