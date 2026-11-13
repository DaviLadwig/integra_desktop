/**
 * =========================================================
 * UPLOAD.JS
 * =========================================================
 *
 * Responsável por:
 * - seleção do arquivo XLSX;
 * - drag and drop;
 * - validação básica;
 * - leitura do arquivo;
 * - envio do Workbook para parser.js.
 */


/**
 * =========================================================
 * INICIALIZAÇÃO
 * =========================================================
 */

function initUploadEvents() {

    const dropZone =
        document.getElementById('dropZone');

    const fileInput =
        document.getElementById('fileInput');

    const btnSelectFile =
        document.getElementById('btnSelectFile');


    if (!fileInput) {

        console.error(
            'Campo #fileInput não encontrado.'
        );

        return;
    }


    /**
     * Evita registrar os mesmos eventos duas vezes.
     */
    if (fileInput.dataset.initialized === '1') {
        return;
    }

    fileInput.dataset.initialized = '1';


    /**
     * =====================================================
     * BOTÃO SELECIONAR ARQUIVO
     * =====================================================
     */

    if (btnSelectFile) {

        btnSelectFile.addEventListener(
            'click',
            event => {

                event.preventDefault();
                event.stopPropagation();


                /**
                 * Permite selecionar novamente
                 * o mesmo arquivo.
                 */
                fileInput.value = '';

                fileInput.click();

            }
        );

    }


    /**
     * =====================================================
     * DROPZONE
     * =====================================================
     */

    if (dropZone) {

        /**
         * Clique na área.
         */
        dropZone.addEventListener(
            'click',
            event => {

                /**
                 * Caso o botão esteja dentro da dropzone,
                 * evita disparar duas vezes.
                 */
                if (
                    event.target.closest(
                        '#btnSelectFile'
                    )
                ) {
                    return;
                }


                fileInput.value = '';
                fileInput.click();

            }
        );


        /**
         * Teclado.
         */
        dropZone.addEventListener(
            'keydown',
            event => {

                if (
                    event.key !== 'Enter' &&
                    event.key !== ' '
                ) {
                    return;
                }


                event.preventDefault();

                fileInput.value = '';
                fileInput.click();

            }
        );


        /**
         * Arquivo sobre a área.
         */
        dropZone.addEventListener(
            'dragover',
            event => {

                event.preventDefault();

                dropZone.classList.add('drag');

            }
        );


        /**
         * Saiu da área.
         */
        dropZone.addEventListener(
            'dragleave',
            event => {

                event.preventDefault();

                dropZone.classList.remove('drag');

            }
        );


        /**
         * Soltou o arquivo.
         */
        dropZone.addEventListener(
            'drop',
            event => {

                event.preventDefault();

                dropZone.classList.remove('drag');


                const files =
                    event.dataTransfer.files;


                if (
                    !files ||
                    files.length === 0
                ) {
                    return;
                }


                handleFile(
                    files[0]
                );

            }
        );

    }


    /**
     * =====================================================
     * INPUT FILE
     * =====================================================
     */

    fileInput.addEventListener(
        'change',
        event => {

            const files =
                event.target.files;


            if (
                !files ||
                files.length === 0
            ) {

                console.warn(
                    'Nenhum arquivo foi selecionado.'
                );

                return;
            }


            const file =
                files[0];


            console.log(
                'Arquivo selecionado:',
                file.name
            );


            handleFile(file);

        }
    );

}


/**
 * =========================================================
 * PROCESSAMENTO DO ARQUIVO
 * =========================================================
 */

async function handleFile(file) {

    if (!file) {
        return;
    }


    console.log(
        'Iniciando processamento:',
        {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        }
    );


    /**
     * =====================================================
     * VALIDAÇÃO DO NOME
     * =====================================================
     */

    const fileName =
        String(file.name || '');


    const extension =
        fileName
            .split('.')
            .pop()
            .toLowerCase();


    if (extension !== 'xlsx') {

        showSelectedFile(
            fileName
        );


        setUploadStatus(
            'error',
            'Selecione uma planilha no formato XLSX.'
        );


        return;

    }


    /**
     * =====================================================
     * ARQUIVO VAZIO
     * =====================================================
     */

    if (
        !file.size ||
        file.size <= 0
    ) {

        showSelectedFile(
            fileName
        );


        setUploadStatus(
            'error',
            'O arquivo selecionado está vazio.'
        );


        return;

    }


    /**
     * Mostra o arquivo imediatamente.
     */
    showSelectedFile(
        fileName
    );


    window._siapsSource = {
        name: fileName,
        size: Number(file.size || 0),
        lastModified: Number(file.lastModified || 0),
        importedAt: new Date().toISOString()
    };


    setUploadStatus(
        'loading',
        'Lendo a planilha...'
    );


    try {

        /**
         * =================================================
         * CONFERE A BIBLIOTECA XLSX
         * =================================================
         */

        if (
            typeof XLSX === 'undefined'
        ) {

            throw new Error(
                'A biblioteca XLSX não foi carregada.'
            );

        }


        console.log(
            'SheetJS:',
            XLSX.version
        );


        /**
         * =================================================
         * LEITURA MODERNA DO ARQUIVO
         * =================================================
         *
         * Não utilizamos mais FileReader.
         */

        const arrayBuffer =
            await file.arrayBuffer();


        if (
            !arrayBuffer ||
            arrayBuffer.byteLength === 0
        ) {

            throw new Error(
                'Não foi possível obter o conteúdo da planilha.'
            );

        }


        console.log(
            'Arquivo lido. Bytes:',
            arrayBuffer.byteLength
        );


        /**
         * =================================================
         * CONVERTE EM WORKBOOK
         * =================================================
         */

        const workbook =
            XLSX.read(
                arrayBuffer,
                {
                    type: 'array',
                    cellDates: false
                }
            );


        if (
            !workbook ||
            !Array.isArray(
                workbook.SheetNames
            )
        ) {

            throw new Error(
                'O arquivo não contém uma estrutura Excel válida.'
            );

        }


        console.log(
            'Workbook carregado:',
            workbook.SheetNames
        );


        console.log(
            'Quantidade de abas:',
            workbook.SheetNames.length
        );


        /**
         * =================================================
         * CONFERE PARSER
         * =================================================
         */

        if (
            typeof processWorkbook !==
            'function'
        ) {

            throw new Error(
                'A função processWorkbook() não está disponível.'
            );

        }


        /**
         * =================================================
         * ENVIA PARA PARSER.JS
         * =================================================
         */

        const processResult =
            processWorkbook(
                workbook
            );


        if (
            processResult?.ok &&
            typeof persistProcessedImport === 'function'
        ) {

            try {
                await persistProcessedImport({
                    file,
                    arrayBuffer,
                    processResult
                });
            } catch (historyError) {
                console.error(
                    'A planilha foi processada, mas não pôde ser salva no histórico local:',
                    historyError
                );

                if (typeof setHistoryNotice === 'function') {
                    setHistoryNotice(
                        'error',
                        'A base foi carregada, mas não pôde ser salva no histórico local.'
                    );
                }
            }

        }


    } catch (error) {

        console.error(
            'Erro ao processar a planilha:',
            error
        );


        setUploadStatus(
            'error',
            `
                Não foi possível processar a planilha.

                <div class="up-status__detail">
                    ${escapeUploadText(
                error.message ||
                'Erro desconhecido.'
            )}
                </div>
            `
        );

    }

}


/**
 * =========================================================
 * NOME DO ARQUIVO
 * =========================================================
 */

function showSelectedFile(fileName) {

    const element =
        document.getElementById(
            'upFname'
        );


    if (!element) {

        console.warn(
            '#upFname não encontrado.'
        );

        return;
    }


    element.textContent =
        fileName;


    element.classList.add(
        'show'
    );

}


/**
 * =========================================================
 * STATUS
 * =========================================================
 */

function setUploadStatus(
    type,
    message
) {

    const status =
        document.getElementById(
            'upStatus'
        );


    if (!status) {

        console.warn(
            '#upStatus não encontrado.'
        );

        return;
    }


    status.className =
        `up-status show ${type}`;


    status.innerHTML =
        message;

}


/**
 * =========================================================
 * LIMPA STATUS
 * =========================================================
 */

function clearUploadStatus() {

    const status =
        document.getElementById(
            'upStatus'
        );


    if (!status) {
        return;
    }


    status.className =
        'up-status';


    status.innerHTML = '';

}


/**
 * =========================================================
 * LIMPA ARQUIVO SELECIONADO
 * =========================================================
 */

function clearSelectedFile() {

    const input =
        document.getElementById(
            'fileInput'
        );


    const fileName =
        document.getElementById(
            'upFname'
        );


    if (input) {
        input.value = '';
    }


    if (fileName) {

        fileName.textContent = '';

        fileName.classList.remove(
            'show'
        );

    }

}


/**
 * =========================================================
 * ATUALIZAR BASE
 * =========================================================
 */

function atualizarPlanilha() {

    if (
        typeof showSection ===
        'function'
    ) {

        showSection(
            'import'
        );

    }


    /**
     * Importante:
     *
     * não apagamos os dados existentes
     * apenas porque o usuário quer selecionar
     * uma nova planilha.
     */

    clearSelectedFile();

    clearUploadStatus();

}


/**
 * =========================================================
 * LIMPAR BASE
 * =========================================================
 */

/**
 * =========================================================
 * LIMPEZA INTERNA DOS DADOS
 * =========================================================
 *
 * Limpa todos os dados carregados sem pedir confirmação.
 * Utilizado pelo logout e pelo botão "Limpar dados".
 */
function resetSiapsData(options = {}) {

    const navigateToImport =
        options.navigateToImport !== false;

    const clearMessages =
        options.clearMessages !== false;


    D = {};
    L = {};
    GC = {};
    GL = {};


    window._siapsLoaded = false;
    window._siapsDiag = null;
    window._siapsSource = null;
    window._siapsPortalMeta = null;
    window._siapsPortalDetails = null;
    window._siapsAvailableCategories = null;
    window._siapsPartialImport = false;
    window._siapsActiveHistoryIds = [];
    window._siapsHistoryMode = false;
    window._siapsHistoryPeriodLabel = '';


    sINE = 'all';
    aC = null;
    aM = 'gp';
    aGP = null;


    const dashboardContent =
        document.getElementById('mc');

    if (dashboardContent) {
        dashboardContent.innerHTML = '';
    }


    const teamsContent =
        document.getElementById('teamsContent');

    if (teamsContent) {
        teamsContent.innerHTML = '';
    }


    const practicesContent =
        document.getElementById('practicesContent');

    if (practicesContent) {
        practicesContent.innerHTML = '';
    }


    const biContent =
        document.getElementById('biContent');

    if (biContent) {
        biContent.innerHTML = '';
    }


    if (
        typeof clearSelectedFile ===
        'function'
    ) {
        clearSelectedFile();
    }


    if (
        clearMessages &&
        typeof clearUploadStatus ===
        'function'
    ) {
        clearUploadStatus();
    }


    if (
        typeof updateEmptyDatabaseState ===
        'function'
    ) {
        updateEmptyDatabaseState();
    }


    if (
        navigateToImport &&
        typeof showSection ===
        'function'
    ) {
        showSection('import');
    }

}


function limparPlanilha() {

    const confirmed =
        confirm(
            'Deseja remover os dados atualmente carregados?'
        );


    if (!confirmed) {
        return;
    }


    resetSiapsData({
        navigateToImport: true,
        clearMessages: true
    });

}


/**
 * =========================================================
 * ESTADO SEM BASE
 * =========================================================
 */

function updateEmptyDatabaseState() {

    const title =
        document.getElementById(
            'dataSourceTitle'
        );


    const description =
        document.getElementById(
            'dataSourceDescription'
        );


    const status =
        document.getElementById(
            'dataSourceStatus'
        );


    if (title) {

        title.textContent =
            'Nenhuma planilha carregada';

    }


    if (description) {

        description.textContent =
            'Você pode continuar navegando pelo sistema sem realizar a importação.';

    }


    if (status) {

        status.classList.remove(
            'is-loaded'
        );

    }


    const dashboardEmpty =
        document.getElementById(
            'dashboardEmptyState'
        );


    const dashboardLoaded =
        document.getElementById(
            'dashboardLoaded'
        );


    if (dashboardEmpty) {

        dashboardEmpty.style.display =
            'flex';

    }


    if (dashboardLoaded) {

        dashboardLoaded.style.display =
            'none';

    }

}


/**
 * =========================================================
 * ESCAPE
 * =========================================================
 */

function escapeUploadText(value) {

    return String(
        value ?? ''
    )
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

}
