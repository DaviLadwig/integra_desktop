// Confirma que a preparação altera somente versões e preserva a chave pública.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const original = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'integra-version-test-'));

try {
    fs.mkdirSync(path.join(temporary, 'src-tauri'), { recursive: true });
    fs.mkdirSync(path.join(temporary, 'scripts'), { recursive: true });

    for (const relative of [
        'package.json',
        'src-tauri/Cargo.toml',
        'src-tauri/tauri.conf.json',
        'scripts/preparar-atualizacao-1.0.4.cjs'
    ]) {
        fs.copyFileSync(path.join(original, relative), path.join(temporary, relative));
    }

    // O teste da migração antiga usa uma fixture 1.0.4, mesmo quando o
    // projeto principal já estiver na versão 1.0.5 ou posterior.
    const packageFile = path.join(temporary, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    pkg.version = '1.0.4';
    fs.writeFileSync(packageFile, `${JSON.stringify(pkg, null, 2)}\n`);

    const cargoFile = path.join(temporary, 'src-tauri/Cargo.toml');
    fs.writeFileSync(cargoFile, fs.readFileSync(cargoFile, 'utf8')
        .replace(/^version\s*=\s*"[^"]+"/m, 'version = "1.0.4"'));

    const configFile = path.join(temporary, 'src-tauri/tauri.conf.json');
    const raw = fs.readFileSync(configFile, 'utf8')
        .replace(/("version"\s*:\s*")[^"]+(")/, (_match, prefix, suffix) => `${prefix}1.0.3${suffix}`)
        .replace('__INTEGRA_UPDATER_PUBKEY__', 'PUBLIC_KEY_TEST_ONLY');
    fs.writeFileSync(configFile, raw, 'utf8');

    const lockFile = path.join(temporary, 'package-lock.json');
    fs.writeFileSync(lockFile, JSON.stringify({
        name: 'integra-desktop',
        version: '1.0.3',
        packages: { '': { name: 'integra-desktop', version: '1.0.3' } }
    }, null, 2));

    const command = path.join(temporary, 'scripts/preparar-atualizacao-1.0.4.cjs');
    for (let attempt = 0; attempt < 2; attempt++) {
        const result = spawnSync(process.execPath, [command], { encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
    }

    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    assert.equal(config.version, '1.0.4');
    assert.equal(config.plugins.updater.pubkey, 'PUBLIC_KEY_TEST_ONLY');
    assert.equal(lock.version, '1.0.4');
    assert.equal(lock.packages[''].version, '1.0.4');

    console.log('Versão 1.0.4: atualização idempotente e chave pública preservada.');
} finally {
    fs.rmSync(temporary, { recursive: true, force: true });
}
