/**
 * =========================================================
 * PAINEL BI
 * =========================================================
 *
 * Visão executiva dos dados SIAPS.
 * Não depende de biblioteca externa de gráficos.
 */


/**
 * Grupos utilizados no BI.
 */
const BI_GROUPS = [

    {
        key: 'crianca',
        label: 'Crianças',
        totalKey: 'crianca_total',
        pendingKey: 'crianca_nao_acomp'
    },

    {
        key: 'gestante',
        label: 'Gestantes',
        totalKey: 'gestante_total',
        pendingKey: 'gestante_nao_acomp'
    },

    {
        key: 'diabetes',
        label: 'Diabéticos',
        totalKey: 'diabetes_total',
        pendingKey: 'diabetes_nao_acomp'
    },

    {
        key: 'hipertenso',
        label: 'Hipertensos',
        totalKey: 'hipertenso_total',
        pendingKey: 'hipertenso_nao_acomp'
    },

    {
        key: 'idoso',
        label: 'Idosos',
        totalKey: 'idoso_total',
        pendingKey: 'idoso_nao_acomp'
    },

    {
        key: 'mulher',
        label: 'Mulheres',
        totalKey: 'mulher_total',
        pendingKey: 'mulher_nao_acomp'
    }

];


function getAvailableBIGroups() {

    const available =
        window._siapsAvailableCategories;


    if (!Array.isArray(available)) {
        return BI_GROUPS;
    }


    return BI_GROUPS.filter(group =>
        available.includes(group.key)
    );
}


function shouldRenderChildPortalBI() {

    return Boolean(
        window._siapsPartialImport &&
        window._siapsPortalDetails &&
        Array.isArray(window._siapsPortalDetails.practices) &&
        window._siapsPortalDetails.practices.length
    );
}


let biChildActiveCriterion = null;


function renderChildPortalBI(container) {

    const details =
        window._siapsPortalDetails;

    const meta =
        window._siapsPortalMeta || {};


    if (!details) {
        return;
    }


    const practices =
        Array.isArray(details.practices)
            ? details.practices
            : [];


    const priorities =
        [...practices]
            .sort((a, b) =>
                b.pending - a.pending
            );


    const activityLevel =
        getCoverageLevel(
            details.activityCoverage
        );


    const practiceLevel =
        getCoverageLevel(
            details.practiceCompliance
        );


    container.innerHTML = `
        <div class="bi-shell bi-child-shell">

            <header class="bi-header bi-child-header">

                <div class="bi-header__title">
                    <span>
                        Integra · Indicador específico
                    </span>

                    <h1>
                        ${escapeBI(meta.indicador || details.indicator || details.groupLabel || 'Indicador SIAPS')}
                    </h1>

                    <p>
                        Análise detalhada da lista nominal importada diretamente do portal SIAPS.
                    </p>

                    <div class="bi-child-meta">
                        <span>
                            Competência
                            <strong>${escapeBI(meta.competencia || 'Não informada')}</strong>
                        </span>

                        <span>
                            Equipe
                            <strong>${escapeBI(meta.equipe || 'Não informada')}</strong>
                        </span>

                        <span>
                            Registros
                            <strong>${formatNumber(details.total)}</strong>
                        </span>
                    </div>
                </div>

                <div class="bi-header__actions bi-child-header__actions">

                    <details class="bi-period-filter" id="biPeriodFilter">
                        <summary>
                            <span>Competências</span>
                            <strong id="biPeriodFilterLabel">
                                ${escapeBI(window._siapsHistoryPeriodLabel || meta.competencia || 'Competência atual')}
                            </strong>
                        </summary>

                        <div class="bi-period-filter__panel">
                            <div class="bi-period-filter__heading">
                                <strong>Período apresentado</strong>
                                <span>Selecione uma ou mais competências.</span>
                            </div>

                            <div class="bi-period-filter__options" id="biPeriodOptions">
                                <span class="bi-period-filter__loading">
                                    Carregando histórico...
                                </span>
                            </div>

                            <button type="button" class="bi-period-filter__apply" id="biPeriodApply">
                                Aplicar período
                            </button>
                        </div>
                    </details>

                    <div class="bi-filter">
                        <label for="biTeamSelect">
                            Equipe
                        </label>

                        <select id="biTeamSelect">
                            ${buildBITeamOptions()}
                        </select>
                    </div>

                    <button
                        type="button"
                        class="bi-clear-selection"
                        id="biClearSelection"
                        hidden
                    >
                        Limpar seleção
                    </button>

                    <button
                        type="button"
                        class="bi-presentation-button"
                        id="biPresentationButton"
                    >
                        Modo apresentação
                    </button>

                </div>

            </header>


            <section class="bi-kpi-grid bi-child-kpi-grid">

                ${buildBIKpi(
                    `${details.groupLabel || 'Pessoas'} monitoradas`,
                    details.total,
                    'registros na lista nominal',
                    'primary'
                )}

                ${buildBIKpi(
                    'Com prática registrada',
                    details.withAnyPractice,
                    `${details.activityCoverage}% da lista`,
                    activityLevel === 'success'
                        ? 'success'
                        : activityLevel === 'danger'
                            ? 'danger'
                            : 'warning'
                )}

                ${buildBIKpi(
                    'Sem prática registrada',
                    details.withoutAnyPractice,
                    `${Math.max(100 - details.activityCoverage, 0)}% da lista`,
                    details.withoutAnyPractice > 0
                        ? 'danger'
                        : 'success'
                )}

                ${buildBIKpi(
                    'Conformidade das práticas',
                    `${details.practiceCompliance}%`,
                    `${formatNumber(details.totalMarks)} de ${formatNumber(details.possibleMarks)} marcações`,
                    practiceLevel === 'success'
                        ? 'success'
                        : practiceLevel === 'danger'
                            ? 'danger'
                            : 'warning'
                )}

            </section>


            <section class="bi-child-main-grid">

                <article class="bi-panel bi-child-practices-panel">

                    <header class="bi-panel__header">
                        <div>
                            <span>
                                Qualidade assistencial
                            </span>

                            <h2>
                                Cumprimento por prática
                            </h2>
                        </div>

                        <small>
                            Clique em uma prática para destacar
                        </small>
                    </header>

                    <div class="bi-child-practices">
                        ${practices
                            .map(item =>
                                buildChildPracticeRow(item)
                            )
                            .join('')}
                    </div>

                </article>


                <article class="bi-panel bi-child-status-panel">

                    <header class="bi-panel__header">
                        <div>
                            <span>
                                Situação da lista nominal
                            </span>

                            <h2>
                                Registros com atividade
                            </h2>
                        </div>
                    </header>

                    <div class="bi-child-status-content">

                        <div
                            class="bi-ring bi-risk--${activityLevel}"
                            style="--bi-progress:${details.activityCoverage}%"
                        >
                            <div class="bi-ring__inner">
                                <strong id="biChildRingValue">
                                    ${details.activityCoverage}%
                                </strong>

                                <span id="biChildRingLabel">
                                    com prática
                                </span>
                            </div>
                        </div>

                        <div class="bi-child-status-list">

                            <div class="bi-child-status-item bi-child-status-item--success">
                                <span>
                                    Com ao menos uma prática
                                </span>

                                <strong>
                                    ${formatNumber(details.withAnyPractice)}
                                </strong>
                            </div>

                            <div class="bi-child-status-item bi-child-status-item--danger">
                                <span>
                                    Sem prática registrada
                                </span>

                                <strong>
                                    ${formatNumber(details.withoutAnyPractice)}
                                </strong>
                            </div>

                            ${
                                Array.isArray(details.extraMarkers)
                                    ? details.extraMarkers
                                        .map(item => `
                                            <div class="bi-child-status-item">
                                                <span>
                                                    ${escapeBI(item.label)}
                                                </span>

                                                <strong>
                                                    ${formatNumber(item.count)}
                                                </strong>
                                            </div>
                                        `)
                                        .join('')
                                    : ''
                            }

                        </div>

                    </div>

                </article>

            </section>


            <section class="bi-child-secondary-grid">

                <article class="bi-panel">

                    <header class="bi-panel__header">
                        <div>
                            <span>
                                Perfil sociodemográfico
                            </span>

                            <h2>
                                Perfil do grupo
                            </h2>
                        </div>
                    </header>

                    <div class="bi-child-profile-grid">

                        <section class="bi-child-profile-block">
                            <h3>
                                Sexo
                            </h3>

                            ${buildChildDistributionBars(
                                details.sex,
                                details.total
                            )}
                        </section>

                        <section class="bi-child-profile-block">
                            <h3>
                                Raça / cor
                            </h3>

                            ${buildChildDistributionBars(
                                details.race,
                                details.total
                            )}
                        </section>

                    </div>

                </article>


                <article class="bi-panel">

                    <header class="bi-panel__header">
                        <div>
                            <span>
                                Atenção necessária
                            </span>

                            <h2>
                                Principais pendências
                            </h2>
                        </div>

                        <small>
                            Ordenado por quantidade
                        </small>
                    </header>

                    <div class="bi-child-priority-list">
                        ${priorities
                            .map((item, index) =>
                                buildChildPriorityRow(
                                    item,
                                    index + 1
                                )
                            )
                            .join('')}
                    </div>

                </article>

            </section>


            <section class="bi-panel bi-child-criteria-panel">

                <header class="bi-panel__header">
                    <div>
                        <span>
                            Regras do indicador
                        </span>

                        <h2>
                            Critérios monitorados
                        </h2>
                    </div>

                    <small>
                        Dados extraídos da lista nominal do SIAPS
                    </small>
                </header>

                <div class="bi-child-table-wrap">
                    <table class="bi-child-table">
                        <thead>
                            <tr>
                                <th>Critério</th>
                                <th>Descrição</th>
                                <th>Realizados</th>
                                <th>Pendentes</th>
                                <th>Percentual</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${practices
                                .map(item => `
                                    <tr data-child-criterion-row="${item.key}">
                                        <td>
                                            <span class="bi-child-code">
                                                ${item.key}
                                            </span>
                                        </td>

                                        <td>
                                            <strong>
                                                ${escapeBI(item.label)}
                                            </strong>

                                            <small>
                                                ${escapeBI(item.description)}
                                            </small>
                                        </td>

                                        <td>
                                            ${formatNumber(item.completed)}
                                        </td>

                                        <td>
                                            ${formatNumber(item.pending)}
                                        </td>

                                        <td>
                                            <strong>
                                                ${item.percentage}%
                                            </strong>
                                        </td>
                                    </tr>
                                `)
                                .join('')}
                        </tbody>
                    </table>
                </div>

            </section>

        </div>
    `;


    bindChildPortalBIEvents();

    if (typeof hydrateChildBIPeriodFilter === 'function') {
        hydrateChildBIPeriodFilter();
    }
}


async function hydrateChildBIPeriodFilter() {

    const optionsContainer =
        document.getElementById('biPeriodOptions');

    const applyButton =
        document.getElementById('biPeriodApply');

    if (!optionsContainer || !applyButton) {
        return;
    }

    if (typeof getHistoryPeriodsForCategory !== 'function') {
        optionsContainer.innerHTML = `
            <span class="bi-period-filter__loading">
                Histórico local indisponível.
            </span>
        `;
        applyButton.disabled = true;
        return;
    }

    try {
        const activeCategory =
            window._siapsPortalDetails?.category
            ||
            'crianca';


        const periods =
            await getHistoryPeriodsForCategory(
                activeCategory
            );

        if (!periods.length) {
            optionsContainer.innerHTML = `
                <span class="bi-period-filter__loading">
                    Importe outras competências para comparar ou consolidar períodos.
                </span>
            `;
            applyButton.disabled = true;
            return;
        }

        const selected = new Set(
            Array.isArray(window._siapsPortalMeta?.competenciasSelecionadas)
                ? window._siapsPortalMeta.competenciasSelecionadas
                : [
                    normalizeHistoryCompetence(
                        window._siapsPortalMeta?.competencia || ''
                    )
                ].filter(Boolean)
        );

        optionsContainer.innerHTML = periods
            .map(period => `
                <label class="bi-period-option">
                    <input
                        type="checkbox"
                        value="${escapeAttribute(period.key)}"
                        ${selected.has(period.key) ? 'checked' : ''}
                    >

                    <span>
                        <strong>${escapeBI(period.label)}</strong>
                        <small>
                            ${period.files} ${period.files === 1 ? 'arquivo' : 'arquivos'} ·
                            ${formatNumber(period.records)} registros brutos
                        </small>
                    </span>
                </label>
            `)
            .join('');

        applyButton.disabled = false;

        applyButton.addEventListener('click', async () => {

            const selectedKeys = [...optionsContainer.querySelectorAll('input[type="checkbox"]:checked')]
                .map(input => input.value);

            if (!selectedKeys.length) {
                window.alert('Selecione pelo menos uma competência.');
                return;
            }

            applyButton.disabled = true;
            applyButton.textContent = 'Aplicando...';

            try {
                await applyHistoryPeriods(
                    activeCategory,
                    selectedKeys
                );
            } catch (error) {
                console.error('Erro ao aplicar período:', error);
                window.alert(error.message || 'Não foi possível consolidar as competências selecionadas.');
                applyButton.disabled = false;
                applyButton.textContent = 'Aplicar período';
            }
        });

    } catch (error) {
        console.error('Erro ao montar filtro de competências:', error);
        optionsContainer.innerHTML = `
            <span class="bi-period-filter__loading">
                Não foi possível carregar as competências salvas.
            </span>
        `;
        applyButton.disabled = true;
    }
}


function buildChildPracticeRow(item) {

    const level =
        getCoverageLevel(
            item.percentage
        );


    return `
        <button
            type="button"
            class="bi-child-practice bi-risk--${level}"
            data-child-criterion="${item.key}"
            title="${escapeAttribute(item.description)}"
        >
            <span class="bi-child-practice__code">
                ${item.key}
            </span>

            <span class="bi-child-practice__content">
                <span class="bi-child-practice__top">
                    <strong>
                        ${escapeBI(item.label)}
                    </strong>

                    <span>
                        ${formatNumber(item.completed)} / ${formatNumber(detailsSafeTotal())}
                    </span>
                </span>

                <span class="bi-child-practice__bar">
                    <span
                        style="width:${item.percentage}%"
                    ></span>
                </span>
            </span>

            <strong class="bi-child-practice__percentage">
                ${item.percentage}%
            </strong>
        </button>
    `;
}


function detailsSafeTotal() {

    return Number(
        window._siapsPortalDetails?.total || 0
    );
}


function buildChildDistributionBars(
    distribution,
    total
) {

    const entries =
        Object.entries(
            distribution || {}
        )
            .sort((a, b) =>
                Number(b[1]) - Number(a[1])
            );


    if (!entries.length) {
        return `
            <p class="bi-child-profile-empty">
                Informação não disponível.
            </p>
        `;
    }


    return entries
        .map(([label, count]) => {

            const percentage =
                total > 0
                    ? Math.round(
                        (Number(count) / total) * 100
                    )
                    : 0;


            return `
                <div class="bi-child-profile-row">
                    <div class="bi-child-profile-row__top">
                        <span>
                            ${escapeBI(label)}
                        </span>

                        <strong>
                            ${formatNumber(count)} · ${percentage}%
                        </strong>
                    </div>

                    <div class="bi-child-profile-progress">
                        <div style="width:${percentage}%"></div>
                    </div>
                </div>
            `;
        })
        .join('');
}


function buildChildPriorityRow(
    item,
    position
) {

    const pendingRate =
        detailsSafeTotal() > 0
            ? Math.round(
                (item.pending / detailsSafeTotal()) * 100
            )
            : 0;


    const level =
        getPendingLevel(
            pendingRate
        );


    return `
        <button
            type="button"
            class="bi-child-priority bi-risk--${level}"
            data-child-criterion="${item.key}"
        >
            <span class="bi-child-priority__index">
                ${position}
            </span>

            <span class="bi-child-priority__body">
                <strong>
                    ${item.key} · ${escapeBI(item.label)}
                </strong>

                <small>
                    ${formatNumber(item.pending)} pendentes de ${formatNumber(detailsSafeTotal())}
                </small>
            </span>

            <strong class="bi-child-priority__value">
                ${pendingRate}%
            </strong>
        </button>
    `;
}


function bindChildPortalBIEvents() {

    const teamSelect =
        document.getElementById(
            'biTeamSelect'
        );


    if (teamSelect) {

        teamSelect.value =
            String(sINE);


        teamSelect.addEventListener(
            'change',
            () => {

                sINE = teamSelect.value;

                const dashboardSelect =
                    document.getElementById(
                        'sel'
                    );

                if (dashboardSelect) {
                    dashboardSelect.value = sINE;
                }

                renderBI();
            }
        );

    }


    const presentationButton =
        document.getElementById(
            'biPresentationButton'
        );


    if (presentationButton) {
        presentationButton.addEventListener(
            'click',
            toggleBIPresentation
        );
    }


    document
        .querySelectorAll(
            '[data-child-criterion]'
        )
        .forEach(element => {

            element.addEventListener(
                'click',
                () => {

                    const criterion =
                        element.dataset.childCriterion;

                    biChildActiveCriterion =
                        biChildActiveCriterion === criterion
                            ? null
                            : criterion;

                    applyChildCriterionSelection();
                }
            );

        });


    bindBIClearSelectionButton();
    applyChildCriterionSelection();
}


function applyChildCriterionSelection() {

    const selected =
        biChildActiveCriterion;


    document
        .querySelectorAll(
            '[data-child-criterion]'
        )
        .forEach(element => {

            const active =
                selected &&
                element.dataset.childCriterion === selected;

            const muted =
                selected &&
                !active;

            element.classList.toggle(
                'is-active',
                Boolean(active)
            );

            element.classList.toggle(
                'is-muted',
                Boolean(muted)
            );
        });


    document
        .querySelectorAll(
            '[data-child-criterion-row]'
        )
        .forEach(row => {

            row.classList.toggle(
                'is-active',
                Boolean(
                    selected &&
                    row.dataset.childCriterionRow === selected
                )
            );
        });


    updateBIChildFocus();
    updateBIClearSelectionButton();
}


function updateBIChildFocus() {

    const ring =
        document.querySelector(
            '#biContent .bi-child-status-panel .bi-ring'
        );

    const value =
        document.getElementById(
            'biChildRingValue'
        );

    const label =
        document.getElementById(
            'biChildRingLabel'
        );

    if (!ring || !value || !label) {
        return;
    }

    const details =
        window._siapsPortalDetails || {};

    let percentage =
        Number(details.activityCoverage || 0);

    let ringLabel =
        'com prática';

    if (biChildActiveCriterion) {

        const practice =
            Array.isArray(details.practices)
                ? details.practices.find(
                    item =>
                        item.key === biChildActiveCriterion
                )
                : null;

        if (practice) {
            percentage = Number(practice.percentage || 0);
            ringLabel = `Prática ${practice.key}`;
        }
    }

    ring.style.setProperty(
        '--bi-progress',
        `${percentage}%`
    );

    ring.classList.remove(
        'bi-risk--success',
        'bi-risk--attention',
        'bi-risk--warning',
        'bi-risk--danger'
    );

    ring.classList.add(
        `bi-risk--${getCoverageLevel(percentage)}`
    );

    value.textContent = `${percentage}%`;
    label.textContent = ringLabel;
}


function bindBIClearSelectionButton() {

    const button =
        document.getElementById(
            'biClearSelection'
        );

    if (!button || button.dataset.bound === '1') {
        updateBIClearSelectionButton();
        return;
    }

    button.dataset.bound = '1';

    button.addEventListener(
        'click',
        () => {

            biActiveGroup = null;
            biChildActiveCriterion = null;

            if (
                document.querySelector(
                    '#biContent .bi-child-shell'
                )
            ) {
                applyChildCriterionSelection();
            } else {
                applyBIGroupHighlight();
            }
        }
    );

    updateBIClearSelectionButton();
}


function updateBIClearSelectionButton() {

    const button =
        document.getElementById(
            'biClearSelection'
        );

    if (!button) {
        return;
    }

    const hasSelection =
        Boolean(
            biActiveGroup ||
            biChildActiveCriterion
        );

    button.hidden = !hasSelection;
}


/**
 * Estado visual temporário do BI.
 * Não altera os dados nem adiciona novos blocos à tela.
 */
let biActiveGroup = null;
let biTooltipTimer = null;

/* Alterna entre a leitura conjunta e os gráficos de um único grupo. */
let biViewMode = 'geral';
let biSelectedCategory = 'diabetes';


function getCoverageLevel(value) {

    const number = Number(value || 0);

    if (number >= 80) {
        return 'success';
    }

    if (number >= 60) {
        return 'attention';
    }

    if (number >= 40) {
        return 'warning';
    }

    return 'danger';
}


function getPendingLevel(value) {

    const number = Number(value || 0);

    if (number <= 10) {
        return 'success';
    }

    if (number <= 25) {
        return 'attention';
    }

    if (number <= 40) {
        return 'warning';
    }

    return 'danger';
}


function getRiskLabel(level) {

    const labels = {
        success: 'Adequado',
        attention: 'Atenção',
        warning: 'Alerta',
        danger: 'Crítico'
    };

    return labels[level] || 'Informativo';
}


/**
 * =========================================================
 * RENDER PRINCIPAL
 * =========================================================
 */

function renderBI() {

    const container =
        document.getElementById('biContent');


    if (!container) {
        return;
    }


    /**
     * Nenhuma base carregada.
     */
    if (
        !window._siapsLoaded ||
        !Object.keys(D || {}).length
    ) {

        container.innerHTML = `
            <div class="bi-empty">

                <span class="bi-empty__eyebrow">
                    Painel executivo
                </span>

                <h1>
                    Nenhum dado disponível
                </h1>

                <p>
                    Importe uma planilha SIAPS para gerar
                    a visão gerencial do município.
                </p>

                <button
                    type="button"
                    class="btn-primary"
                    id="biImportButton"
                >
                    Importar dados
                </button>

            </div>
        `;


        const button =
            document.getElementById(
                'biImportButton'
            );


        if (button) {

            button.addEventListener(
                'click',
                () => {

                    showSection('import');

                }
            );

        }


        return;
    }


    if (shouldRenderChildPortalBI()) {
        renderChildPortalBI(container);
        return;
    }


    const teams =
        getBITeams();


    const ines =
        teams.map(
            team =>
                String(team.ine)
        );


    const allGroups = getAvailableBIGroups();
    const individual = biViewMode === 'individual';
    if (!allGroups.some(group => group.key === biSelectedCategory)) {
        biSelectedCategory = allGroups[0]?.key || '';
    }
    const biGroups = individual
        ? allGroups.filter(group => group.key === biSelectedCategory)
        : allGroups;


    const stats =
        getBIStats(
            teams,
            biGroups
        );


    const groupStats =
        biGroups.map(
            group =>
                getBIGroupStats(
                    teams,
                    group
                )
        );


    const practiceStats = individual && biGroups[0]
        ? getBIIndividualPracticeStats(biGroups[0].key, ines)
        : biGroups.map(
            group => {

                return {

                    key:
                        group.key,

                    label:
                        group.label,

                    percentage:
                        getBIPracticeCoverage(
                            group.key,
                            ines
                        )

                };

            }
        );


    const priorities =
        [...(individual ? practiceStats.map(item => ({
            ...item,
            total: item.total,
            pending: item.pending,
            pendingPercentage: item.pendingPercentage
        })) : groupStats)]
            .filter(
                item =>
                    item.total > 0
            )
            .sort(
                (a, b) =>
                    b.pendingPercentage -
                    a.pendingPercentage
            )
            .slice(
                0,
                3
            );


    container.innerHTML = `

        <div class="bi-shell">


            <!-- ============================================
                 CABEÇALHO
            ============================================= -->

            <header class="bi-header">

                <div class="bi-header__title">

                    <span>
                        Integra
                    </span>

                    <h1>
                        ${individual && biGroups[0]
                            ? `BI · ${escapeBI(biGroups[0].label)}`
                            : 'Painel executivo'}
                    </h1>

                    <p>
                        ${individual
                            ? 'Análise individual das práticas e equipes do grupo selecionado.'
                            : 'Indicadores de todos os grupos da competência selecionada.'}
                    </p>

                </div>


                <div class="bi-header__actions">

                    <div class="bi-filter bi-filter--month">
                        <label for="biMonthlyCompetenceSelect">Competência</label>
                        <select id="biMonthlyCompetenceSelect" aria-label="Competência do BI">
                            <option value="">Carregando...</option>
                        </select>
                    </div>

                    <div class="bi-filter bi-filter--mode">
                        <label for="biViewModeSelect">Leitura</label>
                        <select id="biViewModeSelect">
                            <option value="geral" ${!individual ? 'selected' : ''}>Consolidada</option>
                            <option value="individual" ${individual ? 'selected' : ''}>Individual</option>
                        </select>
                    </div>

                    ${individual ? `
                        <div class="bi-filter bi-filter--group">
                            <label for="biSelectedCategorySelect">Grupo</label>
                            <select id="biSelectedCategorySelect">
                                ${allGroups.map(group => `
                                    <option value="${escapeBI(group.key)}" ${group.key === biSelectedCategory ? 'selected' : ''}>
                                        ${escapeBI(group.label)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    ` : ''}

                    <div class="bi-filter">

                        <label for="biTeamSelect">
                            Equipe
                        </label>

                        <select id="biTeamSelect">
                            ${buildBITeamOptions()}
                        </select>

                    </div>


                    <button
                        type="button"
                        class="bi-clear-selection"
                        id="biClearSelection"
                        hidden
                    >
                        Limpar seleção
                    </button>

                    <button
                        type="button"
                        class="bi-presentation-button"
                        id="biPresentationButton"
                    >
                        Modo apresentação
                    </button>

                </div>

            </header>


            <!-- ============================================
                 KPIs
            ============================================= -->

            <section class="bi-kpi-grid">

                ${individual && groupStats[0] ? `
                    ${buildBIKpi('Pessoas no grupo', groupStats[0].total, 'registros da competência', 'primary')}
                    ${buildBIKpi('Acompanhadas', groupStats[0].accompanied, 'com acompanhamento', 'success')}
                    ${buildBIKpi('Pendentes', groupStats[0].pending, 'sem acompanhamento', 'danger')}
                    ${buildBIKpi('Cobertura', `${groupStats[0].coverage}%`, 'do grupo selecionado', 'success')}
                ` : `

                ${buildBIKpi(
        'Equipes',
        stats.teams,
        'equipes identificadas',
        'primary'
    )}


                ${buildBIKpi(
        'Sem domicílio',
        window._siapsPartialImport
            ? '—'
            : stats.semDomicilio,
        window._siapsPartialImport
            ? 'não disponível neste relatório'
            : 'cadastros pendentes',
        window._siapsPartialImport
            ? 'primary'
            : 'warning'
    )}


                ${buildBIKpi(
        'Sem acompanhamento',
        window._siapsPartialImport
            ? '—'
            : stats.semAcompanhamento,
        window._siapsPartialImport
            ? 'não disponível neste relatório'
            : 'pessoas sem vínculo',
        window._siapsPartialImport
            ? 'primary'
            : 'danger'
    )}


                ${buildBIKpi(
        'Acompanhamento',
        `${stats.coverage}%`,
        'nos grupos monitorados',
        'success'
    )}

                `}
            </section>


            <!-- ============================================
                 LINHA PRINCIPAL
            ============================================= -->

            <section class="bi-main-grid">


                <!-- DISTRIBUIÇÃO -->

                <article class="bi-panel bi-panel--groups">

                    <header class="bi-panel__header">

                        <div>
                            <span>
                                Perfil assistencial
                            </span>

                            <h2>
                                ${individual ? 'Distribuição por equipe' : 'Distribuição por grupo'}
                            </h2>
                        </div>

                        <small>
                            Quantidade cadastrada
                        </small>

                    </header>


                    <div class="bi-bars">

                        ${individual && biGroups[0]
                            ? buildBIIndividualTeamBars(teams, biGroups[0])
                            : buildBIGroupBars(groupStats)}

                    </div>

                </article>


                <!-- COBERTURA -->

                <article class="bi-panel">

                    <header class="bi-panel__header">

                        <div>
                            <span>
                                Acompanhamento
                            </span>

                            <h2 id="biCoverageTitle">
                                Cobertura geral
                            </h2>
                        </div>

                    </header>


                    <div class="bi-coverage">

                       <div
                            class="bi-ring bi-risk--${getCoverageLevel(stats.coverage)}"
                            style="--bi-progress:${stats.coverage}%"
                            data-bi-ring="true"
                            tabindex="0"
                        >
                            <div class="bi-ring__inner">

                                <strong id="biCoverageValue">
                                    ${stats.coverage}%
                                </strong>

                                <span id="biCoverageLabel">
                                    acompanhados
                                </span>

                            </div>

                        </div>


                        <div class="bi-coverage__legend">

                            ${groupStats
            .map(
                item => `
                                        <div
                                            class="bi-coverage-row"
                                            data-bi-group="${item.key}"
                                            tabindex="0"
                                            role="button"
                                        >

                                            <span>
                                                ${item.label}
                                            </span>

                                            <div>
                                                <strong>
                                                    ${item.coverage}%
                                                </strong>

                                                <small>
                                                    ${formatNumber(
                    item.pending
                )}
                                                    pend.
                                                </small>
                                            </div>

                                        </div>
                                    `
            )
            .join('')
        }

                        </div>

                    </div>

                </article>

            </section>


            <!-- ============================================
                 SEGUNDA LINHA
            ============================================= -->

            <section class="bi-secondary-grid">


                <!-- BOAS PRÁTICAS -->

                <article class="bi-panel">

                    <header class="bi-panel__header">

                        <div>
                            <span>
                                Qualidade assistencial
                            </span>

                            <h2>
                                ${individual ? 'Cumprimento por prática' : 'Boas práticas'}
                            </h2>
                        </div>

                        <small>
                            Conformidade ponderada
                        </small>

                    </header>


                    <div class="bi-practices">

                        ${practiceStats
            .map(
                item =>
                    buildBIPracticeRow(
                        item
                    )
            )
            .join('')
        }

                    </div>

                </article>


                <!-- PRIORIDADES -->

                <article class="bi-panel">

                    <header class="bi-panel__header">

                        <div>
                            <span>
                                Atenção necessária
                            </span>

                            <h2>
                                Principais prioridades
                            </h2>
                        </div>

                    </header>


                    <div class="bi-priorities">

                        ${priorities.length
            ? priorities
                .map(
                    (
                        item,
                        index
                    ) =>
                        buildBIPriority(
                            item,
                            index + 1
                        )
                )
                .join('')
            : `
                                <div class="bi-no-priority">
                                    Nenhuma pendência identificada.
                                </div>
                            `
        }

                    </div>

                </article>

            </section>


            <!-- ============================================
                 EQUIPES
            ============================================= -->

            <section class="bi-panel bi-panel--teams">

                <header class="bi-panel__header">

                    <div>
                        <span>
                            Visão territorial
                        </span>

                        <h2>
                            Situação das equipes
                        </h2>
                    </div>

                    <small>
                        ${formatNumber(
            teams.length
        )}
                        ${teams.length === 1
            ? 'equipe'
            : 'equipes'
        }
                    </small>

                </header>


                ${buildBITeamTable(
            teams
        )}

            </section>


            <div
                class="bi-tooltip"
                id="biTooltip"
                role="status"
                aria-live="polite"
            ></div>


        </div>
    `;


    bindBIEvents();
    if (typeof refreshMonthlyCompetenceSelects === 'function') {
        refreshMonthlyCompetenceSelects();
    }

}


/**
 * =========================================================
 * EQUIPES
 * =========================================================
 */

function getBITeams() {

    if (
        sINE === 'all'
    ) {

        return Object.values(D);

    }


    const team =
        D[String(sINE)];


    return team
        ? [team]
        : [];

}


function buildBITeamOptions() {

    let html = `
        <option value="all">
            Todas as equipes
        </option>
    `;


    Object.values(D)
        .sort(
            (a, b) =>
                String(a.equipe)
                    .localeCompare(
                        String(b.equipe),
                        'pt-BR'
                    )
        )
        .forEach(
            team => {

                html += `
                    <option
                        value="${escapeBI(
                    team.ine
                )}"
                        ${String(sINE) ===
                        String(team.ine)
                        ? 'selected'
                        : ''
                    }
                    >
                        ${escapeBI(
                        team.equipe
                    )}
                    </option>
                `;

            }
        );


    return html;

}


/**
 * =========================================================
 * KPIs
 * =========================================================
 */

function getBIStats(
    teams,
    groups = BI_GROUPS
) {

    let semDomicilio = 0;
    let semAcompanhamento = 0;

    let totalGroups = 0;
    let totalPending = 0;


    teams.forEach(
        team => {

            semDomicilio +=
                Number(
                    team.sem_domicilio
                    ||
                    0
                );


            semAcompanhamento +=
                Number(
                    team.sem_acompanhamento
                    ||
                    0
                );


            groups.forEach(
                group => {

                    totalGroups +=
                        Number(
                            team[
                            group.totalKey
                            ]
                            ||
                            0
                        );


                    totalPending +=
                        Number(
                            team[
                            group.pendingKey
                            ]
                            ||
                            0
                        );

                }
            );

        }
    );


    const accompanied =
        Math.max(
            totalGroups -
            totalPending,
            0
        );


    const coverage =
        totalGroups > 0
            ? Math.round(
                (
                    accompanied /
                    totalGroups
                )
                *
                100
            )
            : 0;


    return {

        teams:
            teams.length,

        semDomicilio,

        semAcompanhamento,

        totalGroups,

        totalPending,

        accompanied,

        coverage

    };

}


function getBIKpiIcon(label) {

    const normalized = String(label || '').toLowerCase();

    if (normalized.includes('equipe')) {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="8" cy="8" r="3"></circle>
                <circle cx="16" cy="9" r="2.5"></circle>
                <path d="M3.5 19c.5-3.4 2.2-5 4.5-5s4 1.6 4.5 5"></path>
                <path d="M13.5 18.5c.4-2.5 1.7-3.7 3.6-3.7 1.8 0 3.1 1.2 3.4 3.7"></path>
            </svg>
        `;
    }

    if (normalized.includes('domicílio') || normalized.includes('domicilio')) {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 11.5 12 4l9 7.5"></path>
                <path d="M5.5 10.5V20h13v-9.5"></path>
                <path d="M9.5 20v-6h5v6"></path>
            </svg>
        `;
    }

    if (normalized.includes('sem acompanhamento')) {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10" cy="7" r="3"></circle>
                <path d="M4 19c.7-3.6 2.7-5.4 6-5.4 2 0 3.5.7 4.5 2"></path>
                <path d="m16 14 5 5"></path>
                <path d="m21 14-5 5"></path>
            </svg>
        `;
    }

    if (normalized.includes('acompanhamento') || normalized.includes('conformidade')) {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 20 6v5c0 5-3.3 8.4-8 10-4.7-1.6-8-5-8-10V6l8-3z"></path>
                <path d="m8.5 12 2.2 2.2 4.8-5"></path>
            </svg>
        `;
    }

    if (normalized.includes('prática') || normalized.includes('pratica')) {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 3h10v18H7z"></path>
                <path d="M9.5 8h5"></path>
                <path d="m9.5 13 1.4 1.4 3.2-3.2"></path>
            </svg>
        `;
    }

    return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 18V9"></path>
            <path d="M10 18V5"></path>
            <path d="M16 18v-7"></path>
            <path d="M22 18H2"></path>
        </svg>
    `;
}


function buildBIKpi(
    label,
    value,
    description,
    type
) {

    return `
        <article
            class="bi-kpi bi-kpi--${type}"
        >

            <div class="bi-kpi__top">
                <span class="bi-kpi__label">
                    ${label}
                </span>

                <span class="bi-kpi__icon" aria-hidden="true">
                    ${getBIKpiIcon(label)}
                </span>
            </div>

            <div class="bi-kpi__value-row">
                <strong>
                    ${typeof value === 'number'
                        ? formatNumber(value)
                        : value
                    }
                </strong>

                <span class="bi-kpi__status-dot" aria-hidden="true"></span>
            </div>

            <small>
                ${description}
            </small>

        </article>
    `;

}


/**
 * =========================================================
 * GRUPOS
 * =========================================================
 */

function getBIGroupStats(
    teams,
    group
) {

    const total =
        teams.reduce(
            (sum, team) => {

                return (
                    sum +
                    Number(
                        team[
                        group.totalKey
                        ]
                        ||
                        0
                    )
                );

            },
            0
        );


    const pending =
        teams.reduce(
            (sum, team) => {

                return (
                    sum +
                    Number(
                        team[
                        group.pendingKey
                        ]
                        ||
                        0
                    )
                );

            },
            0
        );


    const accompanied =
        Math.max(
            total -
            pending,
            0
        );


    const coverage =
        total > 0
            ? Math.round(
                (
                    accompanied /
                    total
                )
                *
                100
            )
            : 0;


    const pendingPercentage =
        total > 0
            ? Math.round(
                (
                    pending /
                    total
                )
                *
                100
            )
            : 0;


    return {

        ...group,

        total,

        pending,

        accompanied,

        coverage,

        pendingPercentage

    };

}


function buildBIGroupBars(
    stats
) {

    const max =
        Math.max(
            ...stats.map(
                item =>
                    item.total
            ),
            1
        );


    return stats
        .map(
            item => {

                const width =
                    Math.max(
                        (
                            item.total /
                            max
                        )
                        *
                        100,
                        item.total > 0
                            ? 2
                            : 0
                    );


                return `
                    <div
                        class="bi-bar-row"
                        data-bi-group="${item.key}"
                        tabindex="0"
                        role="button"
                    >

                        <div class="bi-bar-row__label">

                            <span>
                                ${item.label}
                            </span>

                            <strong>
                                ${formatNumber(
                    item.total
                )}
                            </strong>

                        </div>


                        <div class="bi-bar">

                            <div
                                class="bi-bar__fill"
                                style="width:${width}%"
                            ></div>

                        </div>

                    </div>
                `;

            }
        )
        .join('');

}


/** Barras por equipe para o grupo escolhido na leitura individual. */
function buildBIIndividualTeamBars(teams, group) {
    const entries = teams.map(team => ({
        team,
        total: Number(team[group.totalKey] || 0)
    }));
    const max = Math.max(...entries.map(item => item.total), 1);

    return entries.map(item => `
        <div class="bi-bar-row" data-bi-group="${escapeBI(group.key)}">
            <div class="bi-bar-row__label">
                <span>${escapeBI(item.team.equipe || item.team.ine)}</span>
                <strong>${formatNumber(item.total)}</strong>
            </div>
            <div class="bi-bar">
                <div class="bi-bar__fill" style="width:${Math.round(item.total / max * 100)}%"></div>
            </div>
        </div>
    `).join('');
}


/** Acompanhamento de cada prática individual, sem inventar critérios novos. */
function getBIIndividualPracticeStats(category, ines) {
    const practices = typeof PR !== 'undefined' && Array.isArray(PR[category])
        ? PR[category]
        : [];

    return practices.map(practice => {
        let total = 0;
        let pending = 0;

        ines.forEach(ine => {
            const counters = GC[category]?.[ine] || {};
            const value = counters[practice];
            if (Array.isArray(value)) {
                const eligible = Number(value[1] || 0);
                const performed = Number(value[0] || 0);
                total += eligible;
                pending += Math.max(eligible - performed, 0);
            } else {
                const groupTotal = Number(counters.total || 0);
                total += groupTotal;
                pending += Math.min(Math.max(Number(value || 0), 0), groupTotal);
            }
        });

        return {
            key: category,
            label: practice,
            total,
            pending,
            percentage: total ? Math.round((total - pending) / total * 100) : 0,
            pendingPercentage: total ? Math.round(pending / total * 100) : 0
        };
    });
}


/**
 * =========================================================
 * BOAS PRÁTICAS
 * =========================================================
 */

function getBIPracticeCoverage(
    category,
    ines
) {

    const practices =
        (
            typeof PR !== 'undefined'
            &&
            PR[category]
        )
            ? PR[category]
            : [];


    let compliant = 0;
    let denominator = 0;


    practices.forEach(
        practice => {

            ines.forEach(
                ine => {

                    const counters =
                        (
                            (
                                GC[category]
                                ||
                                {}
                            )[ine]
                            ||
                            {}
                        );


                    const value =
                        counters[
                        practice
                        ];


                    /**
                     * Mulheres:
                     * [realizado, elegível]
                     */
                    if (
                        Array.isArray(
                            value
                        )
                    ) {

                        compliant +=
                            Number(
                                value[0]
                                ||
                                0
                            );


                        denominator +=
                            Number(
                                value[1]
                                ||
                                0
                            );

                    }


                    /**
                     * Demais grupos.
                     */
                    else {

                        const total =
                            Number(
                                counters.total
                                ||
                                0
                            );


                        const missing =
                            Number(
                                value
                                ||
                                0
                            );


                        denominator +=
                            total;


                        compliant +=
                            Math.max(
                                total -
                                missing,
                                0
                            );

                    }

                }
            );

        }
    );


    return denominator > 0
        ? Math.round(
            (
                compliant /
                denominator
            )
            *
            100
        )
        : 0;

}


function buildBIPracticeRow(
    item
) {

    const level =
        getCoverageLevel(
            item.percentage
        );


    return `
        <div
            class="bi-practice-row bi-risk--${level}"
            data-bi-group="${item.key}"
            tabindex="0"
            role="button"
        >

            <div class="bi-practice-row__top">

                <div>
                    <span>
                        ${item.label}
                    </span>

                    <small class="bi-risk-label">
                        ${getRiskLabel(level)}
                    </small>
                </div>

                <strong>
                    ${item.percentage}%
                </strong>

            </div>


            <div class="bi-practice-progress">

                <div
                    class="bi-practice-progress__bar"
                    style="width:${item.percentage}%"
                ></div>

            </div>

        </div>
    `;

}


/**
 * =========================================================
 * PRIORIDADES
 * =========================================================
 */

function buildBIPriority(
    item,
    position
) {

    const level =
        getPendingLevel(
            item.pendingPercentage
        );


    return `
        <div
            class="bi-priority bi-risk--${level}"
            data-bi-group="${item.key}"
            tabindex="0"
            role="button"
        >

            <span class="bi-priority__index">
                ${position}
            </span>


            <div class="bi-priority__body">

                <div class="bi-priority__title">

                    <strong>
                        ${item.label}
                    </strong>

                    <span class="bi-risk-label">
                        ${getRiskLabel(level)}
                    </span>

                </div>

                <span>
                    ${formatNumber(
                        item.pending
                    )}
                    pendentes de
                    ${formatNumber(
                        item.total
                    )}
                </span>

            </div>


            <strong class="bi-priority__rate">
                ${item.pendingPercentage}%
            </strong>

        </div>
    `;

}


/**
 * =========================================================
 * EQUIPES
 * =========================================================
 */

function buildBITeamTable(
    teams
) {

    if (!teams.length) {

        return `
            <div class="bi-empty-table">
                Nenhuma equipe disponível.
            </div>
        `;

    }


    const rows =
        [...teams]
            .sort(
                (a, b) => {

                    const riskA =
                        Number(
                            a.sem_domicilio
                            ||
                            0
                        )
                        +
                        Number(
                            a.sem_acompanhamento
                            ||
                            0
                        );


                    const riskB =
                        Number(
                            b.sem_domicilio
                            ||
                            0
                        )
                        +
                        Number(
                            b.sem_acompanhamento
                            ||
                            0
                        );


                    return (
                        riskB -
                        riskA
                    );

                }
            )
            .map(
                team => {

                    return `
                        <tr
                            data-bi-team="${escapeBI(team.ine)}"
                            tabindex="0"
                            role="button"
                        >

                            <td>
                                <strong>
                                    ${escapeBI(
                        team.equipe
                    )}
                                </strong>

                                <small>
                                    INE
                                    ${escapeBI(
                        team.ine
                    )}
                                </small>
                            </td>


                            <td>
                                ${formatNumber(
                        team.sem_domicilio
                        ||
                        0
                    )}
                            </td>


                            <td>
                                ${formatNumber(
                        team.sem_acompanhamento
                        ||
                        0
                    )}
                            </td>


                            <td>
                                ${formatNumber(
                        team.crianca_total
                        ||
                        0
                    )}
                            </td>


                            <td>
                                ${formatNumber(
                        team.gestante_total
                        ||
                        0
                    )}
                            </td>


                            <td>
                                ${formatNumber(
                        team.diabetes_total
                        ||
                        0
                    )}
                            </td>


                            <td>
                                ${formatNumber(
                        team.hipertenso_total
                        ||
                        0
                    )}
                            </td>


                            <td>
                                ${formatNumber(
                        team.idoso_total
                        ||
                        0
                    )}
                            </td>


                            <td>
                                ${formatNumber(
                        team.mulher_total
                        ||
                        0
                    )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join('');


    return `
        <div class="bi-team-table-wrap">

            <table class="bi-team-table">

                <thead>

                    <tr>
                        <th>Equipe</th>
                        <th>Sem domicílio</th>
                        <th>Sem acomp.</th>
                        <th>Crianças</th>
                        <th>Gestantes</th>
                        <th>Diabetes</th>
                        <th>Hipertensão</th>
                        <th>Idosos</th>
                        <th>Mulheres</th>
                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>

        </div>
    `;

}


/**
 * =========================================================
 * EVENTOS
 * =========================================================
 */

function bindBIEvents() {

    const modeSelect = document.getElementById('biViewModeSelect');
    modeSelect?.addEventListener('change', () => {
        biViewMode = modeSelect.value === 'individual' ? 'individual' : 'geral';
        biActiveGroup = null;
        renderBI();
    });

    const groupSelect = document.getElementById('biSelectedCategorySelect');
    groupSelect?.addEventListener('change', () => {
        biSelectedCategory = groupSelect.value;
        biActiveGroup = null;
        renderBI();
    });

    const teamSelect =
        document.getElementById(
            'biTeamSelect'
        );


    if (teamSelect) {

        teamSelect.value =
            String(sINE);


        teamSelect.addEventListener(
            'change',
            () => {

                sINE =
                    teamSelect.value;

                biActiveGroup = null;


                /**
                 * Sincroniza o filtro da Visão Geral.
                 */
                const dashboardSelect =
                    document.getElementById(
                        'sel'
                    );


                if (dashboardSelect) {

                    dashboardSelect.value =
                        sINE;

                }


                renderBI();

            }
        );

    }


    const presentationButton =
        document.getElementById(
            'biPresentationButton'
        );


    if (presentationButton) {

        presentationButton.addEventListener(
            'click',
            toggleBIPresentation
        );

    }


    bindBIGroupInteractions();
    bindBIRingInteraction();
    bindBITeamInteractions();
    bindBIClearSelectionButton();
    applyBIGroupHighlight();

}


/**
 * =========================================================
 * INTERAÇÕES DO BI
 * =========================================================
 *
 * Mantém exatamente o mesmo conteúdo visual do painel.
 * A interação acontece por realce, tooltip e filtro pela
 * própria tabela de equipes já existente.
 */

function bindBIGroupInteractions() {

    const elements =
        document.querySelectorAll(
            '#biContent [data-bi-group]'
        );


    elements.forEach(
        element => {

            const groupKey =
                element.dataset.biGroup;


            const show = event => {

                showBIGroupTooltip(
                    groupKey,
                    element,
                    event
                );

            };


            element.addEventListener(
                'mouseenter',
                show
            );


            element.addEventListener(
                'mousemove',
                event =>
                    positionBITooltip(
                        event,
                        element
                    )
            );


            element.addEventListener(
                'mouseleave',
                hideBITooltip
            );


            element.addEventListener(
                'focus',
                show
            );


            element.addEventListener(
                'blur',
                hideBITooltip
            );


            element.addEventListener(
                'click',
                () => {

                    biActiveGroup =
                        biActiveGroup === groupKey
                            ? null
                            : groupKey;

                    applyBIGroupHighlight();

                }
            );


            element.addEventListener(
                'keydown',
                event => {

                    if (
                        event.key !== 'Enter' &&
                        event.key !== ' '
                    ) {
                        return;
                    }

                    event.preventDefault();

                    biActiveGroup =
                        biActiveGroup === groupKey
                            ? null
                            : groupKey;

                    applyBIGroupHighlight();

                }
            );

        }
    );

}


function applyBIGroupHighlight() {

    const elements =
        document.querySelectorAll(
            '#biContent [data-bi-group]'
        );


    elements.forEach(
        element => {

            const sameGroup =
                !biActiveGroup ||
                element.dataset.biGroup ===
                    biActiveGroup;


            element.classList.toggle(
                'is-bi-selected',
                Boolean(
                    biActiveGroup &&
                    sameGroup
                )
            );


            element.classList.toggle(
                'is-bi-dimmed',
                Boolean(
                    biActiveGroup &&
                    !sameGroup
                )
            );

        }
    );


    updateBIGeneralFocus();
    updateBIClearSelectionButton();

}


function updateBIGeneralFocus() {

    const ring =
        document.querySelector(
            '#biContent [data-bi-ring]'
        );

    const title =
        document.getElementById(
            'biCoverageTitle'
        );

    const value =
        document.getElementById(
            'biCoverageValue'
        );

    const label =
        document.getElementById(
            'biCoverageLabel'
        );

    if (!ring || !value || !label) {
        return;
    }

    let coverage = 0;
    let ringLabel = 'acompanhados';
    let heading = 'Cobertura geral';

    if (biActiveGroup) {

        const group =
            BI_GROUPS.find(
                item =>
                    item.key === biActiveGroup
            );

        if (group) {
            const stats =
                getBIGroupStats(
                    getBITeams(),
                    group
                );

            coverage = stats.coverage;
            ringLabel = stats.label;
            heading = `Cobertura · ${stats.label}`;
        }

    } else {

        const stats =
            getBIStats(
                getBITeams(),
                getAvailableBIGroups()
            );

        coverage = stats.coverage;
    }

    ring.style.setProperty(
        '--bi-progress',
        `${coverage}%`
    );

    ring.classList.remove(
        'bi-risk--success',
        'bi-risk--attention',
        'bi-risk--warning',
        'bi-risk--danger'
    );

    ring.classList.add(
        `bi-risk--${getCoverageLevel(coverage)}`
    );

    value.textContent = `${coverage}%`;
    label.textContent = ringLabel;

    if (title) {
        title.textContent = heading;
    }
}


function showBIGroupTooltip(
    groupKey,
    element,
    event
) {

    const group =
        BI_GROUPS.find(
            item =>
                item.key === groupKey
        );


    if (!group) {
        return;
    }


    const stats =
        getBIGroupStats(
            getBITeams(),
            group
        );


    const tooltip =
        document.getElementById(
            'biTooltip'
        );


    if (!tooltip) {
        return;
    }


    tooltip.innerHTML = `
        <strong>${escapeBI(stats.label)}</strong>
        <span>${formatNumber(stats.total)} cadastrados</span>
        <span>${formatNumber(stats.accompanied)} acompanhados</span>
        <span>${formatNumber(stats.pending)} pendentes</span>
        <b>${stats.coverage}% de cobertura</b>
    `;


    tooltip.classList.add(
        'is-visible'
    );


    positionBITooltip(
        event,
        element
    );

}


function bindBIRingInteraction() {

    const ring =
        document.querySelector(
            '#biContent [data-bi-ring]'
        );


    if (!ring) {
        return;
    }


    const show = event => {

        const tooltip =
            document.getElementById(
                'biTooltip'
            );


        if (!tooltip) {
            return;
        }


        if (biActiveGroup) {

            const group =
                BI_GROUPS.find(
                    item =>
                        item.key === biActiveGroup
                );

            if (group) {
                const stats =
                    getBIGroupStats(
                        getBITeams(),
                        group
                    );

                tooltip.innerHTML = `
                    <strong>${escapeBI(stats.label)}</strong>
                    <span>${formatNumber(stats.total)} cadastrados</span>
                    <span>${formatNumber(stats.accompanied)} acompanhados</span>
                    <span>${formatNumber(stats.pending)} pendentes</span>
                    <b>${stats.coverage}% de cobertura</b>
                `;
            }

        } else {

            const stats =
                getBIStats(
                    getBITeams(),
                    getAvailableBIGroups()
                );

            tooltip.innerHTML = `
                <strong>Cobertura geral</strong>
                <span>${formatNumber(stats.accompanied)} acompanhamentos adequados</span>
                <span>${formatNumber(stats.totalPending)} pendências</span>
                <b>${stats.coverage}% de cobertura</b>
            `;
        }


        tooltip.classList.add(
            'is-visible'
        );


        positionBITooltip(
            event,
            ring
        );

    };


    ring.addEventListener(
        'mouseenter',
        show
    );


    ring.addEventListener(
        'mousemove',
        event =>
            positionBITooltip(
                event,
                ring
            )
    );


    ring.addEventListener(
        'mouseleave',
        hideBITooltip
    );


    ring.addEventListener(
        'focus',
        show
    );


    ring.addEventListener(
        'blur',
        hideBITooltip
    );

}


function bindBITeamInteractions() {

    const rows =
        document.querySelectorAll(
            '#biContent .bi-team-table tbody tr[data-bi-team]'
        );


    rows.forEach(
        row => {

            const selectTeam = () => {

                const ine =
                    row.dataset.biTeam;


                if (!ine) {
                    return;
                }


                sINE = ine;
                biActiveGroup = null;


                const dashboardSelect =
                    document.getElementById(
                        'sel'
                    );


                if (dashboardSelect) {
                    dashboardSelect.value = ine;
                }


                renderBI();

            };


            row.addEventListener(
                'click',
                selectTeam
            );


            row.addEventListener(
                'keydown',
                event => {

                    if (
                        event.key !== 'Enter' &&
                        event.key !== ' '
                    ) {
                        return;
                    }

                    event.preventDefault();
                    selectTeam();

                }
            );

        }
    );

}


function positionBITooltip(
    event,
    fallbackElement
) {

    const tooltip =
        document.getElementById(
            'biTooltip'
        );


    if (
        !tooltip ||
        !tooltip.classList.contains(
            'is-visible'
        )
    ) {
        return;
    }


    const margin = 14;
    const width =
        tooltip.offsetWidth || 210;
    const height =
        tooltip.offsetHeight || 120;


    let x;
    let y;


    if (
        event &&
        Number.isFinite(event.clientX) &&
        Number.isFinite(event.clientY) &&
        (
            event.clientX !== 0 ||
            event.clientY !== 0
        )
    ) {

        x = event.clientX + 14;
        y = event.clientY + 14;

    } else {

        const rect =
            fallbackElement.getBoundingClientRect();

        x = rect.right + 10;
        y = rect.top;

    }


    if (
        x + width + margin >
        window.innerWidth
    ) {
        x = Math.max(
            margin,
            x - width - 28
        );
    }


    if (
        y + height + margin >
        window.innerHeight
    ) {
        y = Math.max(
            margin,
            window.innerHeight -
                height -
                margin
        );
    }


    tooltip.style.left =
        `${Math.max(margin, x)}px`;

    tooltip.style.top =
        `${Math.max(margin, y)}px`;

}


function hideBITooltip() {

    window.clearTimeout(
        biTooltipTimer
    );


    biTooltipTimer =
        window.setTimeout(
            () => {

                const tooltip =
                    document.getElementById(
                        'biTooltip'
                    );


                if (tooltip) {
                    tooltip.classList.remove(
                        'is-visible'
                    );
                }

            },
            80
        );

}


document.addEventListener(
    'keydown',
    event => {

        if (
            event.key !== 'Escape' ||
            !document.querySelector(
                '.app-section[data-page="bi"].is-active'
            )
        ) {
            return;
        }

        if (!biActiveGroup && !biChildActiveCriterion) {
            return;
        }

        biActiveGroup = null;
        biChildActiveCriterion = null;

        if (
            document.querySelector(
                '#biContent .bi-child-shell'
            )
        ) {
            applyChildCriterionSelection();
        } else {
            applyBIGroupHighlight();
        }
    }
);


/**
 * =========================================================
 * MODO APRESENTAÇÃO
 * =========================================================
 */

async function toggleBIPresentation() {

    const active =
        document.body.classList.contains(
            'bi-presentation'
        );


    if (active) {

        document.body.classList.remove(
            'bi-presentation'
        );


        if (
            document.fullscreenElement &&
            document.exitFullscreen
        ) {

            try {

                await document.exitFullscreen();

            } catch (error) {

                console.warn(
                    'Não foi possível sair do modo tela cheia.',
                    error
                );

            }

        }


        renderBI();

        return;

    }


    document.body.classList.add(
        'bi-presentation'
    );


    if (
        document.documentElement
            .requestFullscreen
    ) {

        try {

            await document
                .documentElement
                .requestFullscreen();

        } catch (error) {

            /**
             * A interface de apresentação continua
             * funcionando mesmo sem Fullscreen API.
             */
            console.warn(
                'Tela cheia não disponível.',
                error
            );

        }

    }


    renderBI();

}


/**
 * Remove a classe caso o usuário saia
 * da tela cheia usando ESC.
 */
document.addEventListener(
    'fullscreenchange',
    () => {

        if (
            !document.fullscreenElement &&
            document.body.classList.contains(
                'bi-presentation'
            )
        ) {

            document.body.classList.remove(
                'bi-presentation'
            );


            if (
                document.querySelector(
                    '.app-section[data-page="bi"].is-active'
                )
            ) {

                renderBI();

            }

        }

    }
);


/**
 * =========================================================
 * ESCAPE
 * =========================================================
 */

function escapeBI(
    value
) {

    return String(
        value ?? ''
    )
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

}
