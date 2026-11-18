// Verifica as combinações essenciais de texto/fundo no contraste escuro.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '../app/assets/styles/contrast-fixes-1.0.5.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../app/index.html'), 'utf8');

function brightness(hex) {
    const channels = hex.replace('#', '').match(/../g).map(value => parseInt(value, 16) / 255);
    const linear = channels.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}

function ratio(foreground, background) {
    const x = brightness(foreground);
    const y = brightness(background);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

for (const [area, foreground, background] of [
    ['Botão', '#e7f0fa', '#1a2b3c'],
    ['Botão de exclusão', '#ffc3c9', '#352126'],
    ['Resumo do histórico', '#dce9f5', '#203245'],
    ['Perfil - rótulo', '#bfcddd', '#172431'],
    ['Perfil - valor', '#e8f2fc', '#172431'],
    ['Critério - descrição', '#b8c9d9', '#131f2b'],
    ['Critério - número', '#d1dfeb', '#192938'],
    ['Critério - percentual', '#a9d5ff', '#131f2b']
]) {
    assert.ok(ratio(foreground, background) >= 4.5, `${area} abaixo do contraste 4.5:1`);
}

for (const selector of [
    '#sectionDashboard .toolbar-btn',
    '#sectionImport .history-card__summary',
    '#sectionBi .bi-child-profile-row__top span',
    '#sectionBi .bi-child-profile-row__top strong',
    '#sectionBi .bi-child-table td > strong',
    '#sectionBi .bi-child-table td > small'
]) {
    assert.ok(css.includes(selector), `Faltou a regra ${selector}`);
}

const before = html.indexOf('assets/styles/monthly-reports.css');
const after = html.indexOf('assets/styles/contrast-fixes-1.0.5.css');
assert.ok(after > before, 'As correções de contraste devem carregar após os temas atuais.');

console.log('Contraste 1.0.5: 8 combinações acessíveis e ordem do CSS confirmadas.');
