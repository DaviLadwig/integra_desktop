// Teste de contrato da exportação; não acessa dados reais nem Windows.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fakeElement(tag = 'div') {
    return {
        tag, children: [], style: {}, isConnected: true,
        setAttribute() {}, addEventListener() {},
        append(...items) { this.children.push(...items); },
        appendChild(item) { this.children.push(item); return item; },
        remove() { this.isConnected = false; },
        click() { this.clicked = true; },
        get firstElementChild() { return this.children[0]; },
        get childElementCount() { return this.children.length; },
    };
}

(async () => {
    const body = fakeElement('body');
    let lastInvocation;
    let mustCancel = false;
    const win = {
        setTimeout() {},
        __TAURI__: { core: { invoke: async (command, payload) => {
            lastInvocation = { command, payload };
            return mustCancel ? null : 'C:\\Downloads\\relatorio.pdf';
        } } },
    };
    const sandbox = {
        window: win,
        document: { body, getElementById: () => null, createElement: fakeElement },
        Blob, Uint8Array, ArrayBuffer, TextEncoder, URL,
        console,
    };

    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'assets', 'scripts', 'file-export.js'), 'utf8');
    vm.runInNewContext(source, sandbox);
    const bytes = new TextEncoder().encode('%PDF-1.4');

    const result = await win.saveIntegraFile({ extension: 'pdf', fileName: 'relatorio.pdf', bytes });
    assert.equal(result.saved, true);
    assert.equal(lastInvocation.command, 'save_integra_export');
    assert.equal(lastInvocation.payload.bytes[0], 37);
    assert.equal(lastInvocation.payload.fileName, 'relatorio.pdf');

    const workbookBytes = new Uint8Array([80, 75, 3, 4]).buffer;
    const excel = await win.saveIntegraFile({ extension: 'xlsx', fileName: 'resumo.xlsx', bytes: workbookBytes });
    assert.equal(excel.saved, true);
    assert.equal(lastInvocation.payload.bytes[0], 80);
    assert.equal(lastInvocation.payload.bytes[1], 75);
    assert.equal(lastInvocation.payload.fileName, 'resumo.xlsx');

    mustCancel = true;
    const cancelled = await win.saveIntegraFile({ extension: 'pdf', fileName: 'relatorio.pdf', bytes });
    assert.equal(cancelled.cancelled, true);
    assert.equal(cancelled.saved, false);

    await assert.rejects(win.saveIntegraFile({ extension: 'exe', bytes }), /Formato/);
    await assert.rejects(win.saveIntegraFile({ extension: 'pdf', bytes: [] }), /vazio/);

    console.log('Exportação: PDF, ArrayBuffer XLSX, chamada nativa, cancelamento e extensões validados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
