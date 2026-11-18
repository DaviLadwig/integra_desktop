// PDF geral/individual usando dados fictícios; sem dados pessoais ou Windows.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
    const before = { previous: true };
    const originals = {
        D: { previous: true }, L: { previous: true },
        GC: { previous: true }, GL: { previous: true }
    };
    const exports = [];
    const periods = [{
        key: '2026-08', label: 'Agosto/2026',
        imports: [
            { id: '1', category: 'diabetes' },
            { id: '2', category: 'crianca' }
        ]
    }];

    const context = {
        window: { _siapsDiag: before, _siapsSource: { name: 'Anterior' } },
        D: originals.D, L: originals.L, GC: originals.GC, GL: originals.GL,
        sINE: '123',
        CATS: [
            { k: 'diabetes', label: 'Diabéticos', totalKey: 'diabetes_total', pendingKey: 'diabetes_nao_acomp' },
            { k: 'crianca', label: 'Crianças', totalKey: 'crianca_total', pendingKey: 'crianca_nao_acomp' }
        ],
        PR: { diabetes: ['avaliacao'], crianca: ['avaliacao'] },
        CONFIG: { municipio: 'Teste' },
        getMonthlyCompetences: async () => periods,
        buildMonthlyCompositeWorkbook: imports => ({
            workbook: { categories: imports.map(item => item.category) },
            categories: imports.map(item => item.category)
        }),
        buildDataFromWorkbook(workbook) {
            const hasDiabetes = workbook.categories.includes('diabetes');
            const hasChild = workbook.categories.includes('crianca');
            context.D = {
                '123': {
                    ine: '123', equipe: 'Equipe A',
                    diabetes_total: hasDiabetes ? 20 : 0,
                    diabetes_nao_acomp: hasDiabetes ? 4 : 0,
                    crianca_total: hasChild ? 10 : 0,
                    crianca_nao_acomp: hasChild ? 3 : 0
                }
            };
            context.L = { changed: true };
            context.GC = {
                diabetes: { '123': { avaliacao: [16, 20] } },
                crianca: { '123': { avaliacao: [7, 10] } }
            };
            context.GL = { changed: true };
            context.window._siapsDiag = { changed: true };
        },
        historyCategoryLabel: key => key === 'diabetes' ? 'Diabéticos' : 'Crianças',
        saveIntegraFile: async file => { exports.push(file); return { saved: true }; },
        TextEncoder, Date, console,
        document: { getElementById: () => null }
    };

    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app/assets/scripts/export.js'), 'utf8'), context);

    const geral = await context.buildMonthlyReportModel('2026-08');
    assert.equal(geral.monthlyReport.groupCount, 2);
    assert.equal(geral.summary.monitoredTotal, 30);
    assert.equal(geral.categories.length, 2);
    assert.equal(geral.summary.monitoredCoverage, 77);
    assert.equal(context.D, originals.D);
    assert.equal(context.L, originals.L);
    assert.equal(context.GC, originals.GC);
    assert.equal(context.GL, originals.GL);
    assert.equal(context.sINE, '123');
    assert.equal(context.window._siapsDiag, before);

    const individual = await context.buildMonthlyReportModel('2026-08', 'diabetes');
    assert.equal(individual.monthlyReport.groupCount, 1);
    assert.equal(individual.categories.length, 1);
    assert.equal(individual.summary.monitoredTotal, 20);
    assert.equal(individual.summary.monitoredCoverage, 80);

    await context.baixarRelatorioMensalPDF('2026-08');
    await context.baixarRelatorioMensalPDF('2026-08', 'diabetes');
    assert.equal(exports.length, 2);
    assert.equal(exports[0].fileName, 'Integra_Indicadores_geral_2026-08.pdf');
    assert.equal(exports[1].fileName, 'Integra_Indicadores_diabetes_2026-08.pdf');
    for (const file of exports) {
        assert.equal(file.mimeType, 'application/pdf');
        assert.equal(Buffer.from(file.bytes).subarray(0, 8).toString('ascii'), '%PDF-1.4');
    }
    fs.writeFileSync('/tmp/integra-mensal-geral-validacao.pdf', exports[0].bytes);
    fs.writeFileSync('/tmp/integra-mensal-individual-validacao.pdf', exports[1].bytes);
    assert.equal(context.D, originals.D);

    // Bases antigas abertas diretamente continuam aptas a gerar PDF por grupo.
    context.window._siapsLoaded = true;
    context.window._siapsAvailableCategories = ['diabetes'];
    context.sINE = 'all';
    context.D = {
        '123': { ine: '123', equipe: 'Equipe A', diabetes_total: 9, diabetes_nao_acomp: 2 }
    };
    context.GC = { diabetes: { '123': { avaliacao: [7, 9] } } };
    await context.baixarRelatorioBaseAtualPDF('diabetes');
    assert.equal(exports.length, 3);
    assert.equal(exports[2].fileName, 'Integra_Indicadores_diabetes_base_atual.pdf');

    await assert.rejects(context.buildMonthlyReportModel('2026-09'), /não foi encontrada/);
    await assert.rejects(context.buildMonthlyReportModel('2026-08', 'gestante'), /Não existem planilhas/);

    console.log('Relatórios mensais: geral/individual, nomes, PDF e preservação do estado OK.');
})().catch(error => { console.error(error); process.exitCode = 1; });
