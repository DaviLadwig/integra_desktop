// Gera relatórios reais com dados fictícios; não acessa dados de pacientes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const XLSX = require('../app/vendor/xlsx.full.min.js');
const captured = [];
const alerts = [];

const CATS = [
    { k: 'sem_domicilio', label: 'Sem domicílio', totalKey: 'sem_domicilio', pendingKey: null },
    { k: 'sem_acompanhamento', label: 'Sem acompanhamento', totalKey: 'sem_acompanhamento', pendingKey: null },
    { k: 'crianca', label: 'Crianças', totalKey: 'crianca_total', pendingKey: 'crianca_nao_acomp' },
    { k: 'gestante', label: 'Gestantes', totalKey: 'gestante_total', pendingKey: 'gestante_nao_acomp' },
    { k: 'diabetes', label: 'Diabéticos', totalKey: 'diabetes_total', pendingKey: 'diabetes_nao_acomp' },
    { k: 'hipertenso', label: 'Hipertensos', totalKey: 'hipertenso_total', pendingKey: 'hipertenso_nao_acomp' },
    { k: 'idoso', label: 'Idosos', totalKey: 'idoso_total', pendingKey: 'idoso_nao_acomp' },
    { k: 'mulher', label: 'Mulheres', totalKey: 'mulher_total', pendingKey: 'mulher_nao_acomp' }
];

const sandbox = {
    window: {
        _siapsLoaded: true,
        _siapsSource: { name: 'Dados fictícios.xlsx' },
        alert: message => alerts.push(message)
    },
    D: {
        123456: {
            ine: '123456',
            equipe: 'Equipe fictícia',
            sem_domicilio: 1,
            sem_acompanhamento: 1,
            crianca_total: 3,
            crianca_nao_acomp: 1,
            gestante_total: 2,
            gestante_nao_acomp: 0,
            diabetes_total: 4,
            diabetes_nao_acomp: 1,
            hipertenso_total: 5,
            hipertenso_nao_acomp: 2,
            idoso_total: 3,
            idoso_nao_acomp: 0,
            mulher_total: 6,
            mulher_nao_acomp: 2
        }
    },
    sINE: 'all',
    CATS,
    PR: { crianca: ['Vacina'], gestante: [], diabetes: [], hipertenso: [], idoso: [], mulher: [] },
    GC: {},
    CONFIG: { municipio: 'Teste' },
    XLSX,
    TextEncoder,
    Uint8Array,
    console,
    document: { getElementById: () => null },
    saveIntegraFile: async settings => {
        captured.push(settings);
        return { saved: true, cancelled: false };
    }
};

vm.createContext(sandbox);
const source = fs.readFileSync(path.join(__dirname, '../app/assets/scripts/export.js'), 'utf8');
vm.runInContext(source, sandbox);

(async () => {
    await sandbox.exportarExcelAtual();
    await sandbox.baixarRelatorioPDF();

    assert.equal(alerts.length, 0, `Erros apresentados: ${alerts.join('; ')}`);
    assert.equal(captured.length, 2);

    const [excel, pdf] = captured;
    assert.equal(excel.extension, 'xlsx');
    assert.ok(Buffer.from(excel.bytes).subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])));
    const workbook = XLSX.read(excel.bytes, { type: 'array' });
    assert.deepEqual(workbook.SheetNames, ['Resumo', 'Equipes', 'Boas_Praticas']);

    assert.equal(pdf.extension, 'pdf');
    assert.ok(Buffer.from(pdf.bytes).toString('latin1').startsWith('%PDF-1.4'));
    console.log('Relatórios: Excel com três abas e PDF gerados com dados fictícios.');
})().catch(error => { console.error(error); process.exitCode = 1; });
