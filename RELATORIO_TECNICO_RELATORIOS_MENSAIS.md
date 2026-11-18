# Integra - Histórico mensal e relatórios PDF geral/individual

## Entrega

Pacote cumulativo sobre a estrutura do Integra 1.0.4, incluindo a evolução
anterior de Visão Geral e BI mensal. O pacote **não** incrementa o número de
versão, não cria um instalador e não altera chaves de assinatura ou credenciais.

### 1. Histórico da tela Importar

- **`app/assets/scripts/storage.js` - `renderSavedImports()`:** o histórico
  passa a agrupar as planilhas pela `competenceKey`, mantendo os botões Abrir,
  Checklist, Baixar XLSX (quando disponível) e Excluir em cada arquivo. Os
  grupos são elementos nativos `<details>`; o mês mais recente ou ativo fica
  expandido inicialmente. Os meses são classificados do mais recente para o
  mais antigo. Não há alteração no formato do IndexedDB nem exclusão de dados.
- **`app/index.html` - `#historyTitle`:** novo rótulo de competências.
- **`app/assets/styles/monthly-reports.css` - `.history-month`:** visual
  compacto dos meses expansíveis, com teclado e modo escuro.

### 2. PDFs por competência

- **`app/index.html` - `#reportPdfDialog`:** janela de escolha do mês e do tipo
  de PDF (`Geral` ou grupo disponível naquele mês).
- **`app/assets/scripts/reports-source.js` - `openReportPdfDialog()`,
  `refreshPdfScopes()`, `submitReportPdf()`, `runReportExport()`:** lista
  competências do histórico local, limita grupos àqueles realmente salvos,
  valida escolhas, impede cliques simultâneos e exibe os erros de geração.
  Exportação Excel e impressão permanecem associadas à base ativa, conforme
  o comportamento anterior. O PDF também oferece `Base carregada no painel`
  para preservar compatibilidade com arquivos consolidados anteriores.
- **`app/assets/scripts/export.js` - `buildMonthlyReportModel()` e
  `baixarRelatorioMensalPDF()`:** forma um conjunto por competência usando
  `buildMonthlyCompositeWorkbook()` e o cálculo nativo de indicadores. O
  modelo é construído em memória e os objetos globais do dashboard são
  restaurados após a construção. Não há persistência ou transmissão de dados.
- **`app/assets/scripts/export.js` - `baixarRelatorioBaseAtualPDF()`:** mantém
  os PDFs de bases completas já abertas no painel, mesmo que não exista um
  relatório nominal correspondente no histórico mensal.
- **`app/assets/scripts/export.js` - `buildPdfPages()`:** relatório geral com
  grupos importados, totais, pendências, conformidade e detalhamento por
  equipe; relatório individual com apenas o grupo escolhido e tabela própria
  por equipe. As categorias ausentes não são apresentadas como zero.
- **`app/assets/styles/monthly-reports.css` - `.monthly-pdf-dialog`:** modal
  com dois seletores, botões sólidos e responsividade.

### 3. Arquivos da evolução mensal anterior incluídos novamente

O ZIP cumulativo inclui os seguintes arquivos para que a instalação tenha
todas as dependências da evolução anterior, mesmo que o pacote anterior não
tenha sido copiado:

| Arquivo | Responsabilidade |
| --- | --- |
| `app/assets/scripts/monthly-overview.js` | Compõe grupos de uma competência; abastece Visão Geral e BI. |
| `app/assets/scripts/upload.js` | Importação múltipla de planilhas. |
| `app/assets/scripts/app.js` | Ativa o panorama ao entrar em Visão Geral e BI. |
| `app/assets/scripts/bi.js` | Leitura consolidada e individual do BI. |
| `app/assets/styles/monthly-overview.css` | Estilos dos filtros de competência e grupo. |
| `tests/smoke-monthly-overview.cjs` | Verifica fusão por mês, grupos e deduplicação da ESUSBase. |
| `tests/smoke-bi-modes.cjs` | Verifica modos de leitura e gráficos. |
| `RELATORIO_TECNICO_PANORAMA_MENSAL.md` | Relatório da evolução anterior. |

O `app/index.html` entregue já combina as duas etapas.

### 4. Testes acrescentados/atualizados nesta etapa

| Arquivo | Cobertura |
| --- | --- |
| `tests/smoke-monthly-history.cjs` | Dois meses com três planilhas; expansão e ações mantidas. |
| `tests/smoke-monthly-report.cjs` | Geração PDF geral e por grupo; competência; preservação do estado; proteção contra grupo/mês ausente. |
| `tests/smoke-reports-ui.cjs` | Fluxo do modal PDF, seleção e ações Excel/Impressão anteriores. |

Executar na raiz do projeto:

```powershell
node tests/smoke-monthly-history.cjs
node tests/smoke-monthly-report.cjs
node tests/smoke-reports-ui.cjs
```

Todos os testes `tests/smoke-*.cjs` passaram com dados fictícios. Os PDFs
gerados nos testes foram validados com `pdfinfo` e renderizados para inspeção
visual (A4, duas páginas, sem sobreposição ou corte nos exemplos).

### 5. Como instalar e validar no Windows

1. Faça cópia de segurança dos arquivos atuais do projeto.
2. Extraia o ZIP e copie suas pastas/arquivos para a raiz de
   `INTEGRA_DESKTOP_TAURI_FINAL`, preservando a estrutura.
3. Abra o terminal nessa pasta. Para desenvolvimento, instale as dependências
   (`npm install`); tenha Rust/Cargo disponível e execute `npm run dev`.
4. Importe duas listas nominais de grupos diferentes da **mesma competência**
   e uma terceira de outra competência, com dados fictícios/anonimizados.
5. Na tela Importar, expanda o mês e confirme que só suas planilhas aparecem.
   Teste Abrir/Checklist/Baixar/Excluir em dados de ensaio.
6. Em Relatórios > Baixar PDF, selecione o primeiro mês e `Geral`; confira se
   as duas categorias aparecem. Repita escolhendo um grupo específico.
7. Selecione o outro mês e confirme que nenhuma categoria do primeiro foi
   carregada por engano. Revise totais e percentuais com a fonte SIAPS.
8. Confirme que o dashboard permanece na competência que estava ativa antes
   do download.

### 6. Limites e segurança de dados

- A composição depende de arquivos históricos classificados como
  `portal-siaps`, com categoria/competência e registros válidos. Planilhas de
  outros formatos não são automaticamente reinterpretadas como indicadores.
- O relatório geral mostra **somente** os grupos importados daquele mês;
  não presume valores ou conformidade para grupos ausentes.
- `Registros nos grupos` soma participações nos grupos assistenciais. Uma
  pessoa presente em diabetes e hipertensão pode integrar ambos os totais;
  o número não deve ser descrito como pessoas únicas.
- `Sem domicílio` e `Sem acompanhamento` dependem da estrutura VinculoBase,
  normalmente ausente nas listas nominais individuais. Esses campos são
  omitidos como KPIs no PDF mensal em vez de aparecerem incorretamente como 0.
- Não foram modificados autenticação, atualização, assinatura, comandos Rust,
  rede, persistência do histórico ou versão do aplicativo.
- Indicadores e critérios de boas práticas mantêm as rotinas existentes.
  É necessária validação funcional com planilhas reais **anonimizadas** antes
  de criar uma nova versão pública no GitHub Releases.
