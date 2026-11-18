// Histórico: um cartão por competência com as planilhas dentro de <details>.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
    const container = { innerHTML: '', querySelectorAll: () => [] };
    const summary = { textContent: '' };
    const sandbox = {
        window: { _siapsActiveHistoryIds: ['um'] },
        document: {
            getElementById: id => id === 'savedImportsList' ? container : id === 'savedImportsSummary' ? summary : null,
            querySelectorAll: () => []
        },
        console,
        formatHistoryCompetence: key => key === '2026-08' ? 'Agosto/2026' : 'Setembro/2026',
        historyCategoryLabel: key => key,
        formatNumber: number => String(number),
        escapeBI: value => String(value),
        escapeAttribute: value => String(value)
    };

    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/assets/scripts/storage.js'), 'utf8'), sandbox);
    sandbox.historyGetAll = async () => [
        { id: 'um', competenceKey: '2026-08', sourceType: 'portal-siaps', category: 'diabetes', indicator: 'Diabetes', fileName: 'd.xlsx', rowCount: 5 },
        { id: 'dois', competenceKey: '2026-08', sourceType: 'portal-siaps', category: 'crianca', indicator: 'Crianças', fileName: 'c.xlsx', rowCount: 3 },
        { id: 'tres', competenceKey: '2026-09', sourceType: 'portal-siaps', category: 'diabetes', indicator: 'Diabetes', fileName: 's.xlsx', rowCount: 9 }
    ];
    sandbox.historyPeopleGetAll = async () => [{}, {}];

    await sandbox.renderSavedImports();
    assert.match(summary.textContent, /2 competências · 3 planilhas/);
    assert.equal((container.innerHTML.match(/class="history-month"/g) || []).length, 2);
    assert.equal((container.innerHTML.match(/<article class="history-item(?: is-active)?"/g) || []).length, 3);
    assert.match(container.innerHTML, /AGO\/26/);
    assert.match(container.innerHTML, /SET\/26/);
    assert.match(container.innerHTML, /data-history-period="2026-08"[\s\S]*?2 planilhas · 2 grupos/);
    assert.match(container.innerHTML, /data-history-open="um"/);
    assert.match(container.innerHTML, /data-history-delete="tres"/);

    console.log('Histórico: planilhas agrupadas por mês e ações preservadas.');
})().catch(error => { console.error(error); process.exitCode = 1; });
