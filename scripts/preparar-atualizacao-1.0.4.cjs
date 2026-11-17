/*
 * Ajusta apenas a versão do Tauri e do lockfile para 1.0.4.
 * Não lê nem grava a chave privada; preserva a chave pública já configurada.
 * Uso: node scripts/preparar-atualizacao-1.0.4.cjs
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'src-tauri', 'tauri.conf.json');
const cargoPath = path.join(projectRoot, 'src-tauri', 'Cargo.toml');
const packagePath = path.join(projectRoot, 'package.json');
const lockPath = path.join(projectRoot, 'package-lock.json');

function ensure(condition, message) {
    if (!condition) throw new Error(message);
}

try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const cargo = fs.readFileSync(cargoPath, 'utf8');
    const configRaw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configRaw);

    ensure(packageData.version === '1.0.4', 'O package.json ainda não é da versão 1.0.4.');
    ensure(/^version\s*=\s*"1\.0\.4"/m.test(cargo), 'O Cargo.toml ainda não é da versão 1.0.4.');
    ensure(/^serde_json\s*=\s*"1"/m.test(cargo), 'A dependência serde_json está ausente.');

    const publicKey = config.plugins?.updater?.pubkey;
    ensure(
        typeof publicKey === 'string' &&
        publicKey.trim().length > 0 &&
        !publicKey.includes('__INTEGRA_UPDATER_PUBKEY__'),
        'A chave pública não está configurada no tauri.conf.json. Nenhum arquivo foi alterado.'
    );

    ensure(
        ['1.0.3', '1.0.4'].includes(config.version),
        `Versão inesperada no tauri.conf.json: ${config.version}. Nenhum arquivo foi alterado.`
    );

    let updatedConfig = configRaw;
    if (config.version === '1.0.3') {
        updatedConfig = configRaw.replace(
            /(\"version\"\s*:\s*\")1\.0\.3(\")/,
            (_match, prefix, suffix) => `${prefix}1.0.4${suffix}`
        );
        ensure(updatedConfig !== configRaw, 'Não foi possível localizar o campo version no Tauri.');
        ensure(JSON.parse(updatedConfig).version === '1.0.4', 'O novo JSON ficou inválido.');
    }

    let lockData = null;
    if (fs.existsSync(lockPath)) {
        lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        ensure(['1.0.3', '1.0.4'].includes(lockData.version), 'Versão inesperada no package-lock.json.');
        if (lockData.packages?.['']) {
            ensure(
                ['1.0.3', '1.0.4'].includes(lockData.packages[''].version),
                'Versão inesperada no package-lock.json (pacote raiz).'
            );
        }
    }

    // Todas as validações acima ocorrem antes das escritas.
    if (updatedConfig !== configRaw) {
        fs.writeFileSync(configPath, updatedConfig, 'utf8');
    }

    if (lockData) {
        lockData.version = '1.0.4';
        if (lockData.packages?.['']) lockData.packages[''].version = '1.0.4';
        fs.writeFileSync(lockPath, `${JSON.stringify(lockData, null, 2)}\n`, 'utf8');
    }

    console.log('OK: Integra 1.0.4 preparado; chave pública mantida sem alteração.');
    if (!lockData) {
        console.log('Aviso: package-lock.json ausente; o workflow utilizará npm install.');
    }
} catch (error) {
    console.error(`Falha na preparação: ${error.message}`);
    process.exitCode = 1;
}
