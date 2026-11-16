/**
 * =========================================================
 * FILE-EXPORT.JS
 * =========================================================
 * Salvamento de arquivos gerados pelo Integra.
 *
 * Desktop Tauri:
 *   usa a janela nativa "Salvar como" e grava o arquivo
 *   diretamente no caminho escolhido pelo usuário.
 *
 * Navegador / localhost:
 *   mantém o download por Blob como alternativa.
 *
 * Nenhuma conexão com a internet é necessária.
 */
(function () {
    'use strict';

    const MIME_TYPES = {
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf'
    };

    const FILTER_NAMES = {
        xlsx: 'Planilha do Excel',
        pdf: 'Documento PDF'
    };

    function isIntegraTauriDesktop() {
        return Boolean(
            window.__TAURI__ &&
            window.__TAURI__.core
        );
    }

    function normalizeFileBytes(value) {
        if (value instanceof Uint8Array) {
            return value;
        }

        if (value instanceof ArrayBuffer) {
            return new Uint8Array(value);
        }

        if (ArrayBuffer.isView(value)) {
            return new Uint8Array(
                value.buffer,
                value.byteOffset,
                value.byteLength
            );
        }

        if (Array.isArray(value)) {
            return new Uint8Array(value);
        }

        throw new TypeError('O conteúdo do arquivo não está em um formato binário válido.');
    }

    function normalizeFileName(value, extension) {
        let name = String(value || `Integra.${extension}`)
            .replace(/[\\/:*?"<>|]/g, '_')
            .trim();

        if (!name) {
            name = `Integra.${extension}`;
        }

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
     * Retorna { saved: false, cancelled: true } quando o usuário fecha
     * a janela Salvar como sem escolher um destino.
     */
    async function saveIntegraFile(options) {
        const settings = options || {};
        const extension = String(settings.extension || '')
            .toLowerCase()
            .replace(/^\./, '');

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
            const tauri = window.__TAURI__;
            const saveDialog = tauri.dialog && tauri.dialog.save;
            const writeFile = tauri.fs && tauri.fs.writeFile;

            if (typeof saveDialog !== 'function' || typeof writeFile !== 'function') {
                throw new Error(
                    'O salvamento nativo não foi carregado. Atualize o Integra Desktop para a versão mais recente.'
                );
            }

            const destination = await saveDialog({
                title: settings.title || 'Salvar arquivo do Integra',
                defaultPath: fileName,
                filters: [{
                    name: FILTER_NAMES[extension],
                    extensions: [extension]
                }]
            });

            if (!destination) {
                return {
                    saved: false,
                    cancelled: true
                };
            }

            await writeFile(destination, bytes);

            return {
                saved: true,
                cancelled: false,
                path: destination
            };
        }

        // Compatibilidade com localhost e navegadores tradicionais.
        const blob = new Blob([bytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = fileName;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => URL.revokeObjectURL(url), 2000);

        return {
            saved: true,
            cancelled: false,
            path: null
        };
    }

    window.isIntegraTauriDesktop = isIntegraTauriDesktop;
    window.saveIntegraFile = saveIntegraFile;
})();
