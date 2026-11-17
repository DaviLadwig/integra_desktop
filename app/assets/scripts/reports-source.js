/* =========================================================
 * INTEGRA — BASE LOCAL E AÇÕES DA TELA RELATÓRIOS
 * =========================================================
 * O checklist consulta o histórico diretamente. Relatórios exige
 * uma base ativa no painel: esta camada permite escolher uma base
 * histórica explicitamente, sem rede e sem misturar competências.
 */
(function () {
    'use strict';

    const CURRENT_BASE = '__integra_base_atual__';
    let initialized = false;
    let selecting = false;
    let refreshTicket = 0;

    function hasLoadedReportData() {
        return Boolean(
            window._siapsLoaded &&
            typeof D !== 'undefined' &&
            D &&
            Object.keys(D).length > 0
        );
    }

    function reportStatus(message, state = 'info') {
        const status = document.getElementById('reportSourceStatus');
        if (!status) return;
        status.textContent = message;
        status.dataset.state = state;
    }

    function reportNotice(message) {
        if (typeof showIntegraToast === 'function') {
            showIntegraToast(message, 'error');
        } else {
            window.alert(message);
        }
    }

    function addOption(select, value, label) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
    }

    function sourceLabel(record) {
        const competence = String(record.competenceLabel || record.competenceKey || 'Sem competência');
        const category = typeof historyCategoryLabel === 'function'
            ? historyCategoryLabel(record.category)
            : String(record.category || 'SIAPS');
        const team = record.teamLabel ? ` · Equipe ${record.teamLabel}` : '';
        return `${competence} · ${category}${team}`.slice(0, 150);
    }

    /** Atualiza as opções ao entrar em Relatórios ou após carregar outra base. */
    async function refreshReportExportSources() {
        const select = document.getElementById('reportBaseSelect');
        if (!select || selecting) return;

        const ticket = ++refreshTicket;
        const loaded = hasLoadedReportData();

        try {
            const all = typeof historyGetAll === 'function'
                ? await historyGetAll()
                : [];

            if (ticket !== refreshTicket || selecting) return;

            const imports = all.filter(item =>
                item &&
                item.sourceType === 'portal-siaps' &&
                Array.isArray(item.records) &&
                item.records.length > 0
            ).sort((a, b) =>
                String(b.competenceKey || '').localeCompare(String(a.competenceKey || '')) ||
                String(b.importedAt || '').localeCompare(String(a.importedAt || ''))
            );

            select.replaceChildren();
            addOption(select, '', 'Selecione uma base salva...');

            if (loaded) {
                const source = String(window._siapsSource?.name || 'Painel').slice(0, 100);
                addOption(select, CURRENT_BASE, `Usar base já carregada · ${source}`);
            }

            imports.forEach(item => addOption(select, String(item.id), sourceLabel(item)));
            select.value = loaded ? CURRENT_BASE : '';

            if (loaded) {
                reportStatus('Base carregada. Você já pode exportar Excel ou PDF.', 'success');
            } else if (imports.length) {
                reportStatus('Escolha uma base salva para gerar os relatórios.', 'info');
            } else {
                reportStatus('Nenhuma base ativa. Importe uma planilha SIAPS antes de exportar.', 'error');
            }
        } catch (error) {
            if (ticket !== refreshTicket) return;
            console.error('Não foi possível consultar as bases dos relatórios:', error);
            select.replaceChildren();
            addOption(select, loaded ? CURRENT_BASE : '', loaded
                ? 'Usar base já carregada no painel'
                : 'Histórico local indisponível');
            reportStatus(loaded
                ? 'Base ativa disponível; não foi possível listar o histórico local.'
                : 'Não foi possível consultar as bases locais. Verifique o histórico.',
            loaded ? 'info' : 'error');
        }
    }

    /** Só altera a base ativa mediante escolha do usuário. */
    async function selectReportHistoryBase() {
        const select = document.getElementById('reportBaseSelect');
        if (!select || selecting) return;

        const id = select.value;
        if (!id || id === CURRENT_BASE) {
            reportStatus(hasLoadedReportData()
                ? 'Base carregada. Você já pode exportar Excel ou PDF.'
                : 'Escolha uma base salva antes de exportar.',
            hasLoadedReportData() ? 'success' : 'info');
            return;
        }

        if (typeof activateHistoryImports !== 'function') {
            reportNotice('Não foi possível carregar a base selecionada.');
            return;
        }

        selecting = true;
        ++refreshTicket;
        select.disabled = true;
        reportStatus('Preparando a base selecionada...', 'info');

        try {
            await activateHistoryImports([id], { navigate: false });
            if (!hasLoadedReportData()) {
                throw new Error('A base selecionada não contém dados válidos para relatórios.');
            }
            reportStatus('Base carregada. Você já pode exportar Excel ou PDF.', 'success');
        } catch (error) {
            console.error('Falha ao carregar base para os relatórios:', error);
            // Não permitir exportação da base anterior sob o nome da base que falhou.
            select.value = '';
            reportStatus('Não foi possível preparar esta base. Selecione outra competência.', 'error');
            reportNotice(error.message || 'Não foi possível carregar a base selecionada.');
        } finally {
            select.disabled = false;
            selecting = false;
        }
    }

    /** Não exporta dados de uma competência antiga se o seletor está vazio. */
    function runReportExport(action) {
        const select = document.getElementById('reportBaseSelect');

        if (selecting) {
            reportNotice('Aguarde o carregamento da base selecionada.');
            return;
        }

        if (!hasLoadedReportData() || !select || !select.value) {
            reportStatus('Selecione uma base válida para gerar os relatórios.', 'error');
            reportNotice('Selecione uma base/competência antes de exportar.');
            select?.focus();
            return;
        }

        try {
            const actions = {
                excel: () => exportarExcelAtual(),
                pdf: () => baixarRelatorioPDF(),
                print: () => imprimirRelatorio()
            };

            if (!Object.prototype.hasOwnProperty.call(actions, action)) return;
            Promise.resolve(actions[action]()).catch(error => {
                console.error('Falha na exportação:', error);
                reportNotice('Não foi possível concluir a exportação deste relatório.');
            });
        } catch (error) {
            console.error('Falha ao iniciar a exportação:', error);
            reportNotice('Não foi possível iniciar a exportação do relatório.');
        }
    }

    function initializeReportExports() {
        if (initialized) return;

        const select = document.getElementById('reportBaseSelect');
        if (!select) return;

        select.addEventListener('change', selectReportHistoryBase);
        document.querySelectorAll('[data-report-export]').forEach(button => {
            button.addEventListener('click', () => runReportExport(button.dataset.reportExport));
        });

        initialized = true;
        refreshReportExportSources();
    }

    window.initializeReportExports = initializeReportExports;
    window.refreshReportExportSources = refreshReportExportSources;
})();
