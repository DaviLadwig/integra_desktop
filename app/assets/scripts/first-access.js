/**
 * =========================================================
 * PRIMEIRO ACESSO / USUÁRIOS LOCAIS
 * =========================================================
 *
 * Responsável por:
 * - importar arquivos .integra assinados pelo Integra Admin;
 * - validar a assinatura RSA-SHA256;
 * - cadastrar o usuário localmente no IndexedDB;
 * - validar senhas PBKDF2-HMAC-SHA256;
 * - impedir reutilização da mesma credencial nesta instalação;
 * - lembrar somente o nome de usuário quando solicitado.
 */

const INTEGRA_AUTH_DB_NAME = 'integra_auth_local_v1';
const INTEGRA_AUTH_DB_VERSION = 1;
const INTEGRA_AUTH_USERS_STORE = 'users';
const INTEGRA_AUTH_CREDENTIALS_STORE = 'credentials';
const INTEGRA_REMEMBER_USER_KEY = 'integra_remembered_user_v1';

let integraAuthDbPromise = null;

function openIntegraAuthDb() {
    if (integraAuthDbPromise) {
        return integraAuthDbPromise;
    }

    integraAuthDbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('O armazenamento local do navegador não está disponível.'));
            return;
        }

        const request = indexedDB.open(INTEGRA_AUTH_DB_NAME, INTEGRA_AUTH_DB_VERSION);

        request.onupgradeneeded = event => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(INTEGRA_AUTH_USERS_STORE)) {
                const users = db.createObjectStore(INTEGRA_AUTH_USERS_STORE, {
                    keyPath: 'usuario'
                });
                users.createIndex('credentialId', 'credentialId', { unique: true });
            }

            if (!db.objectStoreNames.contains(INTEGRA_AUTH_CREDENTIALS_STORE)) {
                db.createObjectStore(INTEGRA_AUTH_CREDENTIALS_STORE, {
                    keyPath: 'credentialId'
                });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => {
                db.close();
                integraAuthDbPromise = null;
            };
            resolve(db);
        };

        request.onerror = () => {
            integraAuthDbPromise = null;
            reject(request.error || new Error('Não foi possível abrir o banco de autenticação local.'));
        };
    });

    return integraAuthDbPromise;
}

function idbRequestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Falha no armazenamento local.'));
    });
}

function idbTransactionToPromise(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('Falha ao salvar o acesso local.'));
        transaction.onabort = () => reject(transaction.error || new Error('A gravação do acesso foi cancelada.'));
    });
}

async function getImportedAccessUser(username) {
    const normalized = normalizeAccessUsername(username);
    if (!normalized) {
        return null;
    }

    try {
        const db = await openIntegraAuthDb();
        const transaction = db.transaction(INTEGRA_AUTH_USERS_STORE, 'readonly');
        const store = transaction.objectStore(INTEGRA_AUTH_USERS_STORE);
        return await idbRequestToPromise(store.get(normalized)) || null;
    } catch (error) {
        console.error('Erro ao consultar usuário local:', error);
        return null;
    }
}

async function getImportedCredential(credentialId) {
    if (!credentialId) {
        return null;
    }

    const db = await openIntegraAuthDb();
    const transaction = db.transaction(INTEGRA_AUTH_CREDENTIALS_STORE, 'readonly');
    const store = transaction.objectStore(INTEGRA_AUTH_CREDENTIALS_STORE);
    return await idbRequestToPromise(store.get(String(credentialId))) || null;
}

function base64ToBytes(value) {
    const clean = String(value || '').replace(/\s+/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

function bytesToBase64Url(bytes) {
    let binary = '';
    const chunkSize = 0x8000;

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
    }

    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function getRequiredXmlTag(xmlText, tagName) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(String(xmlText || ''), 'application/xml');

    if (xml.querySelector('parsererror')) {
        throw new Error('A chave pública do Integra está inválida.');
    }

    const element = xml.getElementsByTagName(tagName)[0];
    const value = element?.textContent?.trim();

    if (!value) {
        throw new Error(`A chave pública não contém ${tagName}.`);
    }

    return value;
}

async function importIntegraPublicKey() {
    if (!globalThis.crypto?.subtle) {
        throw new Error('A validação segura exige Web Crypto. Use o Integra Desktop ou abra o sistema por localhost.');
    }

    const xmlText = window.INTEGRA_ACCESS_PUBLIC_KEY_XML;

    if (!xmlText) {
        throw new Error('A chave pública oficial não foi incorporada ao aplicativo.');
    }

    const modulus = base64ToBytes(getRequiredXmlTag(xmlText, 'Modulus'));
    const exponent = base64ToBytes(getRequiredXmlTag(xmlText, 'Exponent'));

    const jwk = {
        kty: 'RSA',
        n: bytesToBase64Url(modulus),
        e: bytesToBase64Url(exponent),
        alg: 'RS256',
        ext: true
    };

    return crypto.subtle.importKey(
        'jwk',
        jwk,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256'
        },
        false,
        ['verify']
    );
}

function validateAccessEnvelopeStructure(envelope) {
    if (!envelope || typeof envelope !== 'object') {
        throw new Error('O arquivo selecionado não é uma credencial Integra válida.');
    }

    if (envelope.formato !== 'integra-access-file' || Number(envelope.versao) !== 1) {
        throw new Error('Formato de credencial não reconhecido.');
    }

    if (envelope.algoritmo !== 'RSA-SHA256') {
        throw new Error('Algoritmo de assinatura não suportado.');
    }

    if (!envelope.payload || !envelope.assinatura) {
        throw new Error('A credencial está incompleta.');
    }

    const expectedKeyId = String(window.INTEGRA_ACCESS_PUBLIC_KEY_ID || '');
    if (expectedKeyId && String(envelope.keyId || '') !== expectedKeyId) {
        throw new Error('Este arquivo foi emitido por outra chave administrativa e não pertence a este Integra.');
    }
}

function validateAccessPayloadStructure(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('O conteúdo da credencial está inválido.');
    }

    if (payload.formato !== 'integra-primeiro-acesso' || Number(payload.versao) !== 1) {
        throw new Error('O arquivo não contém um primeiro acesso compatível.');
    }

    const username = normalizeAccessUsername(payload.usuario);

    if (!username || username !== String(payload.usuario || '')) {
        throw new Error('O nome de usuário do arquivo está inválido.');
    }

    if (!payload.credentialId || !payload.nome) {
        throw new Error('A credencial não possui identificação suficiente.');
    }

    if (payload.ativo === false) {
        throw new Error('Este acesso foi emitido como inativo.');
    }

    const password = payload.senha;
    if (
        !password ||
        password.algoritmo !== 'PBKDF2-HMAC-SHA256' ||
        !Number.isInteger(Number(password.iteracoes)) ||
        Number(password.iteracoes) < 100000 ||
        !password.salt ||
        !password.hash
    ) {
        throw new Error('Os dados de senha da credencial estão inválidos.');
    }

    return username;
}

async function verifyAndReadAccessFile(fileText) {
    const sanitized = String(fileText || '').replace(/^\uFEFF/, '').trim();

    let envelope;
    try {
        envelope = JSON.parse(sanitized);
    } catch (error) {
        throw new Error('Não foi possível ler o arquivo .integra.');
    }

    validateAccessEnvelopeStructure(envelope);

    let payloadBytes;
    let signatureBytes;

    try {
        payloadBytes = base64ToBytes(envelope.payload);
        signatureBytes = base64ToBytes(envelope.assinatura);
    } catch (error) {
        throw new Error('A credencial possui dados codificados inválidos.');
    }

    const publicKey = await importIntegraPublicKey();
    const validSignature = await crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        publicKey,
        signatureBytes,
        payloadBytes
    );

    if (!validSignature) {
        throw new Error('A assinatura da credencial é inválida. O arquivo pode ter sido alterado.');
    }

    let payload;
    try {
        payload = JSON.parse(new TextDecoder('utf-8').decode(payloadBytes));
    } catch (error) {
        throw new Error('O conteúdo assinado da credencial está corrompido.');
    }

    const username = validateAccessPayloadStructure(payload);

    return {
        envelope,
        payload,
        username
    };
}

async function saveImportedAccess(payload) {
    const username = validateAccessPayloadStructure(payload);
    const credentialId = String(payload.credentialId);

    const legacyUser = getConfiguredAccessUsers().find(
        item => normalizeAccessUsername(item?.usuario) === username
    );

    if (legacyUser) {
        throw new Error('Este nome de usuário já existe nesta instalação.');
    }

    const existingCredential = await getImportedCredential(credentialId);
    if (existingCredential) {
        const error = new Error('Este arquivo de primeiro acesso já foi ativado neste computador.');
        error.code = 'CREDENTIAL_ALREADY_USED';
        error.username = normalizeAccessUsername(existingCredential.usuario || username);
        throw error;
    }

    const existingUser = await getImportedAccessUser(username);
    if (existingUser) {
        const error = new Error('Este usuário já foi cadastrado neste computador.');
        error.code = 'USER_ALREADY_EXISTS';
        error.username = username;
        throw error;
    }

    const db = await openIntegraAuthDb();
    const transaction = db.transaction(
        [INTEGRA_AUTH_USERS_STORE, INTEGRA_AUTH_CREDENTIALS_STORE],
        'readwrite'
    );

    const now = new Date().toISOString();

    transaction.objectStore(INTEGRA_AUTH_USERS_STORE).add({
        usuario: username,
        nome: String(payload.nome || '').trim(),
        ativo: payload.ativo !== false,
        credentialId,
        criadoEm: String(payload.criadoEm || ''),
        importadoEm: now,
        senha: {
            algoritmo: String(payload.senha.algoritmo),
            iteracoes: Number(payload.senha.iteracoes),
            salt: String(payload.senha.salt),
            hash: String(payload.senha.hash)
        }
    });

    transaction.objectStore(INTEGRA_AUTH_CREDENTIALS_STORE).add({
        credentialId,
        usuario: username,
        importadoEm: now
    });

    await idbTransactionToPromise(transaction);

    return username;
}

async function derivePbkdf2Sha256(password, saltBase64, iterations) {
    if (!globalThis.crypto?.subtle) {
        throw new Error('Web Crypto não está disponível neste ambiente.');
    }

    const passwordKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(String(password)),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt: base64ToBytes(saltBase64),
            iterations: Number(iterations)
        },
        passwordKey,
        256
    );

    return new Uint8Array(bits);
}

function constantTimeBytesEqual(left, right) {
    if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array) || left.length !== right.length) {
        return false;
    }

    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
        difference |= left[index] ^ right[index];
    }

    return difference === 0;
}

async function validateImportedAccessPassword(access, password) {
    if (!access || access.ativo === false || !access.senha) {
        return false;
    }

    if (access.senha.algoritmo !== 'PBKDF2-HMAC-SHA256') {
        return false;
    }

    const calculated = await derivePbkdf2Sha256(
        password,
        access.senha.salt,
        access.senha.iteracoes
    );

    const expected = base64ToBytes(access.senha.hash);
    return constantTimeBytesEqual(calculated, expected);
}

function getRememberedUsername() {
    try {
        return normalizeAccessUsername(localStorage.getItem(INTEGRA_REMEMBER_USER_KEY) || '');
    } catch (error) {
        return '';
    }
}

function updateRememberedUserPreference(username) {
    const checkbox = document.getElementById('rememberMe');
    const normalized = normalizeAccessUsername(username);

    try {
        if (checkbox?.checked && normalized) {
            localStorage.setItem(INTEGRA_REMEMBER_USER_KEY, normalized);
        } else {
            localStorage.removeItem(INTEGRA_REMEMBER_USER_KEY);
        }
    } catch (error) {
        console.warn('Não foi possível atualizar a preferência "Lembrar de mim".', error);
    }
}

function applyRememberedUserToLogin() {
    const userInput = document.getElementById('lkUser');
    const checkbox = document.getElementById('rememberMe');
    const remembered = getRememberedUsername();

    if (checkbox) {
        checkbox.checked = !!remembered;
    }

    if (userInput && remembered) {
        userInput.value = remembered;
    }

    return remembered;
}

function showLoginNotice(message) {
    const notice = document.getElementById('loginNotice');
    if (!notice) {
        return;
    }

    notice.textContent = String(message || '');
    notice.classList.toggle('on', !!message);
}

function clearLoginNotice() {
    showLoginNotice('');
}

function showFirstAccessStatus(message, type = 'info') {
    const status = document.getElementById('firstAccessStatus');
    if (!status) {
        return;
    }

    status.textContent = String(message || '');
    status.className = 'integra-first-access-status';

    if (message) {
        status.classList.add('is-visible', `is-${type}`);
    }
}

function openFirstAccessModal() {
    const modal = document.getElementById('firstAccessModal');
    if (!modal) {
        return;
    }

    clearLoginError();
    clearLoginNotice();
    showFirstAccessStatus('', 'info');
    modal.hidden = false;
    document.body.classList.add('first-access-open');

    const chooseButton = modal.querySelector('[data-first-access-choose]');
    chooseButton?.focus();
}

function closeFirstAccessModal() {
    const modal = document.getElementById('firstAccessModal');
    const fileInput = document.getElementById('firstAccessFile');

    if (modal) {
        modal.hidden = true;
    }

    if (fileInput) {
        fileInput.value = '';
    }

    document.body.classList.remove('first-access-open');
}

function chooseFirstAccessFile() {
    const input = document.getElementById('firstAccessFile');
    input?.click();
}

function setFirstAccessBusy(isBusy) {
    const button = document.querySelector('[data-first-access-choose]');
    const closeButtons = document.querySelectorAll('[data-first-access-close]');

    if (button) {
        button.disabled = !!isBusy;
        button.textContent = isBusy ? 'Validando acesso...' : 'Selecionar arquivo .integra';
    }

    closeButtons.forEach(item => {
        item.disabled = !!isBusy;
    });
}

async function processFirstAccessFile(file) {
    if (!file) {
        return;
    }

    const fileName = String(file.name || '').toLowerCase();
    if (!fileName.endsWith('.integra')) {
        throw new Error('Selecione o arquivo .integra fornecido pelo administrador.');
    }

    if (file.size > 256 * 1024) {
        throw new Error('O arquivo de acesso é maior que o esperado.');
    }

    const content = await file.text();
    const verified = await verifyAndReadAccessFile(content);
    const username = await saveImportedAccess(verified.payload);

    return {
        username,
        name: String(verified.payload.nome || '').trim()
    };
}

async function handleFirstAccessFileChange(event) {
    const input = event.target;
    const file = input?.files?.[0];

    if (!file) {
        return;
    }

    setFirstAccessBusy(true);
    showFirstAccessStatus('Validando a assinatura e preparando o acesso...', 'info');

    try {
        const result = await processFirstAccessFile(file);
        const userInput = document.getElementById('lkUser');
        const passwordInput = document.getElementById('lkPwd');

        if (userInput) {
            userInput.value = result.username;
        }

        showFirstAccessStatus('Acesso ativado com sucesso.', 'success');
        showLoginNotice(`Acesso de ${result.name || result.username} ativado. Digite a senha inicial para entrar.`);

        setTimeout(() => {
            closeFirstAccessModal();
            passwordInput?.focus();
        }, 650);
    } catch (error) {
        console.error('Falha no primeiro acesso:', error);

        if (error?.username) {
            const userInput = document.getElementById('lkUser');
            if (userInput) {
                userInput.value = normalizeAccessUsername(error.username);
            }
        }

        const type = ['CREDENTIAL_ALREADY_USED', 'USER_ALREADY_EXISTS'].includes(error?.code)
            ? 'info'
            : 'error';

        showFirstAccessStatus(error?.message || 'Não foi possível ativar este acesso.', type);
    } finally {
        setFirstAccessBusy(false);
        if (input) {
            input.value = '';
        }
    }
}

function initializeFirstAccessUi() {
    const fileInput = document.getElementById('firstAccessFile');
    const modal = document.getElementById('firstAccessModal');

    fileInput?.addEventListener('change', handleFirstAccessFileChange);

    modal?.addEventListener('click', event => {
        if (event.target === modal) {
            closeFirstAccessModal();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal && !modal.hidden) {
            closeFirstAccessModal();
        }
    });

    applyRememberedUserToLogin();
}
