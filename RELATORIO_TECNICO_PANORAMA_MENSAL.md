# Integra — Panorama mensal dos indicadores SIAPS

## Objetivo e comportamento

- **Importação:** é possível selecionar ou arrastar várias planilhas XLSX de uma só vez. O processamento ocorre sequencialmente, usando o mesmo parser validado em cada arquivo; cada base continua armazenada no histórico individual do usuário.
- **Visão Geral:** quando existem listas nominais salvas do portal SIAPS, a tela reabre a competência da base atual ou a competência mais recente. O seletor **Competência** muda o mês de referência.
- **Grupos:** a leitura combina os grupos de uma mesma competência, preservando os dados e critérios individuais. O painel mostra os seis grupos reconhecidos atualmente pelo parser: Crianças, Gestantes, Diabéticos, Hipertensos, Idosos e Mulheres.
- **BI:** a leitura **Consolidada** mostra todos os grupos disponíveis; a **Individual** permite selecionar um grupo e apresenta KPIs próprios, distribuição por equipe e cobertura de cada boa prática. O filtro de competência também fica disponível no BI.

## Regras de integridade

1. **Não misturar competências:** o algoritmo rejeita a consolidação de registros pertencentes a meses diferentes.
2. **Não alterar o histórico:** o panorama é construído em memória a partir de leituras no IndexedDB; não regrava nem apaga os registros.
3. **Isolamento local:** a aplicação reutiliza o histórico armazenado no banco local específico do usuário; não realiza requisições externas.
4. **CPF/CNS:** a tabela ESUSBase de apoio elimina repetições do mesmo identificador na mesma equipe, mas a participação de uma pessoa em dois grupos distintos continua contando nas duas categorias, como é correto para análises por grupo.
5. **Grupos não importados:** continuam como indisponíveis, sem inventar números. Sem Domicílio e Sem Acompanhamento dependem da base de vínculo, que não é fornecida nas listas nominais isoladas dos seis grupos.
6. **Sem novas regras clínicas:** cálculos e mapeamentos de boas práticas continuam sendo os já existentes no parser e no módulo de indicadores. É necessária homologação dos números com planilhas reais antes de uso operacional.

## Arquivos alterados

| Caminho relativo | Parte modificada |
|---|---|
| `app/index.html` | Campo de múltiplos arquivos, legenda da área de upload, filtro da competência na Visão Geral e inclusão do CSS/JS do panorama. |
| `app/assets/scripts/upload.js` | `handleFiles()` e eventos do input/dropzone: processamento sequencial, contagem de sucessos/falhas, atualização da seleção do mês. |
| `app/assets/scripts/app.js` | `handleSectionOpen()`: prepara a competência mensal ao abrir Visão Geral ou BI. |
| `app/assets/scripts/bi.js` | `renderBI()` e `bindBIEvents()`: modo consolidado/individual, escolha de grupo e período, KPIs e gráficos por equipe/prática. Novas funções `buildBIIndividualTeamBars()` e `getBIIndividualPracticeStats()`. |

## Arquivos criados

| Caminho relativo | Responsabilidade |
|---|---|
| `app/assets/scripts/monthly-overview.js` | Consulta ao histórico, seleção por competência, montagem da base conjunta e sincronização dos seletores. |
| `app/assets/styles/monthly-overview.css` | Aparência compacta dos filtros, responsividade e alinhamento. |
| `tests/smoke-monthly-overview.cjs` | Valida separação de competências, grupos e remoção de duplicidade de pessoas na base ESUS. |
| `tests/smoke-bi-modes.cjs` | Valida os dois modos do BI e a cobertura por prática com dados fictícios. |
| `RELATORIO_TECNICO_PANORAMA_MENSAL.md` | Este documento. |

**Nenhum arquivo removido.** Os scripts de `app/scripts/` que não são carregados por `app/index.html` não foram alterados. O código em execução é o de `app/assets/scripts/`.

## Instalação

1. Faça uma cópia ou commit do seu projeto original antes de substituir arquivos.
2. Extraia o ZIP na raiz de `INTEGRA_DESKTOP_TAURI_FINAL`, preservando as pastas `app/` e `tests/`.
3. Revise o diff dos arquivos alterados caso tenha feito outras mudanças locais depois da versão 1.0.4.
4. Rode no terminal, dentro da pasta do projeto:

   ```powershell
   node --check app/assets/scripts/monthly-overview.js
   node --check app/assets/scripts/bi.js
   node --check app/assets/scripts/upload.js
   node tests/smoke-monthly-overview.cjs
   node tests/smoke-bi-modes.cjs
   ```

5. Abra o Integra localmente, importe **planilhas de grupos diferentes na mesma competência** e confira as leituras em **Visão Geral** e **BI**.
6. Compare os valores e percentuais com as planilhas de origem. Faça testes com **dados fictícios ou anonimizados**.
7. Somente depois da homologação, prepare uma nova versão (por exemplo 1.0.5) no procedimento de atualização já configurado. **Não regrave a tag `v1.0.4`.**

## Roteiro mínimo de homologação

- [ ] Importar Diabetes, Hipertensão e Crianças da mesma competência; verificar três cards preenchidos e os demais indisponíveis.
- [ ] Selecionar outro mês; conferir que os dados mudam e nenhum registro do mês anterior é somado.
- [ ] Importar duas equipes do mesmo grupo e conferir o agrupamento e o filtro por INE.
- [ ] Verificar uma pessoa que pertença a Diabetes e Hipertensão: ela aparece em ambos os grupos, mas uma vez na base de apoio da equipe.
- [ ] No BI, alternar entre leitura consolidada e individual e conferir percentuais por prática.
- [ ] Fechar/abrir o aplicativo e voltar ao mesmo mês a partir do histórico salvo.
- [ ] Verificar que os relatórios, checklist e fluxo de atualização continuam funcionando.

## Limites desta etapa

- Não foram recebidos nesta conversa arquivos XLSX reais dos seis grupos para homologação dos campos e indicadores. Os testes automatizados usam dados fictícios e não substituem essa validação.
- A base consolidada antiga (uma única planilha com diversas abas) continua disponível pelo fluxo anterior, mas não ganha automaticamente uma competência no histórico se o arquivo não trouxer metadados para isso.
- A soma por categorias representa registros de acompanhamento por grupo, **não pessoas únicas de todo o município**; uma mesma pessoa pode pertencer legitimamente a mais de um grupo.
