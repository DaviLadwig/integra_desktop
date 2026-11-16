/**
 * =========================================================
 * CHECKLIST.JS
 * =========================================================
 *
 * Checklist local para listas nominais baixadas do portal SIAPS.
 *
 * Regras importantes:
 * - os "X" que já vieram do SIAPS aparecem marcados e bloqueados;
 * - células vazias podem ser marcadas/desmarcadas pela equipe;
 * - as marcações locais são salvas em IndexedDB separadamente;
 * - o arquivo XLSX original e os indicadores oficiais não são alterados;
 * - os critérios são detectados dinamicamente a partir das colunas
 *   presentes depois da coluna INE no relatório do portal.
 */

const SIAPS_CHECKLIST_DB_LEGACY = 'siaps_local_checklist';
const SIAPS_CHECKLIST_DB_PREFIX = 'siaps_local_checklist__';
const SIAPS_CHECKLIST_VERSION = 1;
const SIAPS_CHECKLIST_STORE = 'items';

let siapsChecklistDbPromise = null;
let siapsChecklistDbNamespace = '';
window._siapsChecklistImportId = window._siapsChecklistImportId || '';


function getSiapsChecklistDatabaseName() {

    const username =
        typeof getSiapsStorageUsername === 'function'
            ? getSiapsStorageUsername()
            : (
                typeof getAuthenticatedUsername === 'function'
                    ? getAuthenticatedUsername()
                    : 'semusuario'
            );

    // Preserva as marcações históricas já existentes do administrador.
    if (username === 'administrador') {
        return SIAPS_CHECKLIST_DB_LEGACY;
    }

    return `${SIAPS_CHECKLIST_DB_PREFIX}${username || 'semusuario'}`;
}


function closeSiapsChecklistDBForUserSwitch() {

    if (siapsChecklistDbPromise) {
        siapsChecklistDbPromise
            .then(db => db?.close?.())
            .catch(() => {});
    }

    siapsChecklistDbPromise = null;
    siapsChecklistDbNamespace = '';
}


function openSiapsChecklistDB() {

    if (!('indexedDB' in window)) {
        return Promise.reject(
            new Error('IndexedDB não está disponível neste navegador.')
        );
    }

    const databaseName = getSiapsChecklistDatabaseName();

    if (
        siapsChecklistDbPromise &&
        siapsChecklistDbNamespace === databaseName
    ) {
        return siapsChecklistDbPromise;
    }

    if (
        siapsChecklistDbPromise &&
        siapsChecklistDbNamespace !== databaseName
    ) {
        closeSiapsChecklistDBForUserSwitch();
    }

    siapsChecklistDbNamespace = databaseName;

    siapsChecklistDbPromise = new Promise((resolve, reject) => {

        const request = indexedDB.open(
            databaseName,
            SIAPS_CHECKLIST_VERSION
        );

        request.onupgradeneeded = event => {

            const db = event.target.result;

            if (!db.objectStoreNames.contains(SIAPS_CHECKLIST_STORE)) {

                const store = db.createObjectStore(
                    SIAPS_CHECKLIST_STORE,
                    { keyPath: 'id' }
                );

                store.createIndex('importId', 'importId', { unique: false });
                store.createIndex('personKey', 'personKey', { unique: false });
                store.createIndex('criterionKey', 'criterionKey', { unique: false });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => db.close();
            resolve(db);
        };

        request.onerror = () => {
            siapsChecklistDbPromise = null;
            reject(
                request.error || new Error('Não foi possível abrir o checklist local.')
            );
        };
    });

    return siapsChecklistDbPromise;
}


function checklistRequestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(
            request.error || new Error('Falha ao acessar o checklist local.')
        );
    });
}


async function checklistGetByImport(importId) {

    const db = await openSiapsChecklistDB();
    const tx = db.transaction(SIAPS_CHECKLIST_STORE, 'readonly');
    const store = tx.objectStore(SIAPS_CHECKLIST_STORE);
    const index = store.index('importId');

    const records = await checklistRequestToPromise(
        index.getAll(String(importId || ''))
    );

    return Array.isArray(records) ? records : [];
}


async function checklistPut(item) {

    const db = await openSiapsChecklistDB();
    const tx = db.transaction(SIAPS_CHECKLIST_STORE, 'readwrite');
    const store = tx.objectStore(SIAPS_CHECKLIST_STORE);

    await checklistRequestToPromise(store.put(item));

    return item;
}


async function checklistDelete(id) {

    const db = await openSiapsChecklistDB();
    const tx = db.transaction(SIAPS_CHECKLIST_STORE, 'readwrite');
    const store = tx.objectStore(SIAPS_CHECKLIST_STORE);

    await checklistRequestToPromise(store.delete(String(id || '')));
}


async function checklistDeleteImport(importId) {

    if (!importId) {
        return;
    }

    const items = await checklistGetByImport(importId);

    if (!items.length) {
        return;
    }

    const db = await openSiapsChecklistDB();
    const tx = db.transaction(SIAPS_CHECKLIST_STORE, 'readwrite');
    const store = tx.objectStore(SIAPS_CHECKLIST_STORE);

    for (const item of items) {
        store.delete(item.id);
    }

    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('Falha ao remover checklist local.'));
        tx.onabort = () => reject(tx.error || new Error('Falha ao remover checklist local.'));
    });
}


function checklistMakeId(importId, personKey, criterionKey) {
    return `${String(importId)}::${String(personKey)}::${String(criterionKey)}`;
}


function checklistRowKey(row, index) {

    const stored = String(row?.__siapsPersonKey || '').trim();
    if (stored) {
        return stored;
    }

    const cpf = onlyDigitsStr(getField(row, 'CPF'));
    if (cpf) {
        return `cpf:${cpf}`;
    }

    const cns = onlyDigitsStr(getField(row, 'CNS'));
    if (cns) {
        return `cns:${cns}`;
    }

    return `row:${index}`;
}


function getChecklistCriteria(record) {

    const headers = Array.isArray(record?.headers)
        ? record.headers.map(value => String(value || '').trim()).filter(Boolean)
        : [];

    if (!headers.length) {
        return [];
    }

    const ineIndex = headers.findIndex(header =>
        normalizeColumnKey(header) === 'INE'
    );

    const source = ineIndex >= 0
        ? headers.slice(ineIndex + 1)
        : headers;

    const practiceMap = new Map(
        (Array.isArray(record?.goodPractices) ? record.goodPractices : [])
            .map(item => [String(item.key || '').trim(), String(item.label || '').trim()])
    );

    const dictionary =
        record?.dictionary &&
        typeof record.dictionary === 'object'
            ? record.dictionary
            : {};

    const friendly = {
        'A': '1ª consulta até 30 dias',
        'B': '9 consultas até 2 anos',
        'C': '9 registros de peso e altura',
        'D': '2 visitas domiciliares',
        'E': 'Vacinação recomendada'
    };

    return source
        .filter(Boolean)
        .map(header => ({
            key: header,
            label:
                practiceMap.get(header)
                ||
                dictionary[header]
                ||
                friendly[header]
                ||
                header
        }));
}


function formatChecklistCpf(value) {

    const digits = onlyDigitsStr(value).slice(0, 11);

    if (digits.length !== 11) {
        return digits || 'Não informado';
    }

    return digits.replace(
        /(\d{3})(\d{3})(\d{3})(\d{2})/,
        '$1.$2.$3-$4'
    );
}


function formatChecklistCns(value) {
    const digits = onlyDigitsStr(value);
    return digits || 'Não informado';
}


function checklistRaceLabel(value) {

    const labels = {
        '1': 'Branca',
        '2': 'Preta',
        '3': 'Amarela',
        '4': 'Parda',
        '5': 'Indígena',
        '6': 'Sem informação'
    };

    const raw = String(value ?? '').trim();
    return labels[raw] || raw || 'Não informada';
}


function checklistSexLabel(value) {

    const raw = String(value ?? '').trim().toUpperCase();

    if (raw === 'M') return 'Masculino';
    if (raw === 'F') return 'Feminino';

    return raw || 'Não informado';
}


function checklistSourceMarked(row, key) {

    if (typeof normalizePortalMark === 'function') {
        return normalizePortalMark(getField(row, key)) === 'X';
    }

    return String(getField(row, key) || '').trim().toUpperCase() === 'X';
}


function checklistBuildImportLabel(record) {

    const period = record?.competenceKey
        ? formatHistoryCompetence(record.competenceKey, record.competenceLabel)
        : (record?.competenceLabel || 'Sem competência');

    const group = typeof historyCategoryLabel === 'function'
        ? historyCategoryLabel(record?.category)
        : (record?.category || 'Grupo');

    const team = record?.teamLabel
        ? ` · Equipe ${record.teamLabel}`
        : '';

    return `${period} · ${group}${team}`;
}


async function renderChecklist() {

    const container = document.getElementById('checklistContent');

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="checklist-no-data">
            <h2>Carregando checklist...</h2>
            <p>Aguarde enquanto o histórico local é consultado.</p>
        </div>
    `;

    try {
        const imports = (await historyGetAll())
            .filter(item =>
                item.sourceType === 'portal-siaps' &&
                Array.isArray(item.records) &&
                item.records.length > 0
            )
            .sort((a, b) =>
                String(b.competenceKey || '').localeCompare(String(a.competenceKey || '')) ||
                String(b.importedAt || '').localeCompare(String(a.importedAt || ''))
            );

        if (!imports.length) {
            container.innerHTML = `
                <div class="checklist-no-data">
                    <h2>Nenhuma lista nominal disponível</h2>
                    <p>Importe uma planilha baixada diretamente do portal SIAPS para utilizar o checklist assistencial.</p>
                    <button type="button" class="btn-secondary" data-go-section="import">Importar dados</button>
                </div>
            `;
            return;
        }

        const activeHistoryId = Array.isArray(window._siapsActiveHistoryIds)
            ? window._siapsActiveHistoryIds.find(id => imports.some(item => item.id === id))
            : '';

        let selectedId = String(window._siapsChecklistImportId || activeHistoryId || imports[0].id);

        if (!imports.some(item => item.id === selectedId)) {
            selectedId = imports[0].id;
        }

        window._siapsChecklistImportId = selectedId;

        const record = imports.find(item => item.id === selectedId) || imports[0];
        const criteria = getChecklistCriteria(record);
        const localItems = await checklistGetByImport(record.id);
        const localMap = new Map(localItems.map(item => [item.id, item]));

        let sourceMarks = 0;
        let localMarks = 0;

        const rows = record.records.map((row, index) => {

            const personKey = checklistRowKey(row, index);
            const cpf = getField(row, 'CPF');
            const cns = getField(row, 'CNS');
            const birth = String(getField(row, 'Nascimento') || '').trim() || 'Não informado';
            const sex = checklistSexLabel(getField(row, 'Sexo'));
            const race = checklistRaceLabel(getField(row, 'Raça cor'));
            const cnes = String(getField(row, 'CNES') || '').trim() || '—';
            const ine = String(getField(row, 'INE') || '').trim() || '—';

            const searchText = [cpf, cns, birth, sex, race, cnes, ine]
                .map(value => normalizeText(value))
                .join(' ');

            const cells = criteria.map(criterion => {

                const sourceChecked = checklistSourceMarked(row, criterion.key);
                const itemId = checklistMakeId(record.id, personKey, criterion.key);
                const localChecked = !sourceChecked && localMap.has(itemId);

                if (sourceChecked) sourceMarks++;
                if (localChecked) localMarks++;

                return `
                    <td class="checklist-criterion-cell">
                        <label
                            class="checklist-check${sourceChecked ? ' is-source' : ''}"
                            title="${sourceChecked ? 'Já marcado no arquivo SIAPS' : 'Marcação local do checklist'}"
                        >
                            <input
                                type="checkbox"
                                ${sourceChecked || localChecked ? 'checked' : ''}
                                ${sourceChecked ? 'disabled' : ''}
                                data-checklist-toggle="1"
                                data-import-id="${escapeAttribute(record.id)}"
                                data-person-key="${escapeAttribute(personKey)}"
                                data-criterion-key="${escapeAttribute(criterion.key)}"
                                aria-label="${escapeAttribute(criterion.label)}"
                            >
                            <span class="checklist-check__box" aria-hidden="true"></span>
                        </label>
                    </td>
                `;
            }).join('');

            return `
                <tr data-checklist-row="1" data-search="${escapeAttribute(searchText)}">
                    <td class="checklist-table__patient">
                        <span class="checklist-patient__primary">
                            CPF ${escapeBI(formatChecklistCpf(cpf))}
                        </span>
                        <span class="checklist-patient__secondary">
                            CNS ${escapeBI(formatChecklistCns(cns))}<br>
                            Nascimento ${escapeBI(birth)}
                        </span>
                    </td>
                    <td class="checklist-meta-cell">${escapeBI(sex)}</td>
                    <td class="checklist-meta-cell">${escapeBI(race)}</td>
                    <td class="checklist-meta-cell">${escapeBI(cnes)}</td>
                    <td class="checklist-meta-cell">${escapeBI(ine)}</td>
                    ${cells}
                </tr>
            `;
        }).join('');

        const practiceGuide = criteria
            .filter(item => item.label && item.label !== item.key)
            .map(item => `
                <span class="checklist-practice-map__item">
                    <strong>${escapeBI(item.key)}</strong>
                    ${escapeBI(item.label)}
                </span>
            `)
            .join('');

        container.innerHTML = `
            <div class="checklist-shell">

                <div class="checklist-toolbar">

                    <div class="checklist-field">
                        <label for="checklistBaseSelect">Base / competência</label>
                        <select id="checklistBaseSelect">
                            ${imports.map(item => `
                                <option value="${escapeAttribute(item.id)}" ${item.id === record.id ? 'selected' : ''}>
                                    ${escapeBI(checklistBuildImportLabel(item))}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="checklist-field">
                        <label for="checklistSearch">Localizar paciente</label>
                        <input
                            type="search"
                            id="checklistSearch"
                            placeholder="CPF, CNS, nascimento, equipe..."
                            autocomplete="off"
                        >
                    </div>

                    <div class="checklist-actions">
                        <button type="button" class="btn-secondary" id="checklistPrintButton">
                            Imprimir
                        </button>
                        <button type="button" class="btn-primary" id="checklistPdfButton">
                            Baixar PDF
                        </button>
                    </div>

                </div>

                <div class="checklist-summary">
                    <div class="checklist-summary__item">
                        <span>Pacientes</span>
                        <strong>${formatNumber(record.records.length)}</strong>
                        <small>${escapeBI(record.indicator || 'Lista nominal')}</small>
                    </div>

                    <div class="checklist-summary__item">
                        <span>Marcações do SIAPS</span>
                        <strong id="checklistSourceCount">${formatNumber(sourceMarks)}</strong>
                        <small>Vieram preenchidas no arquivo original</small>
                    </div>

                    <div class="checklist-summary__item">
                        <span>Marcações locais</span>
                        <strong id="checklistLocalCount">${formatNumber(localMarks)}</strong>
                        <small>Realizadas neste checklist</small>
                    </div>
                </div>

                <div class="checklist-guide">
                    <div class="checklist-guide__text">
                        <strong>Checklist local da equipe</strong>
                        <span>Os itens já marcados no SIAPS ficam bloqueados. Os campos vazios podem ser marcados pela equipe e são salvos automaticamente neste navegador.</span>
                    </div>

                    <div class="checklist-legend" aria-label="Legenda do checklist">
                        <span class="checklist-legend__item">
                            <span class="checklist-legend__box checklist-legend__box--source">✓</span>
                            Registrado no SIAPS
                        </span>
                        <span class="checklist-legend__item">
                            <span class="checklist-legend__box checklist-legend__box--local">✓</span>
                            Marcado localmente
                        </span>
                    </div>
                </div>

                ${practiceGuide ? `
                    <div class="checklist-practice-map">
                        ${practiceGuide}
                    </div>
                ` : ''}

                <div class="checklist-table-wrap">
                    <table class="checklist-table">
                        <thead>
                            <tr>
                                <th class="checklist-table__patient">Paciente</th>
                                <th>Sexo</th>
                                <th>Raça/cor</th>
                                <th>CNES</th>
                                <th>INE</th>
                                ${criteria.map(item => `
                                    <th class="checklist-criterion-head" title="${escapeAttribute(item.label)}">
                                        <span>${escapeBI(item.key)}</span>
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody id="checklistTableBody">
                            ${rows || `
                                <tr class="checklist-empty-row">
                                    <td colspan="${5 + criteria.length}">Nenhum paciente encontrado nesta base.</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>

            </div>
        `;

        bindChecklistEvents();

    } catch (error) {
        console.error('Erro ao carregar checklist:', error);

        container.innerHTML = `
            <div class="checklist-no-data">
                <h2>Checklist indisponível</h2>
                <p>${escapeBI(error.message || 'Não foi possível abrir os dados do checklist.')}</p>
            </div>
        `;
    }
}


function bindChecklistEvents() {

    const baseSelect = document.getElementById('checklistBaseSelect');
    const search = document.getElementById('checklistSearch');
    const printButton = document.getElementById('checklistPrintButton');
    const pdfButton = document.getElementById('checklistPdfButton');

    if (baseSelect) {
        baseSelect.addEventListener('change', () => {
            window._siapsChecklistImportId = baseSelect.value;
            renderChecklist();
        });
    }

    if (printButton) {
        printButton.addEventListener('click', () => {
            imprimirChecklistAssistencial();
        });
    }

    if (pdfButton) {
        pdfButton.addEventListener('click', () => {
            baixarChecklistPDF();
        });
    }

    if (search) {
        search.addEventListener('input', () => {

            const query = normalizeText(search.value);
            let visible = 0;

            document.querySelectorAll('[data-checklist-row="1"]').forEach(row => {
                const haystack = String(row.dataset.search || '');
                const show = !query || haystack.includes(query);
                row.style.display = show ? '' : 'none';
                if (show) visible++;
            });

            const body = document.getElementById('checklistTableBody');
            const existingEmpty = document.getElementById('checklistSearchEmpty');

            if (existingEmpty) {
                existingEmpty.remove();
            }

            if (!visible && body) {
                const criteriaCount = document.querySelectorAll('.checklist-criterion-head').length;
                const tr = document.createElement('tr');
                tr.id = 'checklistSearchEmpty';
                tr.className = 'checklist-empty-row';
                tr.innerHTML = `<td colspan="${5 + criteriaCount}">Nenhum paciente corresponde à busca informada.</td>`;
                body.appendChild(tr);
            }
        });
    }

    document.querySelectorAll('[data-checklist-toggle="1"]').forEach(input => {

        if (input.disabled) {
            return;
        }

        input.addEventListener('change', async () => {

            const importId = input.dataset.importId || '';
            const personKey = input.dataset.personKey || '';
            const criterionKey = input.dataset.criterionKey || '';
            const id = checklistMakeId(importId, personKey, criterionKey);

            try {
                if (input.checked) {
                    await checklistPut({
                        id,
                        importId,
                        personKey,
                        criterionKey,
                        checked: true,
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    await checklistDelete(id);
                }

                const count = document.querySelectorAll(
                    '[data-checklist-toggle="1"]:checked:not(:disabled)'
                ).length;

                const countElement = document.getElementById('checklistLocalCount');
                if (countElement) {
                    countElement.textContent = formatNumber(count);
                }

            } catch (error) {
                console.error('Erro ao salvar checklist:', error);

                input.checked = !input.checked;

                window.alert(
                    error.message || 'Não foi possível salvar a marcação local.'
                );
            }
        });
    });
}

/**
 * =========================================================
 * IMPRESSÃO E PDF DO CHECKLIST
 * =========================================================
 */

async function buildChecklistExportModel() {

    const importId = String(window._siapsChecklistImportId || '');

    if (!importId) {
        throw new Error('Nenhuma base foi selecionada para o checklist.');
    }

    const record = await historyGet(importId);

    if (!record || !Array.isArray(record.records)) {
        throw new Error('A base selecionada não está mais disponível no histórico.');
    }

    const criteria = getChecklistCriteria(record);
    const localItems = await checklistGetByImport(record.id);
    const localMap = new Map(localItems.map(item => [item.id, item]));

    let sourceMarks = 0;
    let localMarks = 0;

    const patients = record.records.map((row, index) => {

        const personKey = checklistRowKey(row, index);

        const marks = criteria.map(criterion => {
            const source = checklistSourceMarked(row, criterion.key);
            const local = !source && localMap.has(
                checklistMakeId(record.id, personKey, criterion.key)
            );

            if (source) sourceMarks++;
            if (local) localMarks++;

            return {
                key: criterion.key,
                label: criterion.label,
                source,
                local,
                value: source ? 'V' : local ? 'V' : ''
            };
        });

        return {
            cpf: formatChecklistCpf(getField(row, 'CPF')),
            cns: formatChecklistCns(getField(row, 'CNS')),
            birth: String(getField(row, 'Nascimento') || '').trim() || 'Não informado',
            sex: checklistSexLabel(getField(row, 'Sexo')),
            race: checklistRaceLabel(getField(row, 'Raça cor')),
            cnes: String(getField(row, 'CNES') || '').trim() || '—',
            ine: String(getField(row, 'INE') || '').trim() || '—',
            marks
        };
    });

    return {
        record,
        criteria,
        patients,
        sourceMarks,
        localMarks,
        competence: record.competenceKey
            ? formatHistoryCompetence(record.competenceKey, record.competenceLabel)
            : (record.competenceLabel || 'Competência não informada'),
        group: historyCategoryLabel(record.category || ''),
        indicator: record.indicator || 'Lista nominal SIAPS',
        team: record.teamLabel || record.teamKey || 'Equipe não informada',
        generatedAt: new Date()
    };
}

function checklistEscapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function buildPrintableChecklistHtml(model) {

    const criterionHeaders = model.criteria.map(item => `
        <th title="${checklistEscapeHtml(item.label)}">${checklistEscapeHtml(item.key)}</th>
    `).join('');

    const rows = model.patients.map(patient => `
        <tr>
            <td class="patient">
                <strong>CPF ${checklistEscapeHtml(patient.cpf)}</strong>
                <span>CNS ${checklistEscapeHtml(patient.cns)}</span>
                <span>Nasc. ${checklistEscapeHtml(patient.birth)}</span>
            </td>
            <td>${checklistEscapeHtml(patient.sex)}</td>
            <td>${checklistEscapeHtml(patient.race)}</td>
            <td>${checklistEscapeHtml(patient.cnes)}</td>
            <td>${checklistEscapeHtml(patient.ine)}</td>
            ${patient.marks.map(mark => `
                <td class="mark ${mark.source ? 'source' : mark.local ? 'local' : ''}">
                    ${mark.source || mark.local ? '✓' : ''}
                </td>
            `).join('')}
        </tr>
    `).join('');

    const criteriaLegend = model.criteria
        .filter(item => item.label && item.label !== item.key)
        .map(item => `<span><strong>${checklistEscapeHtml(item.key)}</strong> ${checklistEscapeHtml(item.label)}</span>`)
        .join('');

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Checklist assistencial - ${checklistEscapeHtml(model.competence)}</title>
<style>
@page { size: A4 landscape; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #17304f; font-size: 10px; }
.header { background: #183d78; color: #fff; padding: 16px 18px; border-bottom: 4px solid #1498d4; }
.header .eyebrow { font-size: 9px; font-weight: 700; letter-spacing: .8px; color: #d9e7f5; text-transform: uppercase; }
.header h1 { margin: 4px 0 4px; font-size: 22px; }
.header p { margin: 0; color: #d9e7f5; font-size: 10px; }
.meta { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin: 12px 0; }
.meta > div { border: 1px solid #dbe3ec; padding: 8px 10px; }
.meta span { display: block; color: #66788f; font-size: 8px; text-transform: uppercase; font-weight: 700; }
.meta strong { display: block; margin-top: 3px; font-size: 11px; }
.summary { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 10px; }
.summary > div { border: 1px solid #dbe3ec; border-left: 4px solid #2455a4; padding: 8px 10px; }
.summary span { color: #66788f; font-size: 8px; text-transform: uppercase; font-weight: 700; }
.summary strong { display: block; font-size: 16px; margin-top: 3px; color: #183d78; }
.legend { margin: 8px 0 10px; padding: 7px 9px; border: 1px solid #dbe3ec; background: #f7f9fc; line-height: 1.5; }
.legend b.source { color: #2f7d50; }
.legend b.local { color: #246b45; }
.criteria { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-bottom: 10px; color: #56697e; }
.criteria span { font-size: 8px; }
.criteria strong { color: #183d78; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th { background: #eef3f8; color: #53677d; border: 1px solid #dbe3ec; padding: 6px 4px; font-size: 8px; text-transform: uppercase; }
td { border: 1px solid #e4e9ef; padding: 5px 4px; font-size: 8px; text-align: center; vertical-align: middle; }
th:first-child, td.patient { width: 155px; text-align: left; }
th:nth-child(2) { width: 44px; }
th:nth-child(3) { width: 60px; }
th:nth-child(4) { width: 62px; }
th:nth-child(5) { width: 72px; }
td.patient strong, td.patient span { display: block; }
td.patient strong { font-size: 8px; color: #263f58; }
td.patient span { margin-top: 2px; color: #718195; font-size: 7px; }
td.mark { font-weight: 700; font-size: 11px; }
td.mark.source { background: #e8f5ec; color: #2f7d50; }
td.mark.local { background: #dff2e6; color: #246b45; }
.footer { margin-top: 9px; padding-top: 6px; border-top: 1px solid #dbe3ec; color: #7c8b9d; font-size: 7px; display: flex; justify-content: space-between; }
.print-actions { margin: 0 0 12px; display: flex; gap: 8px; }
.print-actions button { padding: 8px 12px; border: 1px solid #cbd6e1; background: #fff; color: #183d78; font-weight: 700; cursor: pointer; }
@media print { .print-actions { display: none !important; } tr { break-inside: avoid; } }
</style>
</head>
<body>
<div class="print-actions"><button onclick="window.print()">Imprimir</button></div>
<header class="header">
    <span class="eyebrow">Integra</span>
    <h1>Checklist assistencial</h1>
    <p>Sistema de produção isolada</p>
</header>
<section class="meta">
    <div><span>Competência</span><strong>${checklistEscapeHtml(model.competence)}</strong></div>
    <div><span>Grupo</span><strong>${checklistEscapeHtml(model.group)}</strong></div>
    <div><span>Equipe</span><strong>${checklistEscapeHtml(model.team)}</strong></div>
    <div><span>Indicador</span><strong>${checklistEscapeHtml(model.indicator)}</strong></div>
</section>
<section class="summary">
    <div><span>Pacientes</span><strong>${model.patients.length.toLocaleString('pt-BR')}</strong></div>
    <div><span>Marcações SIAPS</span><strong>${model.sourceMarks.toLocaleString('pt-BR')}</strong></div>
    <div><span>Marcações da equipe</span><strong>${model.localMarks.toLocaleString('pt-BR')}</strong></div>
</section>
<div class="legend"><strong>V</strong> = item marcado · <b class="source">Verde claro</b> = registrado no SIAPS · <b class="local">Verde</b> = marcado pela equipe.</div>
${criteriaLegend ? `<div class="criteria">${criteriaLegend}</div>` : ''}
<table>
<thead><tr>
    <th>Paciente</th><th>Sexo</th><th>Raça/cor</th><th>CNES</th><th>INE</th>${criterionHeaders}
</tr></thead>
<tbody>${rows}</tbody>
</table>
<footer class="footer">
    <span>Emitido em ${model.generatedAt.toLocaleString('pt-BR')}</span>
    <span>Integra · Checklist assistencial</span>
</footer>
</body>
</html>`;
}

async function imprimirChecklistAssistencial() {

    if (typeof isIntegraTauriDesktop === 'function' && isIntegraTauriDesktop()) {
        await baixarChecklistPDF();
        return;
    }

    try {
        const model = await buildChecklistExportModel();
        const printWindow = window.open('', '_blank', 'width=1300,height=850');

        if (!printWindow) {
            window.alert('O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.');
            return;
        }

        printWindow.document.open();
        printWindow.document.write(buildPrintableChecklistHtml(model));
        printWindow.document.close();
        printWindow.focus();

        window.setTimeout(() => {
            printWindow.print();
        }, 350);

    } catch (error) {
        console.error('Erro ao imprimir checklist:', error);
        window.alert(error.message || 'Não foi possível preparar a impressão do checklist.');
    }
}

function checklistPdfRgb(hex) {
    const value = String(hex || '#000000').replace('#', '');
    const r = parseInt(value.slice(0, 2), 16) / 255;
    const g = parseInt(value.slice(2, 4), 16) / 255;
    const b = parseInt(value.slice(4, 6), 16) / 255;
    return [r, g, b].map(n => n.toFixed(3)).join(' ');
}

function checklistPdfHex(text) {
    const normalized = String(text ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[–—]/g, '-')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'");

    let hex = '';

    for (let i = 0; i < normalized.length; i++) {
        let code = normalized.charCodeAt(i);
        if (code > 255) code = 63;
        hex += code.toString(16).padStart(2, '0').toUpperCase();
    }

    return `<${hex}>`;
}

function checklistPdfText(page, text, x, y, size = 8, options = {}) {
    const font = options.bold ? 'F2' : 'F1';
    const color = checklistPdfRgb(options.color || '#17304f');
    page.push(`BT /${font} ${size} Tf ${color} rg ${x.toFixed(2)} ${(595.28 - y).toFixed(2)} Td ${checklistPdfHex(text)} Tj ET`);
}

function checklistPdfRect(page, x, y, width, height, options = {}) {
    const commands = [];
    if (options.fill) commands.push(`${checklistPdfRgb(options.fill)} rg`);
    if (options.stroke) commands.push(`${checklistPdfRgb(options.stroke)} RG`);
    commands.push(`${Number(options.lineWidth || 0.6)} w`);
    const mode = options.fill && options.stroke ? 'B' : options.fill ? 'f' : 'S';
    commands.push(`${x.toFixed(2)} ${(595.28 - y - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${mode}`);
    page.push(commands.join(' '));
}

function checklistPdfLine(page, x1, y1, x2, y2, color = '#dbe3ec', width = 0.6) {
    page.push(`${checklistPdfRgb(color)} RG ${width} w ${x1.toFixed(2)} ${(595.28 - y1).toFixed(2)} m ${x2.toFixed(2)} ${(595.28 - y2).toFixed(2)} l S`);
}

function checklistPdfFit(value, maxChars) {
    const text = String(value ?? '');
    return text.length <= maxChars
        ? text
        : `${text.slice(0, Math.max(1, maxChars - 3))}...`;
}

function buildChecklistPdfPages(model) {

    const pages = [];
    const pageWidth = 841.89;
    const margin = 28;
    const tableWidth = pageWidth - (margin * 2);
    const fixedWidths = [150, 42, 58, 60, 72];
    const fixedTotal = fixedWidths.reduce((sum, value) => sum + value, 0);
    const criterionWidth = model.criteria.length
        ? Math.max(28, (tableWidth - fixedTotal) / model.criteria.length)
        : 0;
    const widths = [...fixedWidths, ...model.criteria.map(() => criterionWidth)];
    const rowHeight = 25;
    const tableHeaderY = 151;
    const rowsPerPage = 14;

    const chunks = [];

    for (let i = 0; i < model.patients.length; i += rowsPerPage) {
        chunks.push(model.patients.slice(i, i + rowsPerPage));
    }

    if (!chunks.length) {
        chunks.push([]);
    }

    chunks.forEach((patients, pageIndex) => {
        const page = [];

        checklistPdfRect(page, 0, 0, pageWidth, 78, { fill: '#183d78' });
        checklistPdfRect(page, 0, 74, pageWidth, 4, { fill: '#1498d4' });

        checklistPdfText(page, 'INTEGRA', margin, 26, 8, { bold: true, color: '#d8e7f7' });
        checklistPdfText(page, 'Checklist assistencial', margin, 48, 18, { bold: true, color: '#ffffff' });
        checklistPdfText(page, 'Integra', 650, 33, 9, { bold: true, color: '#ffffff' });
        checklistPdfText(page, model.competence, 650, 51, 8, { color: '#d8e7f7' });

        if (pageIndex === 0) {
            checklistPdfText(page, 'Indicador', margin, 98, 7, { bold: true, color: '#66788f' });
            checklistPdfText(page, checklistPdfFit(model.indicator, 52), margin, 114, 10, { bold: true, color: '#183d78' });
            checklistPdfText(page, `Equipe: ${checklistPdfFit(model.team, 34)}`, 350, 98, 8, { color: '#53677d' });
            checklistPdfText(page, `Pacientes: ${model.patients.length}`, 350, 114, 8, { bold: true, color: '#183d78' });
            checklistPdfText(page, `SIAPS: ${model.sourceMarks}  |  Equipe: ${model.localMarks}`, 500, 114, 8, { bold: true, color: '#183d78' });
            checklistPdfText(page, 'V = item marcado   Verde claro = SIAPS   Verde = Equipe', margin, 134, 7, { color: '#66788f' });
        } else {
            checklistPdfText(page, checklistPdfFit(`${model.indicator} - ${model.team}`, 80), margin, 105, 9, { bold: true, color: '#183d78' });
            checklistPdfText(page, 'V = item marcado   Verde claro = SIAPS   Verde = Equipe', margin, 126, 7, { color: '#66788f' });
        }

        let x = margin;
        const headers = ['Paciente', 'Sexo', 'Raca/cor', 'CNES', 'INE', ...model.criteria.map(item => item.key)];

        headers.forEach((header, index) => {
            const width = widths[index];
            checklistPdfRect(page, x, tableHeaderY, width, 24, { fill: '#eef3f8', stroke: '#dbe3ec', lineWidth: 0.5 });
            checklistPdfText(page, checklistPdfFit(header, index === 0 ? 22 : index >= 5 ? 11 : 10), x + 4, tableHeaderY + 15, 6.6, { bold: true, color: '#53677d' });
            x += width;
        });

        let y = tableHeaderY + 24;

        patients.forEach(patient => {
            x = margin;

            const values = [
                `CPF ${patient.cpf}`,
                patient.sex,
                patient.race,
                patient.cnes,
                patient.ine,
                ...patient.marks.map(mark => mark.value || '-')
            ];

            values.forEach((value, index) => {
                const width = widths[index];
                let fill = '#ffffff';
                let color = '#56697e';

                if (index >= 5) {
                    const mark = patient.marks[index - 5];
                    if (mark?.source) {
                        fill = '#e8f5ec';
                        color = '#2f7d50';
                    }
                    if (mark?.local) {
                        fill = '#dff2e6';
                        color = '#246b45';
                    }
                }

                checklistPdfRect(page, x, y, width, rowHeight, { fill, stroke: '#e4e9ef', lineWidth: 0.45 });
                checklistPdfText(
                    page,
                    checklistPdfFit(value, index === 0 ? 25 : index >= 5 ? 2 : 10),
                    x + (index >= 5 ? Math.max(4, width / 2 - 2) : 4),
                    y + 15,
                    index >= 5 ? 7.5 : 6.5,
                    { bold: index === 0 || index >= 5, color }
                );
                x += width;
            });

            checklistPdfText(
                page,
                checklistPdfFit(`CNS ${patient.cns} | Nasc. ${patient.birth}`, 34),
                margin + 4,
                y + 23,
                5.2,
                { color: '#8a98a8' }
            );

            y += rowHeight;
        });

        checklistPdfLine(page, margin, 565, pageWidth - margin, 565, '#dbe3ec', 0.5);
        checklistPdfText(page, `Emitido em ${model.generatedAt.toLocaleString('pt-BR')}`, margin, 581, 6, { color: '#7e8da0' });
        checklistPdfText(page, `Pagina ${pageIndex + 1} de ${chunks.length}`, 748, 581, 6, { color: '#7e8da0' });

        pages.push(page);
    });

    return pages;
}

function buildChecklistPdfBinary(pages) {

    const objects = [];
    const addObject = content => {
        objects.push(content);
        return objects.length;
    };

    const catalog = addObject('');
    const pagesObject = addObject('');
    const regularFont = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const boldFont = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pageObjects = [];

    pages.forEach(page => {
        const stream = page.join('\n');
        const contentObject = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
        const pageObject = addObject(`<< /Type /Page /Parent ${pagesObject} 0 R /MediaBox [0 0 841.89 595.28] /Resources << /Font << /F1 ${regularFont} 0 R /F2 ${boldFont} 0 R >> >> /Contents ${contentObject} 0 R >>`);
        pageObjects.push(pageObject);
    });

    objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObject} 0 R >>`;
    objects[pagesObject - 1] = `<< /Type /Pages /Kids [${pageObjects.map(n => `${n} 0 R`).join(' ')}] /Count ${pageObjects.length} >>`;

    const encoder = new TextEncoder();
    const parts = [];
    const offsets = [0];
    const header = '%PDF-1.4\n%SIAPS-CHECKLIST\n';

    parts.push(header);

    let byteLength = encoder.encode(header).length;

    objects.forEach((object, index) => {
        offsets[index + 1] = byteLength;
        const block = `${index + 1} 0 obj\n${object}\nendobj\n`;
        parts.push(block);
        byteLength += encoder.encode(block).length;
    });

    const xrefOffset = byteLength;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

    for (let index = 1; index <= objects.length; index++) {
        xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }

    parts.push(xref);
    parts.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    return encoder.encode(parts.join(''));
}

function buildChecklistPdfFileName(model) {
    const safePeriod = String(model.competence || 'competencia')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    return `Checklist_SIAPS_${safePeriod || 'competencia'}.pdf`;
}

async function baixarChecklistPDF() {

    try {
        const model = await buildChecklistExportModel();
        const pages = buildChecklistPdfPages(model);
        const bytes = buildChecklistPdfBinary(pages);

        await saveIntegraFile({
            title: 'Salvar checklist em PDF',
            fileName: buildChecklistPdfFileName(model),
            extension: 'pdf',
            mimeType: 'application/pdf',
            bytes
        });

    } catch (error) {
        console.error('Erro ao gerar PDF do checklist:', error);
        window.alert(error.message || 'Não foi possível salvar o PDF do checklist.');
    }
}
