/**
 * =========================================================
 * AUTENTICAÇÃO
 * =========================================================
 *
 * Responsável por:
 * - validar credenciais;
 * - criar e destruir sessão;
 * - controlar entrada e saída do sistema;
 * - alternar entre login e aplicação.
 */


/**
 * Chave utilizada no sessionStorage.
 */
const AUTH_SESSION_KEY = 'siaps_auth';
const AUTH_USER_KEY = 'siaps_auth_user';


/**
 * Fallback em memória para ambientes file:// onde o navegador
 * possa restringir o sessionStorage.
 */
let authSessionFallback = false;
let authUserFallback = '';


/**
 * =========================================================
 * MENSAGENS DE ERRO
 * =========================================================
 */

/**
 * Exibe uma mensagem de erro na tela de login.
 *
 * @param {string} message
 */
function showLoginError(message) {

    const errorElement =
        document.getElementById('loginErr');

    if (!errorElement) {
        return;
    }

    errorElement.textContent = message;
    errorElement.classList.add('on');
}


/**
 * Limpa qualquer mensagem de erro exibida.
 */
function clearLoginError() {

    const errorElement =
        document.getElementById('loginErr');

    if (!errorElement) {
        return;
    }

    errorElement.textContent = '';
    errorElement.classList.remove('on');
}


/**
 * =========================================================
 * SESSÃO
 * =========================================================
 */

/**
 * Retorna true quando existe uma sessão autenticada.
 *
 * @returns {boolean}
 */
function getAuthenticatedUsername() {

    try {
        const stored = sessionStorage.getItem(AUTH_USER_KEY);
        if (stored) {
            return normalizeAccessUsername(stored);
        }
    } catch (error) {
        // Usa o fallback em memória abaixo.
    }

    return normalizeAccessUsername(authUserFallback || '');
}


function isAuthenticated() {

    try {
        return (
            sessionStorage.getItem(AUTH_SESSION_KEY) === '1' &&
            !!normalizeAccessUsername(sessionStorage.getItem(AUTH_USER_KEY) || '')
        );
    } catch (error) {
        return authSessionFallback && !!normalizeAccessUsername(authUserFallback || '');
    }
}


/**
 * Cria a sessão de autenticação.
 */
function createAuthSession(username) {

    const normalizedUsername = normalizeAccessUsername(username);

    if (!normalizedUsername) {
        throw new Error('Não foi possível identificar o usuário autenticado.');
    }

    authSessionFallback = true;
    authUserFallback = normalizedUsername;

    try {
        sessionStorage.setItem(AUTH_SESSION_KEY, '1');
        sessionStorage.setItem(AUTH_USER_KEY, normalizedUsername);
    } catch (error) {
        console.warn(
            'sessionStorage indisponível. A sessão será mantida apenas enquanto a página permanecer aberta.'
        );
    }
}


/**
 * Encerra a sessão.
 */
function destroyAuthSession() {

    authSessionFallback = false;
    authUserFallback = '';

    try {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        sessionStorage.removeItem(AUTH_USER_KEY);
    } catch (error) {
        // Nenhuma ação adicional é necessária.
    }
}



function resetSiapsUserRuntimeState() {
    window._siapsActiveHistoryIds = [];
    window._siapsChecklistImportId = '';

    if (typeof closeSiapsHistoryDBForUserSwitch === 'function') {
        closeSiapsHistoryDBForUserSwitch();
    }

    if (typeof closeSiapsChecklistDBForUserSwitch === 'function') {
        closeSiapsChecklistDBForUserSwitch();
    }
}

/**
 * =========================================================
 * LOGIN
 * =========================================================
 */

/**
 * Efetua o login do responsável municipal.
 */
function normalizeAccessUsername(value) {

    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}


function getConfiguredAccessUsers() {

    return Array.isArray(window.SIAPS_ACCESS_USERS)
        ? window.SIAPS_ACCESS_USERS
        : [];
}


/**
 * Efetua o login por usuário e senha.
 */
async function doLogin() {

    clearLoginError();

    if (typeof clearLoginNotice === 'function') {
        clearLoginNotice();
    }

    const userInput =
        document.getElementById('lkUser');

    const passwordInput =
        document.getElementById('lkPwd');

    if (!userInput || !passwordInput) {

        console.error(
            'Os campos de autenticação não foram encontrados.'
        );

        return;
    }

    const username =
        normalizeAccessUsername(
            userInput.value
        );

    const password =
        passwordInput.value;

    if (!username) {

        showLoginError(
            'Informe o usuário.'
        );

        userInput.focus();
        return;
    }

    if (!password) {

        showLoginError(
            'Informe a senha.'
        );

        passwordInput.focus();
        return;
    }

    try {

        /**
         * Primeiro procura usuários ativados por arquivo .integra.
         * Caso não exista, mantém compatibilidade com o acesso
         * administrativo legado durante a transição.
         */
        const importedAccess =
            typeof getImportedAccessUser === 'function'
                ? await getImportedAccessUser(username)
                : null;

        let passwordIsValid = false;
        let accessExists = false;

        if (importedAccess && importedAccess.ativo !== false) {

            accessExists = true;

            passwordIsValid =
                typeof validateImportedAccessPassword === 'function'
                    ? await validateImportedAccessPassword(
                        importedAccess,
                        password
                    )
                    : false;

        } else {

            const users =
                getConfiguredAccessUsers();

            const legacyAccess =
                users.find(
                    item =>
                        normalizeAccessUsername(item?.usuario) === username &&
                        item?.ativo !== false
                );

            if (legacyAccess) {

                accessExists = true;

                const passwordHash =
                    await sha256Hex(password);

                passwordIsValid =
                    String(legacyAccess.senhaHash || '') === passwordHash;
            }
        }

        if (!accessExists || !passwordIsValid) {

            showLoginError(
                'Usuário ou senha incorretos.'
            );

            return;
        }

        createAuthSession(username);

        if (typeof updateRememberedUserPreference === 'function') {
            updateRememberedUserPreference(username);
        }

        resetSiapsUserRuntimeState();
        openAuthenticatedArea();

    } catch (error) {

        console.error(
            'Erro durante a autenticação:',
            error
        );

        showLoginError(
            'Não foi possível realizar o acesso ao sistema.'
        );
    }
}


/**
 * =========================================================
 * ABERTURA DA APLICAÇÃO
 * =========================================================
 */

/**
 * Exibe a aplicação após autenticação.
 *
 * A seção inicial é sempre a área de importação.
 */
function openAuthenticatedArea() {

    const loginScreen =
        document.getElementById('loginScreen');

    const appScreen =
        document.getElementById('appScreen');


    /**
     * Oculta login.
     */
    if (loginScreen) {
        loginScreen.style.display = 'none';
    }


    /**
     * Exibe aplicação.
     */
    if (appScreen) {
        appScreen.style.display = 'block';
    }


    /**
     * Libera scroll da aplicação.
     */
    document.body.classList.remove(
        'login-active'
    );


    /**
     * Abre a primeira seção do sistema.
     */
    if (typeof showSection === 'function') {

        showSection('import');

    }

}


/**
 * =========================================================
 * LOGOUT
 * =========================================================
 */

/**
 * Encerra a sessão e retorna ao login.
 */
function doLogout() {

    destroyAuthSession();


    /**
     * Dados de saúde ficam somente em memória.
     * Ao sair do sistema, a base carregada é descartada.
     */
    if (
        typeof resetSiapsData ===
        'function'
    ) {

        resetSiapsData({
            navigateToImport: false,
            clearMessages: true
        });

    }


    const loginScreen =
        document.getElementById('loginScreen');

    const appScreen =
        document.getElementById('appScreen');


    /**
     * Oculta aplicação.
     */
    if (appScreen) {
        appScreen.style.display = 'none';
    }


    /**
     * Exibe login.
     */
    if (loginScreen) {
        loginScreen.style.display = 'flex';
    }


    /**
     * Trava o scroll enquanto o login estiver ativo.
     */
    document.body.classList.add(
        'login-active'
    );


    /**
     * Limpa os campos.
     */
    const userInput =
        document.getElementById('lkUser');

    const passwordInput =
        document.getElementById('lkPwd');


    if (passwordInput) {
        passwordInput.value = '';
    }

    let rememberedUsername = '';

    if (typeof applyRememberedUserToLogin === 'function') {
        rememberedUsername = applyRememberedUserToLogin();
    } else if (userInput) {
        userInput.value = '';
    }


    clearLoginError();

    if (typeof clearLoginNotice === 'function') {
        clearLoginNotice();
    }


    /**
     * Quando "Lembrar de mim" estiver ativo, mantém somente
     * o usuário e devolve o foco para a senha.
     */
    if (rememberedUsername && passwordInput) {
        passwordInput.focus();
    } else if (userInput) {
        userInput.focus();
    }

}


/**
 * =========================================================
 * RESTAURAÇÃO DE SESSÃO
 * =========================================================
 */

/**
 * Restaura a tela correta ao recarregar a página.
 *
 * Como os dados da planilha ficam somente em memória,
 * após atualizar a página o sistema abre novamente
 * na seção de importação.
 */
function restoreSession() {

    const loginScreen =
        document.getElementById('loginScreen');

    const appScreen =
        document.getElementById('appScreen');


    /**
     * Usuário autenticado.
     */
    if (isAuthenticated()) {

        if (loginScreen) {
            loginScreen.style.display = 'none';
        }


        if (appScreen) {
            appScreen.style.display = 'block';
        }


        document.body.classList.remove(
            'login-active'
        );


        /**
         * Sempre inicia na importação.
         */
        if (typeof showSection === 'function') {

            showSection('import');

        }


        return;
    }


    /**
     * Usuário não autenticado.
     */
    if (appScreen) {
        appScreen.style.display = 'none';
    }


    if (loginScreen) {
        loginScreen.style.display = 'flex';
    }


    document.body.classList.add(
        'login-active'
    );

}
