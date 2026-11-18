// Verifica a preparação da versão sem usar chaves reais ou alterar o projeto.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'integra-version-test-'));

try {
    fs.mkdirSync(path.join(scratch, 'src-tauri'));
    fs.mkdirSync(path.join(scratch, 'scripts'));

    for (const [from, to] of [
        ['package.json', 'package.json'],
        ['src-tauri/Cargo.toml', 'src-tauri/Cargo.toml'],
        ['scripts/preparar-atualizacao-1.0.5.cjs', 'scripts/preparar-atualizacao-1.0.5.cjs']
    ]) {
        fs.copyFileSync(path.join(root, from), path.join(scratch, to));
    }

    const configPath = path.join(scratch, 'src-tauri/tauri.conf.json');
    const originalConfig = fs.readFileSync(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8');
    const publicKey = 'PUBKEY_FAKE_FOR_TEST_ONLY';
    const preparedConfig = originalConfig
        .replace('"version": "1.0.3"', '"version": "1.0.4"')
        .replace('__INTEGRA_UPDATER_PUBKEY__', publicKey);
    fs.writeFileSync(configPath, preparedConfig);

    const lockPath = path.join(scratch, 'package-lock.json');
    fs.writeFileSync(lockPath, JSON.stringify({
        name: 'integra-desktop', version: '1.0.4',
        packages: { '': { name: 'integra-desktop', version: '1.0.4' } }
    }));

    const script = path.join(scratch, 'scripts/preparar-atualizacao-1.0.5.cjs');
    const run = () => execFileSync(process.execPath, [script], { cwd: scratch, encoding: 'utf8' });
    assert.match(run(), /1\.0\.5 preparado/);
    assert.match(run(), /já está preparado/);

    const packageData = JSON.parse(fs.readFileSync(path.join(scratch, 'package.json')));
    const config = JSON.parse(fs.readFileSync(configPath));
    const lock = JSON.parse(fs.readFileSync(lockPath));
    const cargo = fs.readFileSync(path.join(scratch, 'src-tauri/Cargo.toml'), 'utf8');
    assert.equal(packageData.version, '1.0.5');
    assert.equal(config.version, '1.0.5');
    assert.equal(config.plugins.updater.pubkey, publicKey);
    assert.match(cargo, /^version\s*=\s*"1\.0\.5"/m);
    assert.equal(lock.version, '1.0.5');
    assert.equal(lock.packages[''].version, '1.0.5');
    assert.equal(config.identifier, JSON.parse(originalConfig).identifier);

    console.log('Publicação 1.0.5: versões alinhadas, chave preservada e repetição segura.');
} finally {
    fs.rmSync(scratch, { recursive: true, force: true });
}
