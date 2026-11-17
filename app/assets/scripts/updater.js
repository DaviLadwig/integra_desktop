/* =========================================================
   INTEGRA — ATUALIZAÇÕES OPCIONAIS E ASSINADAS (TAURI 2)
   Nenhuma informação clínica é enviada para verificar versões.
========================================================= */
(function () {
    'use strict';

    let checking = false;
    let installing = false;
    let automaticCheckStarted = false;

    function invokeCommand(name, args = {}) {
        const invoke = window.__TAURI__?.core?.invoke;
        if (typeof invoke !== 'function') {
            throw new Error('As atualizações estão disponíveis somente no Integra Desktop.');
        }
        return invoke(name, args);
    }

    function showUpdateMessage(message, error = false) {
        if (typeof window.showIntegraToast === 'function') {
            window.showIntegraToast(message, error ? 'error' : 'success');
        } else if (error) {
            window.alert(message);
        }
    }

    function createUpdateDialog(update) {
        document.getElementById('integraUpdateDialog')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'integraUpdateDialog';
        overlay.className = 'integra-update-overlay';

        const dialog = document.createElement('section');
        dialog.className = 'integra-update-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'integraUpdateTitle');

        const eyebrow = document.createElement('span');
        eyebrow.className = 'integra-update-eyebrow';
        eyebrow.textContent = 'Atualização disponível';

        const title = document.createElement('h2');
        title.id = 'integraUpdateTitle';
        title.textContent = `Integra ${String(update.version).slice(0, 32)}`;

        const description = document.createElement('p');
        description.textContent = 'Uma nova versão está disponível. O sistema continuará funcionando offline após a instalação.';

        const notes = document.createElement('div');
        notes.className = 'integra-update-notes';
        notes.textContent = String(update.notes || 'Correções de segurança, estabilidade e melhorias no sistema.').slice(0, 1500);

        const status = document.createElement('p');
        status.className = 'integra-update-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.textContent = 'A instalação será iniciada somente com a sua autorização.';

        const actions = document.createElement('div');
        actions.className = 'integra-update-actions';

        const later = document.createElement('button');
        later.type = 'button';
        later.className = 'integra-update-later';
        later.textContent = 'Mais tarde';

        const install = document.createElement('button');
        install.type = 'button';
        install.className = 'integra-update-install';
        install.textContent = 'Atualizar agora';

        const close = () => {
            if (!installing) overlay.remove();
        };
        later.addEventListener('click', close);
        overlay.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !installing) close();
        });

        install.addEventListener('click', async () => {
            if (installing) return;
            installing = true;
            install.disabled = true;
            later.disabled = true;
            status.textContent = 'Baixando e instalando a atualização assinada. Não feche o aplicativo.';
            try {
                // O Rust verifica novamente a versão e valida a assinatura antes de instalar.
                await invokeCommand('integra_install_update', { expectedVersion: update.version });
                status.textContent = 'Atualização instalada. O Integra será reiniciado.';
            } catch (error) {
                status.textContent = String(error?.message || error || 'Não foi possível atualizar.');
                install.disabled = false;
                later.disabled = false;
            } finally {
                installing = false;
            }
        });

        actions.append(later, install);
        dialog.append(eyebrow, title, description, notes, status, actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        install.focus();
    }

    async function checkForIntegraUpdate(manual = false) {
        if (checking || installing) return;
        checking = true;
        const button = document.getElementById('integraCheckUpdates');
        if (button) button.disabled = true;

        try {
            const update = await invokeCommand('integra_check_update');
            if (update && update.version) {
                createUpdateDialog(update);
            } else if (manual) {
                showUpdateMessage('O Integra já está na versão mais recente.');
            }
        } catch (error) {
            // Falha de rede não bloqueia o uso local ou o login.
            if (manual) {
                showUpdateMessage('Não foi possível verificar as atualizações. Confira a conexão e tente novamente.', true);
            }
            console.warn('Verificação de atualização indisponível:', String(error));
        } finally {
            checking = false;
            if (button) button.disabled = false;
        }
    }

    function initIntegraUpdater() {
        const button = document.getElementById('integraCheckUpdates');
        button?.addEventListener('click', () => checkForIntegraUpdate(true));

        // Não faz consulta antes de o usuário entrar no sistema.
        const app = document.getElementById('appScreen');
        if (!app) return;

        const startOnce = () => {
            if (automaticCheckStarted || app.style.display === 'none') return;
            automaticCheckStarted = true;
            observer.disconnect();
            window.setTimeout(() => checkForIntegraUpdate(false), 2600);
        };
        const observer = new MutationObserver(startOnce);
        observer.observe(app, { attributes: true, attributeFilter: ['style'] });
        startOnce();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIntegraUpdater, { once: true });
    } else {
        initIntegraUpdater();
    }

    window.checkForIntegraUpdate = checkForIntegraUpdate;
})();
