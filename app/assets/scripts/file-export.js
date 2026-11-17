/* =========================================================
 * INTEGRA — SALVAMENTO SEGURO DE ARQUIVOS
 * =========================================================
 * Desktop Tauri: diálogo nativo e gravação no destino escolhido.
 * Navegador: download por Blob como alternativa.
 * A confirmação só é exibida depois que a gravação/solicitação
 * de download é concluída. Cancelamentos não geram falso sucesso.
 */
(function () {
    'use strict';

    const MIME_TYPES = Object.freeze({
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf'
    });

    const FILTER_NAMES = Object.freeze({
        xlsx: 'Planilha do Excel',
        pdf: 'Documento PDF'
    });

    function showIntegraToast(message, variant = 'success') {
        let region = document.getElementById('integraToastRegion');

        if (!region) {
            region = document.createElement('div');
            region.id = 'integraToastRegion';
            region.className = 'integra-toast-region';
            region.setAttribute('aria-live', 'polite');
            region.setAttribute('aria-atomic', 'true');
            document.body.appendChild(region);
        }

        const toast = document.createElement('div');
        toast.className = `integra-toast integra-toast--${variant === 'error' ? 'error' : 'success'}`;
        toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');

        const icon = document.createElement('span');
        icon.className = 'integra-toast__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = variant === 'error' ? '!' : '✓';

        const text = document.createElement('span');
        text.className = 'integra-toast__message';
        text.textContent = String(message || 'Operação concluída.');

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'integra-toast__close';
        close.setAttribute('aria-label', 'Fechar notificação');
        close.textContent = '×';
        close.addEventListener('click', () => toast.remove(), { once: true });

        toast.append(icon, text, close);
        region.appendChild(toast);

        // Evita acumular notificações antigas em sessões longas.
        while (region.children.length > 3) {
            region.firstElementChild.remove();
        }

        window.setTimeout(() => {
            toast.remove();
            if (region.isConnected && region.childElementCount === 0) {
                region.remove();
            }
        }, 5200);
    }

    function isIntegraTauriDesktop() {
        return Boolean(window.__TAURI__ && window.__TAURI__.core);
    }

    function normalizeFileBytes(value) {
        if (value instanceof Uint8Array) return value;
        if (value instanceof ArrayBuffer) return new Uint8Array(value);
        if (ArrayBuffer.isView(value)) {
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        }
        if (Array.isArray(value)) return new Uint8Array(value);
        throw new TypeError('O conteúdo do arquivo não está em um formato binário válido.');
    }

    function normalizeFileName(value, extension) {
        let name = String(value || `Integra.${extension}`)
            .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
            .trim();

        if (!name) name = `Integra.${extension}`;
        if (!name.toLowerCase().endsWith(`.${extension}`)) {
            const lastDot = name.lastIndexOf('.');
            name = lastDot > 0
                ? `${name.slice(0, lastDot)}.${extension}`
                : `${name}.${extension}`;
        }
        return name;
    }

    /**
     * Salva bytes no computador do usuário.
     * Retorna saved=false/cancelled=true se o diálogo for cancelado.
     */
    async function saveIntegraFile(options) {
        const settings = options || {};
        const extension = String(settings.extension || '').toLowerCase().replace(/^\./, '');

        if (!Object.prototype.hasOwnProperty.call(MIME_TYPES, extension)) {
            throw new Error('Formato de arquivo não permitido para exportação.');
        }

        const bytes = normalizeFileBytes(settings.bytes);
        const fileName = normalizeFileName(settings.fileName, extension);
        const mimeType = settings.mimeType || MIME_TYPES[extension];

        if (!bytes.byteLength) {
            throw new Error('O arquivo gerado está vazio.');
        }

        if (isIntegraTauriDesktop()) {
            // O comando Rust mostra o diálogo e grava o arquivo escolhido.
            // Nenhum caminho arbitrário nem permissão ampla de escrita é exposto ao JS.
            const invoke = window.__TAURI__.core.invoke;
            if (typeof invoke !== 'function') {
                throw new Error('O salvamento nativo não está disponível nesta instalação.');
            }

            const destination = await invoke('save_integra_export', {
                fileName,
                extension,
                bytes: Array.from(bytes)
            });

            if (destination === null) return { saved: false, cancelled: true };
            showIntegraToast(`${fileName} foi salvo com sucesso.`, 'success');
            return { saved: true, cancelled: false, path: destination };
        }

        // Compatibilidade com localhost e navegadores tradicionais.
        const blob = new Blob([bytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        try {
            link.href = url;
            link.download = fileName;
            link.hidden = true;
            document.body.appendChild(link);
            link.click();
        } finally {
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 2000);
        }

        showIntegraToast(`O download de ${fileName} foi iniciado.`, 'success');
        return { saved: true, cancelled: false, path: null };
    }

    window.showIntegraToast = showIntegraToast;
    window.isIntegraTauriDesktop = isIntegraTauriDesktop;
    window.saveIntegraFile = saveIntegraFile;
})();
