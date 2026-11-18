/** Teste isolado do consolidador mensal, sem dados reais de pacientes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '../app/assets/scripts/monthly-overview.js'),
    'utf8'
);

const db = [
    {
        id: 'db_2026_11', sourceType: 'portal-siaps', category: 'diabetes',
        indicator: 'DIABETES', competenceKey: '2026-11', competenceLabel: '11/2026',
        teamLabel: '1001', importedAt: '2026-11-10', records: [{ CPF: '11111111111', INE: '1001' }]
    },
    {
        id: 'has_2026_11', sourceType: 'portal-siaps', category: 'hipertenso',
        indicator: 'HIPERTENSAO', competenceKey: '2026-11', competenceLabel: '11/2026',
        teamLabel: '1001', importedAt: '2026-11-11', records: [{ CPF: '11111111111', INE: '1001' }]
    },
    {
        id: 'db_2026_10', sourceType: 'portal-siaps', category: 'diabetes',
        indicator: 'DIABETES', competenceKey: '2026-10', competenceLabel: '10/2026',
        teamLabel: '1001', importedAt: '2026-10-10', records: [{ CPF: '22222222222', INE: '1001' }]
    }
];

const profiles = {
    DIABETES: { category: 'diabetes', targetSheet: 'DiabetesBase' },
    HIPERTENSAO: { category: 'hipertenso', targetSheet: 'HASBASE' }
};

const workbooks = [];
const context = vm.createContext({
    console,
    window: { _siapsLoaded: false },
    document: { getElementById: () => null },
    historyGetAll: async () => db,
    formatHistoryCompetence: key => key,
    normalizeHistoryCompetence: value => value,
    historyCategoryLabel: key => key,
    getPortalIndicatorProfile: indicator => profiles[indicator] || null,
    buildInternalWorkbookFromPortalReport: report => ({
        workbook: {
            Sheets: {
                ESUSBase: { rows: report.records.map(row => ({
                    'CPF/CNS': row.CPF,
                    'INE equipe': row.INE,
                    'Nome equipe': `Equipe ${row.INE}`
                })) },
                [profiles[report.indicador].targetSheet]: { rows: report.records }
            }
        }
    }),
    sheetToObjects: sheet => sheet?.rows || [],
    onlyDigitsStr: value => String(value || '').replace(/\D/g, ''),
    getField: (row, ...keys) => keys.map(key => row[key]).find(Boolean) || '',
    XLSX: {
        utils: {
            book_new: () => ({ SheetNames: [], Sheets: {} }),
            book_append_sheet: (wb, sheet, name) => {
                wb.SheetNames.push(name);
                wb.Sheets[name] = sheet;
            },
            json_to_sheet: rows => ({ rows })
        }
    },
    buildDataFromWorkbook: wb => workbooks.push(wb),
    sINE: 'all', aC: null, aM: 'gp', aGP: null,
    initDashboard: () => {},
    updateLoadedDatabaseState: () => {},
    updateDashboardVisibility: () => {},
    renderBI: () => {}
});

vm.runInContext(source, context);

(async () => {
    const periods = await vm.runInContext('getMonthlyCompetences()', context);
    assert.equal(periods.length, 2);
    assert.equal(periods[0].key, '2026-11');
    assert.equal(periods[0].categories.size, 2);

    const result = await vm.runInContext('activateMonthlyCompetence("2026-11")', context);
    assert.equal(result.uniquePeopleByTeam, 1, 'Pessoa em dois grupos não duplica ESUSBase');
    assert.equal(result.imports, 2);
    assert.deepEqual([...result.categories].sort(), ['diabetes', 'hipertenso']);
    assert.equal(workbooks.length, 1);
    assert.deepEqual(workbooks[0].SheetNames.sort(), ['DiabetesBase', 'ESUSBase', 'HASBASE']);
    assert.equal(workbooks[0].Sheets.DiabetesBase.rows.length, 1);
    assert.equal(workbooks[0].Sheets.HASBASE.rows.length, 1);

    const mixed = vm.runInContext(
        'buildMonthlyCompositeWorkbook', context
    );
    assert.throws(() => mixed([db[0], db[2]]), /misturar.*competências/);

    assert.equal(context.window._siapsPortalMeta.panoramaMensal, true);
    assert.equal(context.window._siapsHistoryPeriodLabel, '2026-11');
    console.log('OK: consolidação por competência, grupos separados e sem duplicidade ESUS.');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
