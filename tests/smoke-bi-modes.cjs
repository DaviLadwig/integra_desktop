/** Valida a seleção consolidada/individual do BI, sem DOM real ou dados pessoais. */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const script = fs.readFileSync(path.join(__dirname, '../app/assets/scripts/bi.js'), 'utf8');
const content = { innerHTML: '' };
const context = vm.createContext({
    console,
    window: {
        _siapsLoaded: true,
        _siapsPartialImport: true,
        _siapsAvailableCategories: ['diabetes', 'hipertenso'],
        _siapsPortalDetails: null
    },
    document: {
        getElementById: id => id === 'biContent' ? content : null,
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {}
    },
    D: {
        1001: {
            ine: '1001', equipe: 'Equipe Teste',
            diabetes_total: 4, diabetes_nao_acomp: 1,
            hipertenso_total: 3, hipertenso_nao_acomp: 2,
            sem_domicilio: 0, sem_acompanhamento: 0
        }
    },
    PR: {
        diabetes: ['Consulta', 'Aferição Pressão'],
        hipertenso: ['Consulta']
    },
    GC: {
        diabetes: { 1001: { total: 4, Consulta: 1, 'Aferição Pressão': 2 } },
        hipertenso: { 1001: { total: 3, Consulta: 1 } }
    },
    sINE: 'all',
    formatNumber: value => String(value)
});

vm.runInContext(script, context);
vm.runInContext('renderBI()', context);
assert.match(content.innerHTML, /Painel executivo/);
assert.match(content.innerHTML, /Distribuição por grupo/);
assert.match(content.innerHTML, /biViewModeSelect/);
assert.match(content.innerHTML, /biMonthlyCompetenceSelect/);

vm.runInContext('biViewMode = "individual"; biSelectedCategory = "diabetes"; renderBI()', context);
assert.match(content.innerHTML, /BI · Diabéticos/);
assert.match(content.innerHTML, /Pessoas no grupo/);
assert.match(content.innerHTML, /Distribuição por equipe/);
assert.match(content.innerHTML, /Cumprimento por prática/);
assert.match(content.innerHTML, /Aferição Pressão/);
assert.match(content.innerHTML, /biSelectedCategorySelect/);

const stats = vm.runInContext('getBIIndividualPracticeStats("diabetes", ["1001"])', context);
assert.equal(stats.length, 2);
assert.equal(stats[0].percentage, 75);
assert.equal(stats[1].percentage, 50);
console.log('OK: modos consolidado e individual do BI, filtros e práticas.');
