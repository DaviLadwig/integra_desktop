/**
 * =========================================================
 * DASHBOARD.JS
 * =========================================================
 *
 * Responsável por:
 * - renderizar visão geral;
 * - montar cards dos indicadores;
 * - filtrar por equipe;
 * - abrir detalhes de cada indicador;
 * - listar pacientes;
 * - exibir boas práticas;
 * - renderizar aba Equipes;
 * - renderizar aba Boas Práticas.
 *
 * Depende de:
 *
 * state.js
 *   D
 *   L
 *   GC
 *   GL
 *   sINE
 *   aC
 *   aM
 *   aGP
 *
 * indicators.js
 *   PR
 */


/**
 * =========================================================
 * CATEGORIAS DO PAINEL
 * =========================================================
 */

const CATS = [

    {
        k: 'sem_domicilio',
        label: 'Sem Domicílio',
        icon: 'home',
        totalKey: 'sem_domicilio',
        pendingKey: null,
        boasPraticas: false
    },

    {
        k: 'sem_acompanhamento',
        label: 'Sem Acompanhamento',
        icon: 'user',
        totalKey: 'sem_acompanhamento',
        pendingKey: null,
        boasPraticas: false
    },

    {
        k: 'crianca',
        label: 'Crianças',
        icon: 'child',
        totalKey: 'crianca_total',
        pendingKey: 'crianca_nao_acomp',
        boasPraticas: true
    },

    {
        k: 'gestante',
        label: 'Gestantes',
        icon: 'pregnant',
        totalKey: 'gestante_total',
        pendingKey: 'gestante_nao_acomp',
        boasPraticas: true
    },

    {
        k: 'diabetes',
        label: 'Diabéticos',
        icon: 'droplet',
        totalKey: 'diabetes_total',
        pendingKey: 'diabetes_nao_acomp',
        boasPraticas: true
    },

    {
        k: 'hipertenso',
        label: 'Hipertensos',
        icon: 'heart',
        totalKey: 'hipertenso_total',
        pendingKey: 'hipertenso_nao_acomp',
        boasPraticas: true
    },

    {
        k: 'idoso',
        label: 'Idosos',
        icon: 'elderly',
        totalKey: 'idoso_total',
        pendingKey: 'idoso_nao_acomp',
        boasPraticas: true
    },

    {
        k: 'mulher',
        label: 'Mulheres',
        icon: 'female',
        totalKey: 'mulher_total',
        pendingKey: 'mulher_nao_acomp',
        boasPraticas: true
    }

];

function isDashboardCategoryAvailable(categoryKey) {

    const available =
        window._siapsAvailableCategories;


    if (!Array.isArray(available)) {
        return true;
    }


    return available.includes(categoryKey);
}


/**
 * =========================================================
 * INICIALIZAÇÃO
 * =========================================================
 */

function initDashboard() {

    const select =
        document.getElementById('sel');


    if (!select) {

        console.warn(
            '#sel não encontrado.'
        );

        return;

    }


    select.innerHTML =
        '<option value="all">Todas as equipes</option>';


    Object.values(D)
        .sort(
            (a, b) =>
                String(a.equipe)
                    .localeCompare(
                        String(b.equipe),
                        'pt-BR'
                    )
        )
        .forEach(team => {

            const option =
                document.createElement(
                    'option'
                );


            option.value =
                String(team.ine);


            option.textContent =
                `${team.equipe} (${team.ine})`;


            select.appendChild(
                option
            );

        });


    sINE = 'all';
    aC = null;
    aM = 'gp';
    aGP = null;


    renderDashboard();


    /**
     * Atualiza outras páginas.
     */
    renderTeams();
    renderPractices();

}


/**
 * =========================================================
 * FILTRO POR EQUIPE
 * =========================================================
 */

function ft() {

    const select =
        document.getElementById('sel');


    if (!select) {
        return;
    }


    sINE =
        select.value;


    aC = null;
    aGP = null;
    aM = 'gp';


    renderDashboard();

}


/**
 * =========================================================
 * EQUIPES SELECIONADAS
 * =========================================================
 */

function getSelectedTeams() {

    if (sINE === 'all') {

        return Object.values(D);

    }


    const team =
        D[String(sINE)];


    return team
        ? [team]
        : [];

}


/**
 * =========================================================
 * SOMA CONSOLIDADA
 * =========================================================
 */

function getAggregatedData(
    teams
) {

    const result = {};


    CATS.forEach(category => {

        result[
            category.totalKey
        ] =
            teams.reduce(
                (sum, team) => {

                    return (
                        sum +
                        (
                            Number(
                                team[
                                category.totalKey
                                ]
                            )
                            ||
                            0
                        )
                    );

                },
                0
            );


        if (
            category.pendingKey
        ) {

            result[
                category.pendingKey
            ] =
                teams.reduce(
                    (sum, team) => {

                        return (
                            sum +
                            (
                                Number(
                                    team[
                                    category.pendingKey
                                    ]
                                )
                                ||
                                0
                            )
                        );

                    },
                    0
                );

        }

    });


    return result;

}


/**
 * =========================================================
 * RENDER PRINCIPAL
 * =========================================================
 */

function renderDashboard() {

    const container =
        document.getElementById('mc');


    if (!container) {
        return;
    }


    const teams =
        getSelectedTeams();


    const aggregated =
        getAggregatedData(
            teams
        );


    let html = '';


    /**
     * Cabeçalho da área de indicadores.
     */
    html +=
        buildDashboardSummary(
            teams
        );


    /**
     * Cards.
     */
    html +=
        '<div class="indicator-grid">';


    CATS.forEach(category => {

        html +=
            buildIndicatorCard(
                category,
                aggregated
            );

    });


    html += '</div>';


    /**
     * Painel inferior aberto.
     */
    if (aC) {

        html +=
            buildCategoryPanel(
                teams,
                aggregated
            );

    }


    container.innerHTML =
        html;


    bindDashboardEvents();

}


/**
 * =========================================================
 * RESUMO SUPERIOR
 * =========================================================
 */

function buildDashboardSummary(
    teams
) {

    if (
        sINE !== 'all' &&
        teams.length
    ) {

        const team =
            teams[0];


        return `
            <section class="dashboard-summary">

                <div>
                    <span class="dashboard-summary__eyebrow">
                        Equipe selecionada
                    </span>

                    <h2>
                        ${escapeDashboardHtml(
            team.equipe
        )}
                    </h2>
                </div>

                <span class="dashboard-summary__badge">
                    INE ${escapeDashboardHtml(
            team.ine
        )}
                </span>

            </section>
        `;

    }


    return `
        <section class="dashboard-summary">

            <div>
                <span class="dashboard-summary__eyebrow">
                    Visão municipal
                </span>

                <h2>
                    Consolidado das equipes
                </h2>
            </div>

            <span class="dashboard-summary__badge">
                ${teams.length}
                ${teams.length === 1
            ? 'equipe'
            : 'equipes'
        }
            </span>

        </section>
    `;

}
function getCategoryIcon(iconName) {

    const icons = {

        home: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 11.5 12 4l9 7.5"></path>
                <path d="M5.5 10.5V20h13v-9.5"></path>
                <path d="M9.5 20v-6h5v6"></path>
            </svg>
        `,

        user: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="7" r="3.5"></circle>
                <path d="M5 20c.7-4 3.1-6 7-6s6.3 2 7 6"></path>
                <path d="M17 5l4 4"></path>
            </svg>
        `,

        child: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="7" r="3"></circle>
                <path d="M8 12h8"></path>
                <path d="M12 10v10"></path>
                <path d="M8 14l4 3 4-3"></path>
                <path d="M9 20l3-3 3 3"></path>
            </svg>
        `,

        pregnant: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10" cy="5.5" r="2.5"></circle>
                <path d="M10 8v5"></path>
                <path d="M10 10c4 0 6 2.5 6 6"></path>
                <path d="M7 21l2-8"></path>
                <path d="M14 21l-1-5"></path>
            </svg>
        `,

        droplet: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"></path>
                <path d="M9 16c.6 1.2 1.6 1.8 3 1.8"></path>
            </svg>
        `,

        heart: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.5 5.8c-2.3-2.3-6-2.2-8.5.5-2.5-2.7-6.2-2.8-8.5-.5-2.5 2.5-2 6.7.8 9.4L12 22l7.7-6.8c2.8-2.7 3.3-6.9.8-9.4z"></path>
                <path d="M4.5 12h4l1.5-3 3 6 1.5-3H20"></path>
            </svg>
        `,

        elderly: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="5" r="2.5"></circle>
                <path d="M11 8v5"></path>
                <path d="M11 10l-4 4"></path>
                <path d="M11 12l4 3"></path>
                <path d="M9 13l-2 7"></path>
                <path d="M13 15l2 5"></path>
                <path d="M17 11v9"></path>
            </svg>
        `,

        female: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="5"></circle>
                <path d="M12 13v8"></path>
                <path d="M8.5 18h7"></path>
            </svg>
        `

    };


    return icons[iconName] || '';
}

/**
 * =========================================================
 * CARD
 * =========================================================
 */

function buildIndicatorCard(
    category,
    aggregated
) {

    if (!isDashboardCategoryAvailable(category.k)) {

        return `
            <article
                class="indicator-card indicator-card--unavailable"
                data-category="${category.k}"
            >

                <div class="indicator-card__head">
                    <span
                        class="indicator-card__icon"
                        aria-hidden="true"
                    >
                        ${getCategoryIcon(category.icon)}
                    </span>

                    <span class="indicator-card__open">
                        Não importado
                    </span>
                </div>

                <span class="indicator-card__label">
                    ${category.label}
                </span>

                <strong class="indicator-card__value">
                    —
                </strong>

                <span class="indicator-card__caption">
                    indisponível neste relatório
                </span>

            </article>
        `;

    }


    const total =
        aggregated[
        category.totalKey
        ]
        ||
        0;


    const pending =
        category.pendingKey
            ? (
                aggregated[
                category.pendingKey
                ]
                ||
                0
            )
            : null;


    const ok =
        pending !== null
            ? Math.max(
                total - pending,
                0
            )
            : null;


    const coverage =
        (
            pending !== null &&
            total > 0
        )
            ? Math.round(
                (
                    ok /
                    total
                )
                *
                100
            )
            : null;


    const activeClass =
        aC === category.k
            ? ' is-active'
            : '';


    let footer = '';


    if (
        category.pendingKey
    ) {

        footer = `
            <div class="indicator-card__status">

                <span class="indicator-status indicator-status--pending">
                    Pendentes
                    <strong>
                        ${formatNumber(
            pending
        )}
                    </strong>
                </span>

                <span class="indicator-status indicator-status--ok">
                    OK
                    <strong>
                        ${formatNumber(
            ok
        )}
                    </strong>
                </span>

            </div>

            <div class="indicator-progress">

                <div
                    class="indicator-progress__bar"
                    style="width:${coverage}%"
                ></div>

            </div>

            <div class="indicator-card__coverage">

                <span>
                    Cobertura
                </span>

                <strong>
                    ${coverage}%
                </strong>

            </div>
        `;

    }


    return `
        <button
            type="button"
            class="indicator-card${activeClass}"
            data-category="${category.k}"
        >

            <div class="indicator-card__head">
                <span
                    class="indicator-card__icon"
                    aria-hidden="true"
                >
                    ${getCategoryIcon(category.icon)}
                </span>

                <span class="indicator-card__open">
                    Ver detalhes
                </span>

            </div>


            <span class="indicator-card__label">
                ${category.label}
            </span>


            <strong class="indicator-card__value">
                ${formatNumber(total)}
            </strong>


            <span class="indicator-card__caption">
                cadastrados
            </span>


            ${footer}

        </button>
    `;

}

function getCategoryArtwork(iconName) {

    const artworks = {

        home: `
            <svg viewBox="0 0 220 220" aria-hidden="true">
                <path d="M38 104L110 48l72 56"></path>
                <path d="M56 92v84h108V92"></path>
                <path d="M92 176v-42h36v42"></path>
                <circle cx="168" cy="62" r="18"></circle>
            </svg>
        `,

        user: `
            <svg viewBox="0 0 220 220" aria-hidden="true">
                <circle cx="110" cy="70" r="28"></circle>
                <path d="M54 176c8-34 28-50 56-50s48 16 56 50"></path>
                <path d="M160 72l26 26"></path>
                <path d="M186 72l-26 26"></path>
            </svg>
        `,

        child: `
            <svg viewBox="0 0 220 220" aria-hidden="true">
                <circle cx="110" cy="64" r="24"></circle>
                <path d="M78 104h64"></path>
                <path d="M110 88v88"></path>
                <path d="M78 120l32 22 32-22"></path>
                <path d="M86 178l24-24 24 24"></path>
            </svg>
        `,

        pregnant: `
            <svg viewBox="0 0 220 220" aria-hidden="true">
                <circle cx="92" cy="52" r="18"></circle>
                <path d="M92 70v44"></path>
                <path d="M92 94c42 0 62 24 62 56"></path>
                <path d="M78 178l16-54"></path>
                <path d="M132 178l-10-38"></path>
            </svg>
        `,

        droplet: `
            <svg viewBox="0 0 220 220" aria-hidden="true">
                <path d="M110 38s48 54 48 92a48 48 0 0 1-96 0c0-38 48-92 48-92z"></path>
                <path d="M88 142c8 10 18 14 30 14"></path>
            </svg>
        `,

        heart: `
            <svg viewBox="0 0 220 220" aria-hidden="true">
                <path d="M172 58c-16-16-42-15-62 6-20-21-46-22-62-6-18 18-14 48 6 68l56 50 56-50c20-20 24-50 6-68z"></path>
                <path d="M58 112h28l12-22 22 42 12-20h30"></path>
            </svg>
        `,

        elderly: `
            <svg viewBox="0 0 220 220" aria-hidden="true">
                <circle cx="102" cy="48" r="18"></circle>
                <path d="M102 66v42"></path>
                <path d="M102 84l-28 30"></path>
                <path d="M102 102l32 24"></path>
                <path d="M88 112l-14 62"></path>
                <path d="M130 128l14 46"></path>
                <path d="M156 92v84"></path>
            </svg>
        `,

        female: `
            <svg viewBox="0 0 220 220" aria-hidden="true">
                <circle cx="110" cy="72" r="34"></circle>
                <path d="M110 106v72"></path>
                <path d="M84 148h52"></path>
            </svg>
        `

    };

    return artworks[iconName] || '';
}

/**
 * =========================================================
 * CLIQUE NO CARD
 * =========================================================
 */

function openCategory(
    categoryKey
) {

    if (
        aC === categoryKey
    ) {

        aC = null;
        aGP = null;

        renderDashboard();

        return;

    }


    aC =
        categoryKey;


    const category =
        CATS.find(
            item =>
                item.k === aC
        );


    /**
     * Categorias com boas práticas
     * abrem direto nelas.
     */
    if (
        category &&
        category.boasPraticas
    ) {

        aM = 'gp';

    } else {

        aM = 'total';

    }


    aGP = null;


    renderDashboard();


    requestAnimationFrame(
        () => {

            const panel =
                document.getElementById(
                    'indicatorDetailPanel'
                );


            if (panel) {

                panel.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

            }

        }
    );

}


/**
 * =========================================================
 * PAINEL DA CATEGORIA
 * =========================================================
 */

function buildCategoryPanel(
    teams,
    aggregated
) {

    const category =
        CATS.find(
            item =>
                item.k === aC
        );


    if (!category) {
        return '';
    }


    const total =
        aggregated[
        category.totalKey
        ]
        ||
        0;


    const pending =
        category.pendingKey
            ? (
                aggregated[
                category.pendingKey
                ]
                ||
                0
            )
            : 0;


    const accompanied =
        Math.max(
            total - pending,
            0
        );


    let tabs = '';


    tabs +=
        buildPanelTab(
            'total',
            'Total',
            total
        );


    if (
        category.pendingKey
    ) {

        tabs +=
            buildPanelTab(
                'nao',
                'Sem acompanhamento',
                pending
            );


        tabs +=
            buildPanelTab(
                'acomp',
                'Acompanhados',
                accompanied
            );

    }


    if (
        category.boasPraticas
    ) {

        tabs +=
            buildPanelTab(
                'gp',
                'Boas práticas',
                null
            );

    }


    return `
        <section
            class="indicator-detail"
            id="indicatorDetailPanel"
        >

            <header class="indicator-detail__header">

                <div>

                    <span class="indicator-detail__eyebrow">
                        Detalhamento
                    </span>

                    <h3>
                        ${category.label}
                    </h3>

                </div>


                <button
                    type="button"
                    class="indicator-detail__close"
                    id="closeIndicatorPanel"
                >
                    Fechar
                </button>

            </header>


            <div class="indicator-detail__tabs">
                ${tabs}
            </div>


            <div
                class="indicator-detail__content"
                id="indicatorPanelContent"
            >
                ${buildPanelContent(
        teams,
        category
    )}
            </div>

        </section>
    `;

}


/**
 * =========================================================
 * ABA DO PAINEL
 * =========================================================
 */

function buildPanelTab(
    mode,
    label,
    quantity
) {

    const active =
        aM === mode
            ? ' is-active'
            : '';


    return `
        <button
            type="button"
            class="indicator-tab${active}"
            data-mode="${mode}"
        >
            ${label}

            ${quantity !== null
            ? `
                        <span>
                            ${formatNumber(
                quantity
            )}
                        </span>
                    `
            : ''
        }
        </button>
    `;

}


/**
 * =========================================================
 * CONTEÚDO DO PAINEL
 * =========================================================
 */

function buildPanelContent(
    teams,
    category
) {

    const ines =
        teams.map(
            team =>
                String(
                    team.ine
                )
        );


    if (
        aM === 'gp' &&
        category.boasPraticas
    ) {

        return buildGoodPractices(
            category,
            ines
        );

    }


    return buildPatientList(
        category,
        ines
    );

}


/**
 * =========================================================
 * BOAS PRÁTICAS
 * =========================================================
 */

function buildGoodPractices(
    category,
    ines
) {

    const practices =
        PR[
        category.k
        ]
        ||
        [];


    let html = `
        <div class="good-practices">

            <div class="good-practices__heading">

                <div>
                    <span>
                        Indicadores assistenciais
                    </span>

                    <strong>
                        Boas práticas
                    </strong>
                </div>

                <small>
                    Selecione um indicador para visualizar os pacientes pendentes.
                </small>

            </div>

            <div class="good-practices__grid">
    `;


    practices.forEach(
        practice => {

            let denominator = 0;
            let compliant = 0;


            ines.forEach(ine => {

                const counters =
                    (
                        GC[
                        category.k
                        ]
                        ||
                        {}
                    )[ine]
                    ||
                    {};


                const value =
                    counters[
                    practice
                    ];


                /**
                 * Mulher:
                 *
                 * [realizado, elegível]
                 */
                if (
                    Array.isArray(value)
                ) {

                    compliant +=
                        value[0]
                        ||
                        0;


                    denominator +=
                        value[1]
                        ||
                        0;

                }


                /**
                 * Demais categorias.
                 *
                 * value = quantidade pendente.
                 */
                else {

                    const total =
                        counters.total
                        ||
                        0;


                    const missing =
                        value
                        ||
                        0;


                    denominator +=
                        total;


                    compliant +=
                        Math.max(
                            total - missing,
                            0
                        );

                }

            });


            const pending =
                Math.max(
                    denominator -
                    compliant,
                    0
                );


            const percentage =
                denominator > 0
                    ? Math.round(
                        (
                            compliant /
                            denominator
                        )
                        *
                        100
                    )
                    : 0;


            const active =
                aGP === practice
                    ? ' is-active'
                    : '';


            html += `
                <button
                    type="button"
                    class="good-practice-card${active}"
                    data-practice="${escapeAttribute(
                practice
            )}"
                >

                    <span class="good-practice-card__label">
                        ${escapeDashboardHtml(
                practice
            )}
                    </span>


                    <div class="good-practice-card__numbers">

                        <div>
                            <strong>
                                ${formatNumber(
                pending
            )}
                            </strong>

                            <span>
                                pendentes
                            </span>
                        </div>


                        <span class="good-practice-card__percentage">
                            ${percentage}% OK
                        </span>

                    </div>


                    <div class="good-practice-card__progress">

                        <div
                            style="width:${percentage}%"
                        ></div>

                    </div>

                </button>
            `;

        }
    );


    html += `
            </div>
    `;


    /**
     * Prática selecionada.
     */
    if (aGP) {

        let patients = [];


        ines.forEach(ine => {

            const list =
                (
                    (
                        GL[
                        category.k
                        ]
                        ||
                        {}
                    )[aGP]
                    ||
                    {}
                )[ine]
                ||
                [];


            list.forEach(
                rawPatient => {

                    const patient =
                        patientArrayToObject(
                            rawPatient
                        );


                    patient.equipe =
                        (
                            D[ine]
                            ||
                            {}
                        ).equipe
                        ||
                        ine;


                    patients.push(
                        patient
                    );

                }
            );

        });


        html += `
            <div class="good-practices__patients">

                <div class="patients-section-heading">

                    <div>
                        <span>
                            Pacientes pendentes
                        </span>

                        <strong>
                            ${escapeDashboardHtml(
            aGP
        )}
                        </strong>
                    </div>

                    <span>
                        ${formatNumber(
            patients.length
        )}
                    </span>

                </div>

                ${buildPatientTable(
            patients,
            ines.length > 1
        )}

            </div>
        `;

    }


    html += '</div>';


    return html;

}


/**
 * =========================================================
 * LISTA DE PACIENTES
 * =========================================================
 */

function buildPatientList(
    category,
    ines
) {

    let patients = [];


    ines.forEach(ine => {

        let list = [];


        /**
         * TOTAL.
         */
        if (
            aM === 'total'
        ) {

            list =
                (
                    L[
                    category.k
                    ]
                    ||
                    {}
                )[ine]
                ||
                [];

        }


        /**
         * SEM ACOMPANHAMENTO.
         */
        else if (
            aM === 'nao'
        ) {

            list =
                (
                    L[
                    category.k +
                    '_nao_acomp'
                    ]
                    ||
                    {}
                )[ine]
                ||
                [];

        }


        /**
         * ACOMPANHADOS.
         */
        else {

            const all =
                (
                    L[
                    category.k
                    ]
                    ||
                    {}
                )[ine]
                ||
                [];


            const missing =
                (
                    L[
                    category.k +
                    '_nao_acomp'
                    ]
                    ||
                    {}
                )[ine]
                ||
                [];


            const missingIds =
                new Set(
                    missing.map(
                        patient =>
                            `${patient[2]}|${patient[3]}`
                    )
                );


            list =
                all.filter(
                    patient =>
                        !missingIds.has(
                            `${patient[2]}|${patient[3]}`
                        )
                );

        }


        list.forEach(
            rawPatient => {

                const patient =
                    patientArrayToObject(
                        rawPatient
                    );


                patient.equipe =
                    (
                        D[ine]
                        ||
                        {}
                    ).equipe
                    ||
                    ine;


                patients.push(
                    patient
                );

            }
        );

    });


    return `
        <div class="patients-section">

            ${buildPatientTable(
        patients,
        ines.length > 1
    )}

        </div>
    `;

}


/**
 * =========================================================
 * CONVERTE PACIENTE
 * =========================================================
 */

function patientArrayToObject(
    patient
) {

    return {

        nome:
            patient[0]
            ||
            '(Nome não informado)',


        semNome:
            Boolean(
                patient[1]
            ),


        cpf:
            patient[2]
            ||
            '',


        cns:
            patient[3]
            ||
            '',


        nascimento:
            patient[4]
            ||
            ''

    };

}


/**
 * =========================================================
 * TABELA DE PACIENTES
 * =========================================================
 */

function buildPatientTable(
    patients,
    showTeam
) {

    const unidentified =
        patients.filter(
            patient =>
                patient.semNome
        ).length;


    let rows = '';


    if (!patients.length) {

        rows = `
            <tr>
                <td
                    colspan="${showTeam ? 7 : 6}"
                    class="patient-table__empty"
                >
                    Nenhum paciente encontrado.
                </td>
            </tr>
        `;

    } else {

        patients.forEach(
            (
                patient,
                index
            ) => {

                const birth =
                    String(
                        patient.nascimento
                        ||
                        ''
                    )
                        .slice(
                            0,
                            10
                        )
                        .replace(
                            'NaT',
                            ''
                        );


                rows += `
                    <tr
                        ${patient.semNome
                        ? 'class="is-unidentified"'
                        : ''
                    }
                    >

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            ${escapeDashboardHtml(
                        patient.nome
                    )
                    }
                        </td>

                        <td class="patient-document">
                            ${escapeDashboardHtml(
                        patient.cpf
                        ||
                        '—'
                    )
                    }
                        </td>

                        <td class="patient-document">
                            ${escapeDashboardHtml(
                        patient.cns
                        ||
                        '—'
                    )
                    }
                        </td>

                        <td>
                            ${escapeDashboardHtml(
                        birth
                        ||
                        '—'
                    )
                    }
                        </td>

                        ${showTeam
                        ? `
                                    <td>
                                        ${escapeDashboardHtml(
                            patient.equipe
                            ||
                            '—'
                        )
                        }
                                    </td>
                                `
                        : ''
                    }

                        <td>

                            ${patient.semNome
                        ? `
                                        <span class="patient-warning">
                                            Não identificado
                                        </span>
                                    `
                        : '—'
                    }

                        </td>

                    </tr>
                `;

            }
        );

    }


    return `
        <div class="patient-list">

            <div class="patient-list__toolbar">

                <input
                    type="search"
                    id="patientSearch"
                    class="patient-search"
                    placeholder="Pesquisar nome, CPF ou CNS"
                    autocomplete="off"
                >

                <div class="patient-list__count">

                    <span id="patientVisibleCount">
                        ${formatNumber(
        patients.length
    )}
                        pacientes
                    </span>

                    ${unidentified
            ? `
                                <span class="patient-list__unidentified">
                                    ${unidentified}
                                    não identificado${unidentified > 1
                ? 's'
                : ''
            }
                                </span>
                            `
            : ''
        }

                </div>

            </div>


            <div class="patient-table-wrap">

                <table
                    class="patient-table"
                    id="patientTable"
                >

                    <thead>

                        <tr>
                            <th>#</th>
                            <th>Nome</th>
                            <th>CPF</th>
                            <th>CNS</th>
                            <th>Nascimento</th>

                            ${showTeam
            ? '<th>Equipe</th>'
            : ''
        }

                            <th>Observação</th>
                        </tr>

                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>

                </table>

            </div>

        </div>
    `;

}


/**
 * =========================================================
 * FILTRO DA TABELA
 * =========================================================
 */

function filterPatientTable() {

    const input =
        document.getElementById(
            'patientSearch'
        );


    const table =
        document.getElementById(
            'patientTable'
        );


    const counter =
        document.getElementById(
            'patientVisibleCount'
        );


    if (
        !input ||
        !table
    ) {
        return;
    }


    const query =
        input.value
            .trim()
            .toLowerCase();


    let visible = 0;


    table
        .querySelectorAll(
            'tbody tr'
        )
        .forEach(row => {

            /**
             * Não conta a linha "nenhum paciente".
             */
            if (
                row.querySelector(
                    '.patient-table__empty'
                )
            ) {

                return;

            }


            const matches =
                !query
                ||
                row.textContent
                    .toLowerCase()
                    .includes(
                        query
                    );


            row.style.display =
                matches
                    ? ''
                    : 'none';


            if (matches) {
                visible++;
            }

        });


    if (counter) {

        counter.textContent =
            `${formatNumber(
                visible
            )} pacientes`;

    }

}


/**
 * =========================================================
 * EVENTOS DO DASHBOARD
 * =========================================================
 */

function bindDashboardEvents() {

    /**
     * Cards principais.
     */
    document
        .querySelectorAll(
            '.indicator-card[data-category]'
        )
        .forEach(card => {

            card.addEventListener(
                'click',
                () => {

                    openCategory(
                        card.dataset.category
                    );

                }
            );

        });


    /**
     * Fechar painel.
     */
    const close =
        document.getElementById(
            'closeIndicatorPanel'
        );


    if (close) {

        close.addEventListener(
            'click',
            () => {

                aC = null;
                aGP = null;

                renderDashboard();

            }
        );

    }


    /**
     * Modos.
     */
    document
        .querySelectorAll(
            '.indicator-tab[data-mode]'
        )
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    aM =
                        button.dataset.mode;


                    aGP = null;


                    refreshIndicatorPanel();

                }
            );

        });


    /**
     * Boas práticas.
     */
    document
        .querySelectorAll(
            '.good-practice-card[data-practice]'
        )
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    const practice =
                        button.dataset.practice;


                    aGP =
                        aGP === practice
                            ? null
                            : practice;


                    refreshIndicatorPanel();

                }
            );

        });


    /**
     * Pesquisa de pacientes.
     */
    const search =
        document.getElementById(
            'patientSearch'
        );


    if (search) {

        search.addEventListener(
            'input',
            filterPatientTable
        );

    }

}


/**
 * =========================================================
 * ATUALIZA SOMENTE PAINEL INFERIOR
 * =========================================================
 */

function refreshIndicatorPanel() {

    const content =
        document.getElementById(
            'indicatorPanelContent'
        );


    if (!content) {

        renderDashboard();

        return;

    }


    const category =
        CATS.find(
            item =>
                item.k === aC
        );


    if (!category) {
        return;
    }


    const teams =
        getSelectedTeams();


    content.innerHTML =
        buildPanelContent(
            teams,
            category
        );


    /**
     * Atualiza estado visual das abas.
     */
    document
        .querySelectorAll(
            '.indicator-tab[data-mode]'
        )
        .forEach(button => {

            button.classList.toggle(
                'is-active',
                button.dataset.mode === aM
            );

        });


    /**
     * Reaplica eventos internos.
     */
    bindDashboardEvents();

}


/**
 * =========================================================
 * PÁGINA EQUIPES
 * =========================================================
 */

function renderTeams() {

    const container =
        document.getElementById(
            'teamsContent'
        );


    if (!container) {
        return;
    }


    if (
        !window._siapsLoaded ||
        !Object.keys(D).length
    ) {

        container.innerHTML = `
            <div class="empty-state empty-state--compact">
                <div class="empty-state__content">

                    <h2>
                        Nenhuma equipe disponível
                    </h2>

                    <p>
                        Importe uma planilha SIAPS para visualizar as equipes.
                    </p>

                </div>
            </div>
        `;

        return;

    }


    const teams =
        Object.values(D)
            .sort(
                (a, b) =>
                    String(
                        a.equipe
                    ).localeCompare(
                        String(
                            b.equipe
                        ),
                        'pt-BR'
                    )
            );


    let html = `
        <div class="teams-overview">

            <div class="teams-overview__summary">

                <span>
                    Equipes identificadas
                </span>

                <strong>
                    ${teams.length}
                </strong>

            </div>


            <div class="teams-grid">
    `;


    teams.forEach(
        team => {

            html += `
                <article class="team-card">

                    <header class="team-card__header">

                        <div>
                            <span>
                                Equipe
                            </span>

                            <h2>
                                ${escapeDashboardHtml(
                team.equipe
            )}
                            </h2>
                        </div>

                        <span class="team-card__ine">
                            ${escapeDashboardHtml(
                team.ine
            )}
                        </span>

                    </header>


                    <div class="team-card__stats">

                        ${buildTeamStat(
                'Sem domicílio',
                team.sem_domicilio,
                isDashboardCategoryAvailable('sem_domicilio')
            )}

                        ${buildTeamStat(
                'Sem acompanhamento',
                team.sem_acompanhamento,
                isDashboardCategoryAvailable('sem_acompanhamento')
            )}

                        ${buildTeamStat(
                'Crianças',
                team.crianca_total,
                isDashboardCategoryAvailable('crianca')
            )}

                        ${buildTeamStat(
                'Gestantes',
                team.gestante_total,
                isDashboardCategoryAvailable('gestante')
            )}

                        ${buildTeamStat(
                'Diabéticos',
                team.diabetes_total,
                isDashboardCategoryAvailable('diabetes')
            )}

                        ${buildTeamStat(
                'Hipertensos',
                team.hipertenso_total,
                isDashboardCategoryAvailable('hipertenso')
            )}

                        ${buildTeamStat(
                'Idosos',
                team.idoso_total,
                isDashboardCategoryAvailable('idoso')
            )}

                        ${buildTeamStat(
                'Mulheres',
                team.mulher_total,
                isDashboardCategoryAvailable('mulher')
            )}

                    </div>


                    <button
                        type="button"
                        class="team-card__open"
                        data-team-ine="${team.ine}"
                    >
                        Abrir na visão geral
                    </button>

                </article>
            `;

        }
    );


    html += `
            </div>

        </div>
    `;


    container.innerHTML =
        html;


    container
        .querySelectorAll(
            '[data-team-ine]'
        )
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    sINE =
                        String(
                            button.dataset.teamIne
                        );


                    const select =
                        document.getElementById(
                            'sel'
                        );


                    if (select) {

                        select.value =
                            sINE;

                    }


                    aC = null;
                    aGP = null;


                    renderDashboard();


                    if (
                        typeof showSection ===
                        'function'
                    ) {

                        showSection(
                            'dashboard'
                        );

                    }

                }
            );

        });

}


/**
 * =========================================================
 * MINI INDICADOR DA EQUIPE
 * =========================================================
 */

function buildTeamStat(
    label,
    value,
    available = true
) {

    return `
        <div class="team-stat${available ? '' : ' team-stat--unavailable'}">

            <span>
                ${label}
            </span>

            <strong>
                ${available
                    ? formatNumber(
                        value || 0
                    )
                    : '—'
                }
            </strong>

        </div>
    `;

}


/**
 * =========================================================
 * PÁGINA BOAS PRÁTICAS
 * =========================================================
 */

function renderPractices() {

    const container =
        document.getElementById(
            'practicesContent'
        );


    if (!container) {
        return;
    }


    if (
        !window._siapsLoaded ||
        !Object.keys(D).length
    ) {

        container.innerHTML = `
            <div class="empty-state empty-state--compact">

                <div class="empty-state__content">

                    <h2>
                        Dados ainda não processados
                    </h2>

                    <p>
                        Importe uma base SIAPS para consultar as boas práticas.
                    </p>

                </div>

            </div>
        `;

        return;

    }


    const ines =
        Object.keys(D);


    let html =
        '<div class="practices-groups">';


    CATS
        .filter(
            category =>
                category.boasPraticas &&
                isDashboardCategoryAvailable(
                    category.k
                )
        )
        .forEach(category => {

            const practices =
                PR[
                category.k
                ]
                ||
                [];


            html += `
                <section class="practice-group">

                    <header class="practice-group__header">

                        <div>
                            <span>
                                Grupo assistencial
                            </span>

                            <h2>
                                ${category.label}
                            </h2>
                        </div>

                    </header>


                    <div class="practice-group__grid">
            `;


            practices.forEach(
                practice => {

                    let denominator = 0;
                    let compliant = 0;


                    ines.forEach(ine => {

                        const counters =
                            (
                                GC[
                                category.k
                                ]
                                ||
                                {}
                            )[ine]
                            ||
                            {};


                        const value =
                            counters[
                            practice
                            ];


                        if (
                            Array.isArray(
                                value
                            )
                        ) {

                            compliant +=
                                value[0]
                                ||
                                0;


                            denominator +=
                                value[1]
                                ||
                                0;

                        } else {

                            const total =
                                counters.total
                                ||
                                0;


                            const missing =
                                value
                                ||
                                0;


                            denominator +=
                                total;


                            compliant +=
                                Math.max(
                                    total -
                                    missing,
                                    0
                                );

                        }

                    });


                    const pending =
                        Math.max(
                            denominator -
                            compliant,
                            0
                        );


                    const percentage =
                        denominator > 0
                            ? Math.round(
                                (
                                    compliant /
                                    denominator
                                )
                                *
                                100
                            )
                            : 0;


                    html += `
                        <article class="practice-summary-card">

                            <span>
                                ${escapeDashboardHtml(
                        practice
                    )}
                            </span>

                            <strong>
                                ${percentage}%
                            </strong>

                            <div class="practice-summary-card__meta">

                                <span>
                                    ${formatNumber(
                        denominator
                    )}
                                    elegíveis
                                </span>

                                <span>
                                    ${formatNumber(
                        pending
                    )}
                                    pendentes
                                </span>

                            </div>


                            <div class="practice-summary-card__progress">

                                <div
                                    style="width:${percentage}%"
                                ></div>

                            </div>

                        </article>
                    `;

                }
            );


            html += `
                    </div>

                </section>
            `;

        });


    html += '</div>';


    container.innerHTML =
        html;

}


/**
 * =========================================================
 * FORMATAÇÃO
 * =========================================================
 */

function formatNumber(
    value
) {

    return Number(
        value || 0
    )
        .toLocaleString(
            'pt-BR'
        );

}


/**
 * =========================================================
 * ESCAPE
 * =========================================================
 */

function escapeDashboardHtml(
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


function escapeAttribute(
    value
) {

    return escapeDashboardHtml(
        value
    );

}