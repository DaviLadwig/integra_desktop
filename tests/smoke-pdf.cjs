// Confere a estrutura binária gerada pelos dois produtores de PDF offline.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const [name, functionName] of [
    ['export.js', 'buildPdfBinary'],
    ['checklist.js', 'buildChecklistPdfBinary'],
]) {
    const script = fs.readFileSync(path.join(__dirname, '..', 'app', 'assets', 'scripts', name), 'utf8');
    const context = { TextEncoder, window: {}, console };
    vm.createContext(context);
    vm.runInContext(script, context);
    const bytes = context[functionName]([['q', 'Q']]);
    assert(bytes instanceof Uint8Array);
    assert(Buffer.from(bytes).toString('latin1', 0, 8).startsWith('%PDF-1.4'));
    fs.writeFileSync(path.join('/tmp', `integra-smoke-${name}.pdf`), bytes);
    console.log(`${name}: ${bytes.byteLength} bytes de PDF gerados`);
}
