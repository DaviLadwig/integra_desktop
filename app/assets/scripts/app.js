/**
 * =========================================================
 * APP.JS
 * =========================================================
 *
 * Responsável por:
 * - inicialização do sistema;
 * - sessão existente;
 * - eventos do login;
 * - navegação principal;
 * - abertura das seções;
 * - integração entre as páginas.
 */


/**
 * =========================================================
 * INICIALIZAÇÃO
 * =========================================================
 */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        initializeApp();

    }
);


function initializeApp() {

    initializeLoginEvents();

    if (typeof initializeFirstAccessUi === 'function') {
        initializeFirstAccessUi();
    }

    initializeNavigation();

    initializeInternalNavigation();

    initializeUpload();

    initializeHistory();

    if (typeof initializeReportExports === 'function') {
        initializeReportExports();
    }

    initializeSession();

}


/**
 * =========================================================
 * LOGIN
 * =========================================================
 */

function initializeLoginEvents() {

    const userInput =
        document.getElementById(
            'lkUser'
        );


    const passwordInput =
        document.getElementById(
            'lkPwd'
        );


    if (userInput) {

        userInput.addEventListener(
            'input',
            event => {

                event.target.value =
                    normalizeAccessUsername(
                        event.target.value
                    );

            }
        );


        userInput.addEventListener(
            'keydown',
            event => {

                if (
                    event.key === 'Enter'
                ) {

                    event.preventDefault();
                    doLogin();
                }

            }
        );

    }


    if (passwordInput) {

        passwordInput.addEventListener(
            'keydown',
            event => {

                if (
                    event.key === 'Enter'
                ) {

                    event.preventDefault();

                    doLogin();

                }

            }
        );

    }

}


/**
 * =========================================================
 * SESSÃO
 * =========================================================
 */

function initializeSession() {

    if (
        typeof isAuthenticated !==
        'function'
    ) {
        return;
    }


    if (
        !isAuthenticated()
    ) {
        return;
    }


    if (
        typeof openAuthenticatedArea ===
        'function'
    ) {

        openAuthenticatedArea();

    }


    /**
     * Sempre começa na tela de importação.
     *
     * Se houver uma base carregada em memória,
     * o usuário continua podendo navegar.
     */
    showSection(
        'import'
    );

}


/**
 * =========================================================
 * UPLOAD
 * =========================================================
 */

function initializeUpload() {

    if (
        typeof initUploadEvents ===
        'function'
    ) {

        initUploadEvents();

    }

}




/**
 * =========================================================
 * HISTÓRICO LOCAL
 * =========================================================
 */

function initializeHistory() {

    if (
        typeof initSiapsHistory ===
        'function'
    ) {

        initSiapsHistory();

    }

}


/**
 * =========================================================
 * NAVEGAÇÃO PRINCIPAL
 * =========================================================
 */

function initializeNavigation() {

    const navigationButtons =
        document.querySelectorAll(
            '.app-nav__item[data-section]'
        );


    navigationButtons.forEach(
        button => {

            button.addEventListener(
                'click',
                () => {

                    const sectionName =
                        button.dataset.section;


                    if (!sectionName) {
                        return;
                    }


                    showSection(
                        sectionName
                    );

                }
            );

        }
    );

}


/**
 * =========================================================
 * BOTÕES INTERNOS
 * =========================================================
 *
 * Exemplo:
 *
 * data-go-section="import"
 */

function initializeInternalNavigation() {

    document.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '[data-go-section]'
                );


            if (!button) {
                return;
            }


            const destination =
                button.dataset.goSection;


            if (!destination) {
                return;
            }


            showSection(
                destination
            );

        }
    );

}


/**
 * =========================================================
 * ABRIR SEÇÃO
 * =========================================================
 */

function showSection(
    sectionName
) {

    if (!sectionName) {
        return;
    }


    /**
     * Procura a seção pelo data-page.
     *
     * Isso permite adicionar novas telas
     * sem precisar alterar uma lista fixa.
     */
    const destination =
        document.querySelector(
            `.app-section[data-page="${sectionName}"]`
        );


    if (!destination) {

        console.error(
            `Seção "${sectionName}" não encontrada.`
        );

        return;

    }


    /**
     * -----------------------------------------------------
     * ESCONDE TODAS AS SEÇÕES
     * -----------------------------------------------------
     */

    document
        .querySelectorAll(
            '.app-section'
        )
        .forEach(
            section => {

                section.classList.remove(
                    'is-active'
                );

                section.style.display =
                    'none';

            }
        );


    /**
     * -----------------------------------------------------
     * EXIBE DESTINO
     * -----------------------------------------------------
     */

    destination.classList.add(
        'is-active'
    );


    destination.style.display =
        'block';


    /**
     * -----------------------------------------------------
     * ATUALIZA MENU
     * -----------------------------------------------------
     */

    document
        .querySelectorAll(
            '.app-nav__item[data-section]'
        )
        .forEach(
            button => {

                const isCurrent =
                    button.dataset.section ===
                    sectionName;


                button.classList.toggle(
                    'is-active',
                    isCurrent
                );


                if (isCurrent) {

                    button.setAttribute(
                        'aria-current',
                        'page'
                    );

                } else {

                    button.removeAttribute(
                        'aria-current'
                    );

                }

            }
        );


    /**
     * -----------------------------------------------------
     * EXECUTA A LÓGICA DA PÁGINA
     * -----------------------------------------------------
     */

    handleSectionOpen(
        sectionName
    );


    /**
     * Volta para o topo da área.
     */
    window.scrollTo({
        top: 0,
        behavior: 'instant'
    });

}


/**
 * =========================================================
 * AÇÕES AO ABRIR CADA TELA
 * =========================================================
 */

function handleSectionOpen(
    sectionName
) {

    switch (
    sectionName
    ) {

        /**
         * IMPORTAÇÃO
         */
        case 'import':

            if (
                typeof renderSavedImports ===
                'function'
            ) {

                renderSavedImports();

            }

            break;


        /**
         * VISÃO GERAL
         */
        case 'dashboard':

            if (
                window._siapsLoaded &&
                typeof renderDashboard ===
                'function'
            ) {

                renderDashboard();

            }

            updateDashboardVisibility();

            break;


        /**
         * PAINEL BI
         */
        case 'bi':

            if (
                typeof renderBI ===
                'function'
            ) {

                renderBI();

            } else {

                console.error(
                    'renderBI() não foi encontrada. Verifique se scripts/bi.js está carregado.'
                );

            }

            break;


        /**
         * EQUIPES
         */
        case 'teams':

            if (
                typeof renderTeams ===
                'function'
            ) {

                renderTeams();

            }

            break;


        /**
         * BOAS PRÁTICAS
         */
        case 'practices':

            if (
                typeof renderPractices ===
                'function'
            ) {

                renderPractices();

            }

            break;


        /**
         * CHECKLIST ASSISTENCIAL
         */
        case 'checklist':

            if (
                typeof renderChecklist ===
                'function'
            ) {

                renderChecklist();

            }

            break;


        /**
         * RELATÓRIOS
         */
        case 'reports':

            if (typeof refreshReportExportSources === 'function') {
                refreshReportExportSources();
            }

            break;

    }

}


/**
 * =========================================================
 * ESTADO DA VISÃO GERAL
 * =========================================================
 */

function updateDashboardVisibility() {

    const emptyState =
        document.getElementById(
            'dashboardEmptyState'
        );


    const loadedState =
        document.getElementById(
            'dashboardLoaded'
        );


    if (
        window._siapsLoaded
    ) {

        if (emptyState) {

            emptyState.style.display =
                'none';

        }


        if (loadedState) {

            loadedState.style.display =
                'block';

        }


        return;

    }


    if (emptyState) {

        emptyState.style.display =
            'block';

    }


    if (loadedState) {

        loadedState.style.display =
            'none';

    }

}


/**
 * =========================================================
 * ATUALIZA TODAS AS TELAS COM DADOS
 * =========================================================
 *
 * Pode ser utilizado após uma nova importação.
 */

function refreshApplicationData() {

    if (
        !window._siapsLoaded
    ) {
        return;
    }


    if (
        typeof renderDashboard ===
        'function'
    ) {

        renderDashboard();

    }


    if (
        typeof renderTeams ===
        'function'
    ) {

        renderTeams();

    }


    if (
        typeof renderPractices ===
        'function'
    ) {

        renderPractices();

    }


    if (
        typeof renderBI ===
        'function'
    ) {

        renderBI();

    }


    if (
        typeof renderChecklist ===
        'function' &&
        document.querySelector(
            '.app-section[data-page="checklist"].is-active'
        )
    ) {

        renderChecklist();

    }

}

/**
 * =========================================================
 * PROTEÇÃO CONTRA PERDA ACIDENTAL DA BASE
 * =========================================================
 *
 * Os dados ficam somente em memória. Ao fechar ou atualizar a
 * página, a planilha precisará ser importada novamente.
 */
window.addEventListener(
    'beforeunload',
    event => {

        if (
            !window._siapsLoaded
        ) {
            return;
        }


        event.preventDefault();

        event.returnValue = '';

    }
);
