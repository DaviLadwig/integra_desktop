/*
 * Prepara o Integra 1.0.5 sem modificar identificador nem chave do atualizador.
 * Uso: node scripts/preparar-atualizacao-1.0.5.cjs
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'src-tauri', 'tauri.conf.json');
const cargoPath = path.join(projectRoot, 'src-tauri', 'Cargo.toml');
const packagePath = path.join(projectRoot, 'package.json');
const lockPath = path.join(projectRoot, 'package-lock.json');
const oldVersion = '1.0.4';
const newVersion = '1.0.5';

function ensure(condition, message) {
    if (!condition) throw new Error(message);
}

function changeOnce(raw, expression, replacement, file) {
    const updated = raw.replace(expression, replacement);
    ensure(updated !== raw, `Não foi possível ajustar a versão em ${file}.`);
    return updated;
}

try {
    const packageRaw = fs.readFileSync(packagePath, 'utf8');
    const configRaw = fs.readFileSync(configPath, 'utf8');
    const cargoRaw = fs.readFileSync(cargoPath, 'utf8');

    const packageData = JSON.parse(packageRaw);
    const configData = JSON.parse(configRaw);
    const packageVersion = String(packageData.version || '');
    const cargoVersion = cargoRaw.match(/^version\s*=\s*"([^"]+)"/m)?.[1] || '';

    const versions = [packageVersion, configData.version, cargoVersion];
    if (versions.every(version => version === newVersion)) {
        console.log('Integra 1.0.5 já está preparado. Nenhum arquivo foi modificado.');
        process.exit(0);
    }

    ensure(versions.every(version => version === oldVersion),
        `Versões diferentes do esperado: package=${packageVersion}, Tauri=${configData.version}, Cargo=${cargoVersion}. Alinhe primeiro a 1.0.4.`);

    const publicKey = configData.plugins?.updater?.pubkey;
    ensure(typeof publicKey === 'string' && publicKey.trim().length > 0 &&
        !publicKey.includes('__INTEGRA_UPDATER_PUBKEY__'),
        'Chave pública do atualizador ausente. Execute a preparação no projeto original configurado; não substitua a chave pública.');

    ensure(/^serde_json\s*=\s*"1"/m.test(cargoRaw),
        'A dependência serde_json está ausente do Cargo.toml.');

    // Altera somente a versão, preservando todas as demais configurações.
    const packageNext = changeOnce(packageRaw,
        /("version"\s*:\s*")1\.0\.4(")/,
        (_match, prefix, suffix) => `${prefix}${newVersion}${suffix}`, 'package.json');
    const configNext = changeOnce(configRaw,
        /("version"\s*:\s*")1\.0\.4(")/,
        (_match, prefix, suffix) => `${prefix}${newVersion}${suffix}`, 'src-tauri/tauri.conf.json');
    const cargoNext = changeOnce(cargoRaw,
        /^(version\s*=\s*")1\.0\.4(")/m,
        (_match, prefix, suffix) => `${prefix}${newVersion}${suffix}`, 'src-tauri/Cargo.toml');

    let lockNext = null;
    if (fs.existsSync(lockPath)) {
        const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        ensure(lockData.version === oldVersion &&
            (!lockData.packages?.[''] || lockData.packages[''].version === oldVersion),
            'package-lock.json está com versão diferente de 1.0.4. Nenhum arquivo foi alterado.');
        lockData.version = newVersion;
        if (lockData.packages?.['']) lockData.packages[''].version = newVersion;
        lockNext = `${JSON.stringify(lockData, null, 2)}\n`;
    }

    ensure(JSON.parse(packageNext).version === newVersion &&
        JSON.parse(configNext).version === newVersion &&
        /^version\s*=\s*"1\.0\.5"/m.test(cargoNext),
        'Validação do novo versionamento falhou. Nenhum arquivo foi alterado.');
    ensure(JSON.parse(configNext).plugins.updater.pubkey === publicKey,
        'O script detectou alteração na chave pública. Nenhum arquivo foi alterado.');

    // Somente após verificar todos os arquivos, grava o novo versionamento.
    fs.writeFileSync(packagePath, packageNext, 'utf8');
    fs.writeFileSync(configPath, configNext, 'utf8');
    fs.writeFileSync(cargoPath, cargoNext, 'utf8');
    if (lockNext) fs.writeFileSync(lockPath, lockNext, 'utf8');

    console.log('OK: Integra 1.0.5 preparado; chave pública mantida sem alteração.');
    if (!lockNext) console.log('Aviso: package-lock.json ausente. Execute npm install antes do commit.');
} catch (error) {
    console.error(`Falha na preparação: ${error.message}`);
    process.exitCode = 1;
}
