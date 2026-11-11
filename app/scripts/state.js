/**
 * =========================================================
 * ESTADO GLOBAL DA APLICAÇÃO
 * =========================================================
 *
 * Variáveis compartilhadas entre:
 *
 * - importação da planilha;
 * - processamento dos dados;
 * - indicadores;
 * - dashboard;
 * - exportação.
 */


/**
 * Dados consolidados das equipes.
 *
 * Estrutura aproximada:
 *
 * D[INE] = {
 *     ine,
 *     equipe,
 *     sem_domicilio,
 *     sem_acompanhamento,
 *     crianca_total,
 *     ...
 * }
 */
let D = {};


/**
 * Listas de pacientes.
 *
 * Utilizada para obter pacientes pertencentes
 * a cada categoria ou situação.
 */
let L = {};


/**
 * Contagem das boas práticas.
 *
 * GC = Good Practices Count.
 *
 * Posteriormente podemos renomear para algo
 * mais descritivo.
 */
let GC = {};


/**
 * Lista de pacientes pendentes por boa prática.
 *
 * GL = Good Practices List.
 */
let GL = {};


/**
 * =========================================================
 * ESTADO DA INTERFACE DO DASHBOARD
 * =========================================================
 */

/**
 * INE atualmente selecionado.
 *
 * "all" = todas as equipes.
 */
let sINE = 'all';


/**
 * Categoria atualmente selecionada.
 *
 * Exemplos:
 *
 * crianca
 * gestante
 * diabetes
 * hipertenso
 */
let aC = null;


/**
 * Modo atual do painel da categoria.
 *
 * gp    = boas práticas
 * total = todos
 * nao   = sem acompanhamento
 * acomp = acompanhados
 */
let aM = 'gp';


/**
 * Boa prática específica selecionada.
 */
let aGP = null;


/**
 * Indica se uma planilha já foi carregada
 * durante a sessão atual.
 */
window._siapsLoaded = false;


/**
 * Armazena informações de diagnóstico da
 * planilha importada.
 */
window._siapsDiag = null;


/**
 * Metadados do arquivo importado na sessão atual.
 */
window._siapsSource = null;

/**
 * Categorias efetivamente disponíveis na base atual.
 * null = base consolidada completa.
 * Array = importação parcial vinda diretamente do portal SIAPS.
 */
window._siapsAvailableCategories = null;
window._siapsPartialImport = false;
window._siapsPortalMeta = null;
window._siapsPortalDetails = null;

/**
 * Histórico local / competências selecionadas.
 */
window._siapsHistoryAvailable = false;
window._siapsActiveHistoryIds = [];
window._siapsHistoryMode = false;
window._siapsHistoryPeriodLabel = '';
