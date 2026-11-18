/**
 * Panorama mensal: une grupos SIAPS da mesma competência, apenas em memória.
 * A fonte continua sendo o histórico IndexedDB isolado por usuário.
 * Nenhum registro ou dado pessoal é enviado à rede.
 */

let monthlyCompetenceKey = '';
let monthlyOverviewPending = null;

function resetMonthlyCompetenceSelection() {
    monthlyCompetenceKey = '';
}

/** Retorna competências que possuem listas nominais SIAPS salvas. */
async function getMonthlyCompetences() {
    const items = await historyGetAll();
    const periods = new Map();

    items.forEach(item => {
        if (item.sourceType !== 'portal-siaps' || !item.competenceKey || !item.category) {
            return;
        }

        if (!periods.has(item.competenceKey)) {
            periods.set(item.competenceKey, {
                key: item.competenceKey,
                label: formatHistoryCompetence(item.competenceKey, item.competenceLabel),
                categories: new Set(),
                imports: []
            });
        }

        const period = periods.get(item.competenceKey);
        period.categories.add(item.category);
        period.imports.push(item);
    });

    return [...periods.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/**
 * Cria uma base de leitura conjunta a partir das listas já reconhecidas pelo
 * parser. Não mistura competências ou transforma critérios entre grupos.
 */
function buildMonthlyCompositeWorkbook(imports) {
    if (!Array.isArray(imports) || !imports.length) {
        throw new Error('Nenhuma planilha foi encontrada para a competência selecionada.');
    }

    const periodKeys = new Set(imports.map(item => item.competenceKey));
    if (periodKeys.size !== 1 || periodKeys.has('')) {
        throw new Error('Não é permitido misturar dados de competências diferentes.');
    }

    const esusRows = new Map();
    const categorySheets = new Map();
    const categories = new Set();

    [...imports]
        .sort((a, b) => String(a.importedAt || '').localeCompare(String(b.importedAt || '')))
        .forEach(item => {
            if (item.sourceType !== 'portal-siaps') {
                throw new Error('Este panorama exige listas nominais do portal SIAPS.');
            }

            const profile = getPortalIndicatorProfile(item.indicator);
            if (!profile || profile.category !== item.category) {
                throw new Error(`O indicador de ${historyCategoryLabel(item.category)} ainda não possui mapeamento válido.`);
            }

            if (!Array.isArray(item.records) || !item.records.length) {
                throw new Error(`A base de ${historyCategoryLabel(item.category)} precisa ser importada novamente.`);
            }

            const adapted = buildInternalWorkbookFromPortalReport({
                indicador: item.indicator,
                equipe: item.teamLabel,
                records: item.records,
                competencia: item.competenceLabel
            });

            const esus = sheetToObjects(adapted.workbook.Sheets.ESUSBase);
            esus.forEach((row, index) => {
                const identity = onlyDigitsStr(getField(row, 'CPF/CNS', 'CPF', 'CNS'));
                const ine = onlyDigitsStr(getField(row, 'INE equipe', 'INE'));
                const key = identity
                    ? `${ine}|${identity}`
                    : `${item.id}|${index}`;
                esusRows.set(key, row);
            });

            if (!categorySheets.has(profile.targetSheet)) {
                categorySheets.set(profile.targetSheet, []);
            }

            const sourceRows = sheetToObjects(adapted.workbook.Sheets[profile.targetSheet]);
            categorySheets.get(profile.targetSheet).push(...sourceRows);
            categories.add(profile.category);
        });

    if (!esusRows.size || !categorySheets.size) {
        throw new Error('Não foram encontrados registros válidos para consolidar.');
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet([...esusRows.values()]),
        'ESUSBase'
    );

    categorySheets.forEach((rows, name) => {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
    });

    return {
        workbook,
        categories: [...categories],
        imports: imports.length,
        uniquePeopleByTeam: esusRows.size
    };
}

/** Ativa o período no dashboard e no BI, sem alterar o histórico salvo. */
async function activateMonthlyCompetence(competenceKey) {
    const periods = await getMonthlyCompetences();
    const selected = periods.find(item => item.key === competenceKey);
    if (!selected) {
        throw new Error('A competência escolhida não está mais disponível no histórico.');
    }

    const result = buildMonthlyCompositeWorkbook(selected.imports);
    buildDataFromWorkbook(result.workbook);

    window._siapsLoaded = true;
    window._siapsPartialImport = true;
    window._siapsAvailableCategories = result.categories;
    window._siapsPortalDetails = null;
    window._siapsPortalMeta = {
        indicador: 'Panorama mensal',
        competencia: selected.label,
        equipe: 'Todas as equipes',
        registros: result.uniquePeopleByTeam,
        categoriasImportadas: result.categories.length,
        panoramaMensal: true
    };
    window._siapsActiveHistoryIds = selected.imports.map(item => item.id);
    window._siapsHistoryMode = false;
    window._siapsHistoryPeriodLabel = selected.label;
    window._siapsSource = {
        name: `Indicadores de ${selected.label}`,
        size: 0,
        historyIds: window._siapsActiveHistoryIds.slice()
    };
    monthlyCompetenceKey = selected.key;

    sINE = 'all';
    aC = null;
    aM = 'gp';
    aGP = null;
    if (typeof biActiveGroup !== 'undefined') {
        biActiveGroup = null;
    }

    if (typeof initDashboard === 'function') {
        initDashboard();
    }
    if (typeof updateLoadedDatabaseState === 'function') {
        updateLoadedDatabaseState();
    }
    if (typeof updateDashboardVisibility === 'function') {
        updateDashboardVisibility();
    }
    if (typeof renderBI === 'function') {
        renderBI();
    }

    hydrateMonthlyCompetenceSelects(periods);
    return result;
}

/** Preenche os filtros da Visão Geral e do BI com as mesmas opções. */
function hydrateMonthlyCompetenceSelects(periods) {
    ['monthlyCompetenceSelect', 'biMonthlyCompetenceSelect'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) {
            return;
        }

        select.replaceChildren();
        if (!periods.length) {
            select.add(new Option('Nenhuma competência salva', ''));
            select.disabled = true;
            return;
        }

        periods.forEach(period => {
            const count = period.categories.size;
            const suffix = count === 1 ? 'grupo' : 'grupos';
            select.add(new Option(`${period.label} · ${count} ${suffix}`, period.key));
        });

        select.disabled = false;
        select.value = monthlyCompetenceKey || periods[0].key;
        if (select.dataset.monthlyBound === '1') {
            return;
        }
        select.dataset.monthlyBound = '1';
        select.addEventListener('change', async () => {
            select.disabled = true;
            try {
                await activateMonthlyCompetence(select.value);
            } catch (error) {
                window.alert(error.message || 'Não foi possível carregar a competência.');
                select.disabled = false;
            }
        });
    });
}

/** Atualiza os seletores sem reconstruir o estado dos indicadores. */
async function refreshMonthlyCompetenceSelects() {
    try {
        hydrateMonthlyCompetenceSelects(await getMonthlyCompetences());
    } catch (error) {
        console.error('Não foi possível listar as competências do histórico:', error);
    }
}

/** Reabre automaticamente a competência mais recente quando necessário. */
async function ensureMonthlyOverview() {
    if (monthlyOverviewPending) {
        return monthlyOverviewPending;
    }

    monthlyOverviewPending = (async () => {
        const periods = await getMonthlyCompetences();
        if (!periods.length) {
            hydrateMonthlyCompetenceSelects([]);
            return false;
        }

        if (monthlyCompetenceKey && window._siapsLoaded) {
            hydrateMonthlyCompetenceSelects(periods);
            return true;
        }

        const fromCurrent = normalizeHistoryCompetence(window._siapsPortalMeta?.competencia || '');
        const key = periods.some(period => period.key === fromCurrent)
            ? fromCurrent
            : periods[0].key;
        await activateMonthlyCompetence(key);
        return true;
    })();

    try {
        return await monthlyOverviewPending;
    } finally {
        monthlyOverviewPending = null;
    }
}

