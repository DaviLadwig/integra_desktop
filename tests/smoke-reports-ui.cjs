// Testa a seleção de bases dos relatórios sem usar dados reais ou Windows.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.children = [];
        this.dataset = {};
        this.handlers = new Map();
        this.value = '';
        this.textContent = '';
        this.disabled = false;
    }

    addEventListener(event, callback) { this.handlers.set(event, callback); }
    appendChild(item) { this.children.push(item); return item; }
    replaceChildren(...items) { this.children = [...items]; }
    get options() { return this.children; }
    focus() { this.focused = true; }
    showModal() { this.open = true; }
    close() { this.open = false; }

    async emit(event) {
        const callback = this.handlers.get(event);
        assert.ok(callback, `Evento ${event} não registrado`);
        await callback({ preventDefault() {} });
    }
}

(async () => {
    const select = new FakeElement('select');
    const status = new FakeElement('p');
    const excel = new FakeElement('button');
    const pdf = new FakeElement('button');
    const print = new FakeElement('button');
    const dialog = new FakeElement('dialog');
    const form = new FakeElement('form');
    const pdfCompetence = new FakeElement('select');
    const pdfScope = new FakeElement('select');
    const pdfNote = new FakeElement('p');
    const pdfConfirm = new FakeElement('button');
    const pdfCancel = new FakeElement('button');
    excel.dataset.reportExport = 'excel';
    pdf.dataset.reportExport = 'pdf';
    print.dataset.reportExport = 'print';

    const elements = {
        reportBaseSelect: select, reportSourceStatus: status,
        reportPdfDialog: dialog, reportPdfForm: form,
        reportPdfCompetenceSelect: pdfCompetence,
        reportPdfScopeSelect: pdfScope,
        reportPdfDialogNote: pdfNote,
        reportPdfConfirm: pdfConfirm,
        reportPdfCancel: pdfCancel
    };
    const notifications = [];
    const calls = { excel: 0, pdf: 0, print: 0, activated: 0, current: 0 };
    let failNextActivation = false;
    const win = { _siapsLoaded: false };

    const sandbox = {
        window: win,
        D: {},
        console,
        Promise,
        document: {
            getElementById: id => elements[id] || null,
            createElement: tag => new FakeElement(tag),
            querySelectorAll: selector => selector === '[data-report-export]'
                ? [excel, pdf, print]
                : []
        },
        historyGetAll: async () => [{
            id: 'hist-1',
            sourceType: 'portal-siaps',
            records: [{ fake: true }],
            competenceKey: '2026-08',
            competenceLabel: 'AGO/26',
            category: 'diabetes',
            teamLabel: '000000'
        }],
        historyCategoryLabel: () => 'Diabetes',
        getMonthlyCompetences: async () => [{
            key: '2026-08', label: 'Agosto/2026',
            categories: new Set(['diabetes']),
            imports: [{ id: 'hist-1', category: 'diabetes' }]
        }],
        baixarRelatorioMensalPDF: async (period, category) => {
            assert.equal(period, '2026-08');
            assert.equal(category, '');
            calls.pdf++;
            return { saved: true };
        },
        baixarRelatorioBaseAtualPDF: async category => {
            assert.equal(category, '');
            calls.current++;
            return { saved: true };
        },
        activateHistoryImports: async (ids, options) => {
            assert.deepEqual(Array.from(ids), ['hist-1']);
            assert.equal(options.navigate, false);
            if (failNextActivation) {
                throw new Error('Falha fictícia no histórico');
            }
            win._siapsLoaded = true;
            win._siapsAvailableCategories = ['diabetes'];
            sandbox.D = { '000000': { ine: '000000', equipe: 'Teste' } };
            calls.activated++;
        },
        exportarExcelAtual: async () => { calls.excel++; },
        baixarRelatorioPDF: async () => { calls.pdf++; },
        imprimirRelatorio: () => { calls.print++; },
        showIntegraToast: (message, variant) => notifications.push({ message, variant })
    };

    const source = fs.readFileSync(
        path.join(__dirname, '..', 'app/assets/scripts/reports-source.js'),
        'utf8'
    );
    vm.runInNewContext(source, sandbox);

    win.initializeReportExports();
    await win.refreshReportExportSources();

    assert.equal(select.value, '');
    assert.equal(select.options.length, 2);

    await excel.emit('click');
    assert.equal(calls.excel, 0);
    assert.equal(notifications.at(-1).variant, 'error');

    // PDFs podem partir de uma competência salva mesmo sem base ativa.
    await pdf.emit('click');
    assert.equal(dialog.open, true);
    assert.equal(pdfScope.value, 'geral');
    await form.emit('submit');
    assert.equal(dialog.open, false);
    assert.equal(calls.pdf, 1);

    select.value = 'hist-1';
    await select.emit('change');
    assert.equal(calls.activated, 1);
    assert.equal(status.dataset.state, 'success');

    await excel.emit('click');
    await pdf.emit('click');
    assert.equal(pdfCompetence.value, '2026-08');
    assert.ok(pdfScope.options.some(option => option.value === 'diabetes'));
    await pdfCancel.emit('click');
    assert.equal(dialog.open, false);

    await pdf.emit('click');
    pdfCompetence.value = '__integra_base_atual__';
    await pdfCompetence.emit('change');
    await form.emit('submit');
    assert.equal(calls.current, 1);
    await print.emit('click');
    assert.deepEqual(calls, { excel: 1, pdf: 1, print: 1, activated: 1, current: 1 });

    await win.refreshReportExportSources();
    assert.equal(select.value, '__integra_base_atual__');
    assert.ok(select.options.some(option => option.textContent.includes('AGO/26')));

    // Uma seleção malsucedida não pode exportar a base anterior por engano.
    failNextActivation = true;
    select.value = 'hist-1';
    await select.emit('change');
    assert.equal(select.value, '');
    await excel.emit('click');
    assert.equal(calls.excel, 1);

    console.log('Relatórios: seleção explícita, bloqueio sem base e ações Excel/PDF testados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
