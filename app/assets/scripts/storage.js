/**
 * =========================================================
 * STORAGE.JS
 * =========================================================
 *
 * Histórico local das planilhas SIAPS.
 *
 * - usa IndexedDB;
 * - guarda o arquivo XLSX original;
 * - guarda metadados e registros do relatório direto do portal;
 * - permite reabrir uma competência salva;
 * - permite consolidar várias competências do mesmo grupo;
 * - deduplica pessoas por CPF e, em seguida, por CNS;
 * - quando ambos faltam, mantém o registro isolado para evitar
 *   unir pessoas diferentes por engano.
 *
 * Nenhum dado é enviado para servidor.
 */

const SIAPS_HISTORY_DB_LEGACY = 'siaps_local_history';
const SIAPS_HISTORY_DB_PREFIX = 'siaps_local_history__';
const SIAPS_HISTORY_VERSION = 2;
const SIAPS_HISTORY_STORE = 'imports';
const SIAPS_HISTORY_PEOPLE_STORE = 'people';

let siapsHistoryDbPromise = null;
let siapsHistoryDbNamespace = '';


function getSiapsStorageUsername() {

    const username =
        typeof getAuthenticatedUsername === 'function'
            ? getAuthenticatedUsername()
            : '';

    return String(username || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'semusuario';
}


function getSiapsHistoryDatabaseName() {

    const username = getSiapsStorageUsername();

    // Preserva o histórico já existente do acesso administrador.
    if (username === 'administrador') {
        return SIAPS_HISTORY_DB_LEGACY;
    }

    return `${SIAPS_HISTORY_DB_PREFIX}${username}`;
}


function closeSiapsHistoryDBForUserSwitch() {

    if (siapsHistoryDbPromise) {
        siapsHistoryDbPromise
            .then(db => db?.close?.())
            .catch(() => {});
    }

    siapsHistoryDbPromise = null;
    siapsHistoryDbNamespace = '';
}


function openSiapsHistoryDB() {

    if (!('indexedDB' in window)) {
        return Promise.reject(
            new Error('IndexedDB não está disponível neste navegador.')
        );
    }

    const databaseName = getSiapsHistoryDatabaseName();

    if (
        siapsHistoryDbPromise &&
        siapsHistoryDbNamespace === databaseName
    ) {
        return siapsHistoryDbPromise;
    }

    if (
        siapsHistoryDbPromise &&
        siapsHistoryDbNamespace !== databaseName
    ) {
        closeSiapsHistoryDBForUserSwitch();
    }

    siapsHistoryDbNamespace = databaseName;

    siapsHistoryDbPromise = new Promise((resolve, reject) => {

        const request = indexedDB.open(
            databaseName,
            SIAPS_HISTORY_VERSION
        );

        request.onupgradeneeded = event => {

            const db = event.target.result;

            if (!db.objectStoreNames.contains(SIAPS_HISTORY_STORE)) {

                const store = db.createObjectStore(
                    SIAPS_HISTORY_STORE,
                    { keyPath: 'id' }
                );

                store.createIndex('competenceKey', 'competenceKey', { unique: false });
                store.createIndex('category', 'category', { unique: false });
                store.createIndex('teamKey', 'teamKey', { unique: false });
                store.createIndex('importedAt', 'importedAt', { unique: false });
            }

            if (!db.objectStoreNames.contains(SIAPS_HISTORY_PEOPLE_STORE)) {

                const peopleStore = db.createObjectStore(
                    SIAPS_HISTORY_PEOPLE_STORE,
                    { keyPath: 'personKey' }
                );

                peopleStore.createIndex('cpf', 'cpf', { unique: false });
                peopleStore.createIndex('cns', 'cns', { unique: false });
                peopleStore.createIndex('lastSeenCompetence', 'lastSeenCompetence', { unique: false });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => db.close();
            resolve(db);
        };

        request.onerror = () => {
            siapsHistoryDbPromise = null;
            reject(
                request.error || new Error('Não foi possível abrir o histórico local.')
            );
        };

        request.onblocked = () => reject(
            new Error('O banco local está bloqueado por outra aba do navegador.')
        );
    });

    return siapsHistoryDbPromise;
}


function historyRequestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(
            request.error || new Error('Falha ao acessar o histórico local.')
        );
    });
}


async function historyGetAll() {

    const db = await openSiapsHistoryDB();
    const tx = db.transaction(SIAPS_HISTORY_STORE, 'readonly');
    const store = tx.objectStore(SIAPS_HISTORY_STORE);
    const records = await historyRequestToPromise(store.getAll());

    return Array.isArray(records) ? records : [];
}


async function historyGet(id) {

    const db = await openSiapsHistoryDB();
    const tx = db.transaction(SIAPS_HISTORY_STORE, 'readonly');
    const store = tx.objectStore(SIAPS_HISTORY_STORE);

    return historyRequestToPromise(store.get(id));
}


async function historyPut(record) {

    const db = await openSiapsHistoryDB();
    const tx = db.transaction(SIAPS_HISTORY_STORE, 'readwrite');
    const store = tx.objectStore(SIAPS_HISTORY_STORE);

    await historyRequestToPromise(store.put(record));

    return record;
}


async function historyDelete(id) {

    const db = await openSiapsHistoryDB();
    const tx = db.transaction(SIAPS_HISTORY_STORE, 'readwrite');
    const store = tx.objectStore(SIAPS_HISTORY_STORE);

    await historyRequestToPromise(store.delete(id));
}


async function historyPeopleGetAll() {

    const db = await openSiapsHistoryDB();
    const tx = db.transaction(SIAPS_HISTORY_PEOPLE_STORE, 'readonly');
    const store = tx.objectStore(SIAPS_HISTORY_PEOPLE_STORE);
    const records = await historyRequestToPromise(store.getAll());

    return Array.isArray(records) ? records : [];
}


async function historyPersonPut(record) {

    const db = await openSiapsHistoryDB();
    const tx = db.transaction(SIAPS_HISTORY_PEOPLE_STORE, 'readwrite');
    const store = tx.objectStore(SIAPS_HISTORY_PEOPLE_STORE);

    await historyRequestToPromise(store.put(record));

    return record;
}


async function historyPeopleClear() {

    const db = await openSiapsHistoryDB();
    const tx = db.transaction(SIAPS_HISTORY_PEOPLE_STORE, 'readwrite');
    const store = tx.objectStore(SIAPS_HISTORY_PEOPLE_STORE);

    await historyRequestToPromise(store.clear());
}


function getHistoryPersonIdentity(row) {

    const cpf = onlyDigitsStr(getField(row, 'CPF'));
    const cns = onlyDigitsStr(getField(row, 'CNS'));

    return {
        cpf,
        cns,
        personKey: cpf
            ? `cpf:${cpf}`
            : cns
                ? `cns:${cns}`
                : ''
    };
}


function getHistoryDisplayName(row) {

    const possibleFields = [
        'Nome',
        'NOME',
        'Nome do cidadão',
        'Nome do cidadao',
        'Cidadão',
        'Cidadao'
    ];

    for (const field of possibleFields) {
        const value = String(getField(row, field) || '').trim();
        if (value) {
            return value;
        }
    }

    return '';
}


async function registerHistoryPeople(records, metadata = {}) {

    const people = await historyPeopleGetAll();
    const byCpf = new Map();
    const byCns = new Map();

    people.forEach(person => {
        if (person.cpf) {
            byCpf.set(person.cpf, person);
        }
        if (person.cns) {
            byCns.set(person.cns, person);
        }
    });

    let newPeople = 0;
    let existingPeople = 0;
    let withoutIdentifier = 0;
    const preparedRows = [];

    for (const sourceRow of records || []) {

        const row = sanitizeHistoryObject(sourceRow);
        const identity = getHistoryPersonIdentity(row);

        if (!identity.personKey) {
            withoutIdentifier += 1;
            preparedRows.push(row);
            continue;
        }

        let person = null;

        if (identity.cpf && byCpf.has(identity.cpf)) {
            person = byCpf.get(identity.cpf);
        } else if (identity.cns && byCns.has(identity.cns)) {
            person = byCns.get(identity.cns);
        }

        if (person) {
            existingPeople += 1;

            person = {
                ...person,
                cpf: identity.cpf || person.cpf || '',
                cns: identity.cns || person.cns || '',
                nome: getHistoryDisplayName(row) || person.nome || '',
                lastSeenCompetence: metadata.competenceKey || person.lastSeenCompetence || '',
                lastSeenAt: metadata.importedAt || new Date().toISOString(),
                lastCategory: metadata.category || person.lastCategory || '',
                lastTeamKey: metadata.teamKey || person.lastTeamKey || '',
                observations: Number(person.observations || 0) + 1
            };
        } else {
            newPeople += 1;

            person = {
                personKey: identity.personKey,
                cpf: identity.cpf,
                cns: identity.cns,
                nome: getHistoryDisplayName(row),
                firstSeenCompetence: metadata.competenceKey || '',
                lastSeenCompetence: metadata.competenceKey || '',
                firstSeenAt: metadata.importedAt || new Date().toISOString(),
                lastSeenAt: metadata.importedAt || new Date().toISOString(),
                lastCategory: metadata.category || '',
                lastTeamKey: metadata.teamKey || '',
                observations: 1
            };
        }

        await historyPersonPut(person);

        if (person.cpf) {
            byCpf.set(person.cpf, person);
        }
        if (person.cns) {
            byCns.set(person.cns, person);
        }

        row.__siapsPersonKey = person.personKey;
        preparedRows.push(row);
    }

    return {
        records: preparedRows,
        newPeople,
        existingPeople,
        withoutIdentifier
    };
}


async function findSameCompetenceIdentityConflicts({
    records,
    category,
    competenceKey,
    excludeId = ''
}) {

    if (!category || !competenceKey) {
        return [];
    }

    const imports = await historyGetAll();
    const existingKeys = new Map();

    imports
        .filter(item =>
            item.id !== excludeId &&
            item.sourceType === 'portal-siaps' &&
            item.category === category &&
            item.competenceKey === competenceKey
        )
        .forEach(item => {
            (item.records || []).forEach(row => {
                const identity = getHistoryPersonIdentity(row);
                if (identity.personKey) {
                    existingKeys.set(identity.personKey, item);
                }
            });
        });

    const conflicts = [];
    const seen = new Set();

    (records || []).forEach(row => {
        const identity = getHistoryPersonIdentity(row);
        if (!identity.personKey || !existingKeys.has(identity.personKey) || seen.has(identity.personKey)) {
            return;
        }

        seen.add(identity.personKey);
        const source = existingKeys.get(identity.personKey);

        conflicts.push({
            personKey: identity.personKey,
            cpf: identity.cpf,
            cns: identity.cns,
            sourceId: source.id,
            sourceFileName: source.fileName,
            sourceTeamLabel: source.teamLabel || ''
        });
    });

    return conflicts;
}


async function rebuildHistoryPeopleRegistry() {

    await historyPeopleClear();

    const imports = await historyGetAll();
    const ordered = [...imports].sort((a, b) =>
        String(a.competenceKey || '').localeCompare(String(b.competenceKey || '')) ||
        String(a.importedAt || '').localeCompare(String(b.importedAt || ''))
    );

    for (const item of ordered) {
        if (item.sourceType !== 'portal-siaps') {
            continue;
        }

        await registerHistoryPeople(item.records || [], {
            competenceKey: item.competenceKey,
            importedAt: item.importedAt,
            category: item.category,
            teamKey: item.teamKey
        });
    }
}


function normalizeHistoryCompetence(value) {

    const text = String(value || '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    if (!text) {
        return '';
    }

    const monthMap = {
        JAN: 1,
        FEV: 2,
        MAR: 3,
        ABR: 4,
        MAI: 5,
        JUN: 6,
        JUL: 7,
        AGO: 8,
        SET: 9,
        OUT: 10,
        NOV: 11,
        DEZ: 12
    };

    let match = text.match(/\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s*[\/\-]\s*(\d{2,4})\b/);

    if (match) {
        const month = monthMap[match[1]];
        let year = Number(match[2]);
        if (year < 100) {
            year += 2000;
        }
        return `${year}-${String(month).padStart(2, '0')}`;
    }

    match = text.match(/\b(\d{1,2})\s*[\/\-]\s*(\d{2,4})\b/);

    if (match) {
        const month = Number(match[1]);
        let year = Number(match[2]);
        if (year < 100) {
            year += 2000;
        }
        if (month >= 1 && month <= 12) {
            return `${year}-${String(month).padStart(2, '0')}`;
        }
    }

    match = text.match(/\b(20\d{2})[\-\/](\d{1,2})\b/);

    if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        if (month >= 1 && month <= 12) {
            return `${year}-${String(month).padStart(2, '0')}`;
        }
    }

    return '';
}


function formatHistoryCompetence(competenceKey, fallback = '') {

    const match = String(competenceKey || '').match(/^(\d{4})-(\d{2})$/);

    if (!match) {
        return fallback || 'Sem competência';
    }

    const months = [
        'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
        'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
    ];

    const month = Number(match[2]);
    const year = match[1].slice(-2);

    return `${months[month - 1]}/${year}`;
}


function historyCategoryLabel(category) {

    const labels = {
        crianca: 'Crianças',
        gestante: 'Gestantes',
        diabetes: 'Diabetes',
        hipertenso: 'Hipertensão',
        idoso: 'Idosos',
        mulher: 'Mulheres'
    };

    return labels[category] || category || 'Base SIAPS';
}


function getHistoryTeamFromPortal(portalReport) {

    const metadataTeam = String(portalReport?.equipe || '').trim();

    if (metadataTeam) {
        return metadataTeam;
    }

    for (const row of portalReport?.records || []) {
        const ine = onlyDigitsStr(getField(row, 'INE'));
        if (ine) {
            return ine;
        }
    }

    return '';
}


function makeHistoryRecordId({ ibge, category, competenceKey, teamKey, importedAt }) {

    if (category && competenceKey) {
        return [
            normalizeDigits(ibge || CONFIG.ibge),
            category,
            competenceKey,
            teamKey || 'todas'
        ].join('|');
    }

    return [
        normalizeDigits(ibge || CONFIG.ibge),
        'consolidado',
        importedAt || new Date().toISOString()
    ].join('|');
}


function sanitizeHistoryObject(value) {

    if (value === null || value === undefined) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(sanitizeHistoryObject);
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'object') {
        const result = {};
        Object.entries(value).forEach(([key, item]) => {
            result[String(key)] = sanitizeHistoryObject(item);
        });
        return result;
    }

    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return value;
    }

    return String(value);
}


async function persistProcessedImport({ file, arrayBuffer, processResult }) {

    if (!processResult?.ok) {
        return null;
    }

    const importedAt = new Date().toISOString();
    const portalReport = processResult.portalReport || null;

    let category = '';
    let teamLabel = '';
    let teamKey = '';
    let competenceKey = '';
    let competenceLabel = '';
    let records = [];
    let headers = [];
    let indicator = '';
    let dictionary = {};
    let goodPractices = [];

    if (portalReport) {

        const profile = getPortalIndicatorProfile(portalReport.indicador);

        category = profile?.category || '';
        teamLabel = getHistoryTeamFromPortal(portalReport);
        teamKey = onlyDigitsStr(teamLabel);
        competenceLabel = String(portalReport.competencia || '').trim();
        competenceKey = normalizeHistoryCompetence(competenceLabel);
        records = sanitizeHistoryObject(portalReport.records || []);
        headers = sanitizeHistoryObject(portalReport.headers || []);
        indicator = String(portalReport.indicador || '').trim();
        dictionary = sanitizeHistoryObject(portalReport.dictionary || {});

        goodPractices = Array.isArray(window._siapsPortalDetails?.practices)
            ? window._siapsPortalDetails.practices.map(item => ({
                key: item.key,
                label: item.label
            }))
            : [];
    }

    const id = makeHistoryRecordId({
        ibge: processResult.municipioInfo?.ibge || CONFIG.ibge,
        category,
        competenceKey,
        teamKey,
        importedAt
    });

    const existing = await historyGet(id);

    if (existing) {

        const label = formatHistoryCompetence(
            existing.competenceKey,
            existing.competenceLabel
        );

        const replace = window.confirm(
            `Já existe uma base salva para ${label}, ${historyCategoryLabel(existing.category)}${existing.teamLabel ? `, equipe ${existing.teamLabel}` : ''}.\n\nDeseja substituir a base armazenada por este novo arquivo?`
        );

        if (!replace) {
            setHistoryNotice(
                'info',
                'A planilha foi processada, mas o histórico existente não foi substituído.'
            );
            await renderSavedImports();
            return existing;
        }
    }

    let blockedSameCompetence = 0;

    if (portalReport && competenceKey && category) {

        const conflicts = await findSameCompetenceIdentityConflicts({
            records,
            category,
            competenceKey,
            excludeId: id
        });

        if (conflicts.length) {

            const blockedKeys = new Set(
                conflicts.map(item => item.personKey)
            );

            records = records.filter(row => {
                const identity = getHistoryPersonIdentity(row);
                return !identity.personKey || !blockedKeys.has(identity.personKey);
            });

            blockedSameCompetence = conflicts.length;

            if (!records.length) {
                setHistoryNotice(
                    'error',
                    `A importação foi bloqueada: todos os ${conflicts.length} registros identificados por CPF/CNS já existem em outra planilha salva para ${formatHistoryCompetence(competenceKey, competenceLabel)} e ${historyCategoryLabel(category)}.`
                );

                if (typeof setUploadStatus === 'function') {
                    setUploadStatus(
                        'error',
                        `Nenhum registro foi incluído. Os CPFs/CNS desta planilha já estão armazenados para a mesma competência.`
                    );
                }

                await renderSavedImports();
                return null;
            }

            /*
             * O parser já havia montado o painel com todos os registros.
             * Como alguns foram bloqueados por duplicidade dentro da mesma
             * competência, reconstruímos a visão em memória com apenas os
             * registros válidos que realmente serão salvos.
             */
            const sanitizedPortalReport = {
                ...portalReport,
                records
            };

            const adapted = buildInternalWorkbookFromPortalReport(
                sanitizedPortalReport
            );

            buildDataFromWorkbook(adapted.workbook);

            window._siapsPortalMeta = {
                ...(window._siapsPortalMeta || {}),
                indicador: sanitizedPortalReport.indicador,
                competencia: sanitizedPortalReport.competencia,
                equipe: sanitizedPortalReport.equipe,
                geradoEm: sanitizedPortalReport.geradoEm,
                registros: adapted.rowCount
            };

            window._siapsPortalDetails = adapted.details || null;
            window._siapsAvailableCategories = [category];
            window._siapsPartialImport = true;
            window._siapsLoaded = true;

            if (typeof updateLoadedDatabaseState === 'function') {
                updateLoadedDatabaseState();
            }

            if (typeof initDashboard === 'function') {
                initDashboard();
            }
        }
    }

    let peopleStats = {
        newPeople: 0,
        existingPeople: 0,
        withoutIdentifier: 0
    };

    if (portalReport) {
        const registered = await registerHistoryPeople(records, {
            competenceKey,
            importedAt,
            category,
            teamKey
        });

        records = registered.records;
        peopleStats = registered;
    }

    const fileBytes = arrayBuffer
        ? arrayBuffer.slice(0)
        : null;

    const record = {
        id,
        schemaVersion: 2,
        sourceType: portalReport ? 'portal-siaps' : 'consolidated',
        importedAt,
        fileName: String(file?.name || window._siapsSource?.name || 'planilha.xlsx'),
        fileSize: Number(file?.size || fileBytes?.byteLength || 0),
        fileLastModified: Number(file?.lastModified || 0),
        mimeType: String(file?.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        fileBytes,
        uf: String(processResult.municipioInfo?.estado || CONFIG.uf || ''),
        municipio: String(processResult.municipioInfo?.municipio || CONFIG.municipio || ''),
        ibge: String(processResult.municipioInfo?.ibge || CONFIG.ibge || ''),
        category,
        indicator,
        competenceKey,
        competenceLabel,
        teamKey,
        teamLabel,
        rowCount: records.length || Number(window._siapsPortalMeta?.registros || 0),
        headers,
        dictionary,
        records,
        goodPractices,
        deduplication: portalReport
            ? {
                sourceRows: Number(portalReport.sourceRowCount || records.length),
                duplicatesInFile: Number(portalReport.duplicatesSkipped || 0),
                blockedSameCompetence,
                newPeople: Number(peopleStats.newPeople || 0),
                existingPeople: Number(peopleStats.existingPeople || 0),
                withoutIdentifier: Number(peopleStats.withoutIdentifier || 0)
            }
            : null,
        portalMeta: portalReport
            ? {
                sheetName: portalReport.sheetName || '',
                visualizacao: portalReport.visualizacao || '',
                geradoEm: portalReport.geradoEm || ''
            }
            : null
    };

    await historyPut(record);

    if (portalReport) {
        await rebuildHistoryPeopleRegistry();
    }

    window._siapsActiveHistoryIds = [record.id];
    window._siapsHistoryMode = false;
    window._siapsHistoryPeriodLabel = competenceKey
        ? formatHistoryCompetence(competenceKey, competenceLabel)
        : '';

    const dedupMessages = [];

    if (Number(portalReport?.duplicatesSkipped || 0) > 0) {
        dedupMessages.push(
            `${portalReport.duplicatesSkipped} ${portalReport.duplicatesSkipped === 1 ? 'linha duplicada na própria planilha foi ignorada' : 'linhas duplicadas na própria planilha foram ignoradas'}`
        );
    }

    if (blockedSameCompetence > 0) {
        dedupMessages.push(
            `${blockedSameCompetence} ${blockedSameCompetence === 1 ? 'registro já existente na mesma competência foi bloqueado' : 'registros já existentes na mesma competência foram bloqueados'}`
        );
    }

    if (peopleStats.existingPeople > 0) {
        dedupMessages.push(
            `${peopleStats.existingPeople} ${peopleStats.existingPeople === 1 ? 'pessoa já existente foi vinculada à nova competência sem duplicar o cadastro' : 'pessoas já existentes foram vinculadas à nova competência sem duplicar os cadastros'}`
        );
    }

    const historyMessage = competenceKey
        ? `${formatHistoryCompetence(competenceKey, competenceLabel)} foi salva no histórico local.`
        : 'A planilha foi salva no histórico local.';

    setHistoryNotice(
        'success',
        dedupMessages.length
            ? `${historyMessage} ${dedupMessages.join(' · ')}.`
            : historyMessage
    );

    await renderSavedImports();

    return record;
}


function historyPatientKey(row, index, teamKey, sourceId) {

    const storedPersonKey = String(row?.__siapsPersonKey || '').trim();
    if (storedPersonKey) {
        return storedPersonKey;
    }

    const cpf = onlyDigitsStr(getField(row, 'CPF'));
    if (cpf) {
        return `cpf:${cpf}`;
    }

    const cns = onlyDigitsStr(getField(row, 'CNS'));
    if (cns) {
        return `cns:${cns}`;
    }

    const birth = String(getField(row, 'Nascimento') || '').trim();
    const ine = onlyDigitsStr(getField(row, 'INE')) || teamKey || '';

    /*
     * Sem CPF/CNS não existe uma chave segura para reconhecer
     * a mesma pessoa em competências diferentes. Mantemos o
     * registro separado para não gerar uma deduplicação falsa.
     */
    return `aux:${sourceId || 'origem'}:${ine}:${birth}:${index}`;
}


function buildHistoryPeriodLabel(records) {

    const periods = [...new Set(
        records
            .map(record => record.competenceKey)
            .filter(Boolean)
    )].sort();

    if (!periods.length) {
        return 'Período selecionado';
    }

    if (periods.length === 1) {
        return formatHistoryCompetence(periods[0]);
    }

    return `${formatHistoryCompetence(periods[0])} a ${formatHistoryCompetence(periods[periods.length - 1])}`;
}


function consolidatePortalHistoryRecords(imports) {

    const ordered = [...imports].sort((a, b) =>
        String(a.competenceKey || '').localeCompare(String(b.competenceKey || '')) ||
        String(a.importedAt || '').localeCompare(String(b.importedAt || ''))
    );

    const latestByPerson = new Map();

    ordered.forEach(importRecord => {
        (importRecord.records || []).forEach((row, index) => {
            const key = historyPatientKey(row, index, importRecord.teamKey, importRecord.id);
            latestByPerson.set(key, {
                row: sanitizeHistoryObject(row),
                competenceKey: importRecord.competenceKey,
                sourceId: importRecord.id
            });
        });
    });

    return [...latestByPerson.values()].map(item => item.row);
}


async function activateHistoryImports(ids, options = {}) {

    const cleanIds = [...new Set((ids || []).filter(Boolean))];

    if (!cleanIds.length) {
        throw new Error('Selecione pelo menos uma competência para apresentar.');
    }

    const imports = (
        await Promise.all(cleanIds.map(historyGet))
    ).filter(Boolean);

    if (!imports.length) {
        throw new Error('As bases selecionadas não foram encontradas no histórico local.');
    }

    const portalImports = imports.filter(item => item.sourceType === 'portal-siaps');

    if (portalImports.length !== imports.length) {
        throw new Error('A consolidação por competência está disponível para listas nominais baixadas diretamente do portal SIAPS.');
    }

    const categories = [...new Set(portalImports.map(item => item.category).filter(Boolean))];

    if (categories.length !== 1) {
        throw new Error('Selecione competências de um único grupo por vez.');
    }

    const category = categories[0];
    const latest = [...portalImports].sort((a, b) =>
        String(b.competenceKey || '').localeCompare(String(a.competenceKey || '')) ||
        String(b.importedAt || '').localeCompare(String(a.importedAt || ''))
    )[0];

    const mergedRecords = consolidatePortalHistoryRecords(portalImports);
    const periodLabel = buildHistoryPeriodLabel(portalImports);
    const teamLabels = [...new Set(portalImports.map(item => item.teamLabel).filter(Boolean))];

    const portalReport = {
        sourceType: 'portal-siaps-history',
        sheetName: latest.portalMeta?.sheetName || 'Relatório - SIAPS',
        uf: latest.uf || CONFIG.uf,
        municipio: latest.municipio || CONFIG.municipio,
        ibge: latest.ibge || CONFIG.ibge,
        competencia: periodLabel,
        indicador: latest.indicator,
        equipe: teamLabels.length === 1
            ? teamLabels[0]
            : 'Múltiplas equipes',
        visualizacao: latest.portalMeta?.visualizacao || '',
        geradoEm: latest.portalMeta?.geradoEm || '',
        headers: latest.headers || [],
        dictionary: latest.dictionary || {},
        records: mergedRecords
    };

    const profile = getPortalIndicatorProfile(portalReport.indicador);

    if (!profile) {
        throw new Error(`O grupo ${historyCategoryLabel(category)} ainda não possui mapeamento para consolidação.`);
    }

    const adapted = buildInternalWorkbookFromPortalReport(portalReport);

    buildDataFromWorkbook(adapted.workbook);

    window._siapsLoaded = true;
    window._siapsPortalMeta = {
        indicador: portalReport.indicador,
        competencia: periodLabel,
        equipe: portalReport.equipe,
        geradoEm: portalReport.geradoEm,
        registros: adapted.rowCount,
        historico: true,
        competenciasSelecionadas: [...new Set(portalImports.map(item => item.competenceKey))].sort()
    };
    window._siapsPortalDetails = adapted.details || null;
    window._siapsAvailableCategories = [profile.category];
    window._siapsPartialImport = true;
    window._siapsActiveHistoryIds = portalImports.map(item => item.id);
    window._siapsHistoryMode = portalImports.length > 1;
    window._siapsHistoryPeriodLabel = periodLabel;
    window._siapsSource = {
        name: portalImports.length === 1
            ? portalImports[0].fileName
            : `Período consolidado · ${periodLabel}`,
        size: portalImports.reduce((sum, item) => sum + Number(item.fileSize || 0), 0),
        lastModified: 0,
        importedAt: new Date().toISOString(),
        historyIds: portalImports.map(item => item.id)
    };

    sINE = 'all';
    aC = null;
    aM = 'gp';
    aGP = null;
    biChildActiveCriterion = null;

    updateLoadedDatabaseState();

    const title = document.getElementById('dataSourceTitle');
    const description = document.getElementById('dataSourceDescription');

    if (title) {
        title.textContent = portalImports.length > 1
            ? `Período consolidado · ${periodLabel}`
            : `Base histórica · ${periodLabel}`;
    }

    if (description) {
        description.textContent = portalImports.length > 1
            ? `${formatNumber(adapted.rowCount)} pessoas únicas após consolidação das competências selecionadas.`
            : `${formatNumber(adapted.rowCount)} registros carregados do histórico local.`;
    }

    if (typeof initDashboard === 'function') {
        initDashboard();
    }

    if (typeof renderSavedImports === 'function') {
        await renderSavedImports();
    }

    if (options.navigate !== false && typeof showSection === 'function') {
        showSection(options.section || 'bi');
    } else if (typeof renderBI === 'function') {
        renderBI();
    }

    return {
        imports: portalImports,
        uniquePatients: adapted.rowCount,
        periodLabel
    };
}


async function getHistoryPeriodsForCategory(category) {

    const records = await historyGetAll();
    const grouped = new Map();

    records
        .filter(item =>
            item.sourceType === 'portal-siaps' &&
            item.category === category &&
            item.competenceKey
        )
        .forEach(item => {
            if (!grouped.has(item.competenceKey)) {
                grouped.set(item.competenceKey, {
                    key: item.competenceKey,
                    label: formatHistoryCompetence(item.competenceKey, item.competenceLabel),
                    ids: [],
                    files: 0,
                    records: 0
                });
            }

            const group = grouped.get(item.competenceKey);
            group.ids.push(item.id);
            group.files += 1;
            group.records += Number(item.rowCount || 0);
        });

    return [...grouped.values()].sort((a, b) =>
        String(a.key).localeCompare(String(b.key))
    );
}


async function applyHistoryPeriods(category, periodKeys) {

    const periods = await getHistoryPeriodsForCategory(category);
    const selected = new Set(periodKeys || []);
    const ids = periods
        .filter(period => selected.has(period.key))
        .flatMap(period => period.ids);

    return activateHistoryImports(ids, { navigate: true, section: 'bi' });
}


function setHistoryNotice(type, message) {

    const element = document.getElementById('historyNotice');

    if (!element) {
        return;
    }

    element.className = `history-notice is-visible history-notice--${type}`;
    element.textContent = String(message || '');
}


async function renderSavedImports() {

    const container = document.getElementById('savedImportsList');
    const summary = document.getElementById('savedImportsSummary');

    if (!container) {
        return;
    }

    try {
        // Mantém os meses abertos quando uma planilha é excluída ou reimportada.
        const expandedMonths = new Set(
            [...container.querySelectorAll('details[data-history-period][open]')]
                .map(element => element.dataset.historyPeriod)
        );
        const records = await historyGetAll();
        const people = await historyPeopleGetAll();

        const ordered = [...records].sort((a, b) =>
            String(b.competenceKey || '').localeCompare(String(a.competenceKey || '')) ||
            String(b.importedAt || '').localeCompare(String(a.importedAt || ''))
        );

        const periods = new Map();
        ordered.forEach(record => {
            const key = record.competenceKey || '__sem_competencia__';
            if (!periods.has(key)) {
                periods.set(key, {
                    key,
                    label: record.competenceKey
                        ? formatHistoryCompetence(record.competenceKey, record.competenceLabel)
                        : 'Sem competência identificada',
                    records: []
                });
            }
            periods.get(key).records.push(record);
        });

        if (summary) {
            summary.textContent = ordered.length
                ? `${periods.size} ${periods.size === 1 ? 'competência' : 'competências'} · ${ordered.length} ${ordered.length === 1 ? 'planilha' : 'planilhas'} · ${people.length} ${people.length === 1 ? 'pessoa única' : 'pessoas únicas'}`
                : 'Nenhuma base armazenada neste navegador';
        }

        if (!ordered.length) {
            container.innerHTML = `
                <div class="history-empty">
                    <strong>Nenhuma competência salva</strong>
                    <span>As próximas planilhas importadas poderão ser reutilizadas sem selecionar o arquivo novamente.</span>
                </div>
            `;
            return;
        }

        const renderRecord = record => {

            const active = Array.isArray(window._siapsActiveHistoryIds)
                && window._siapsActiveHistoryIds.includes(record.id);

            return `
                <article class="history-item${active ? ' is-active' : ''}" data-history-id="${escapeAttribute(record.id)}">
                    <div class="history-item__main">
                        <div class="history-item__badges">
                            <span class="history-badge">${escapeBI(historyCategoryLabel(record.category))}</span>
                        </div>

                        <strong>${escapeBI(record.indicator || record.fileName)}</strong>

                        <span class="history-item__meta">
                            ${record.teamLabel ? `Equipe ${escapeBI(record.teamLabel)} · ` : ''}
                            ${formatNumber(record.rowCount || 0)} registros
                        </span>

                        <small>${escapeBI(record.fileName)}</small>
                    </div>

                    <div class="history-item__actions">
                        ${record.sourceType === 'portal-siaps' ? `
                            <button type="button" class="history-action history-action--primary" data-history-open="${escapeAttribute(record.id)}">
                                Abrir
                            </button>

                            <button type="button" class="history-action" data-history-checklist="${escapeAttribute(record.id)}">
                                Checklist
                            </button>
                        ` : ''}

                        ${record.fileBytes ? `
                            <button type="button" class="history-action" data-history-download="${escapeAttribute(record.id)}">
                                Baixar XLSX
                            </button>
                        ` : ''}

                        <button type="button" class="history-action history-action--danger" data-history-delete="${escapeAttribute(record.id)}">
                            Excluir
                        </button>
                    </div>
                </article>
            `;
        };

        container.innerHTML = [...periods.values()].map((period, index) => {
            const categories = new Set(period.records.map(item => item.category).filter(Boolean));
            const isActive = period.records.some(record =>
                Array.isArray(window._siapsActiveHistoryIds) &&
                window._siapsActiveHistoryIds.includes(record.id)
            );
            const open = expandedMonths.has(period.key) ||
                (!expandedMonths.size && (isActive || index === 0));

            return `
                <details class="history-month" data-history-period="${escapeAttribute(period.key)}"${open ? ' open' : ''}>
                    <summary class="history-month__summary">
                        <span class="history-month__label">${escapeBI(period.label)}</span>
                        <span class="history-month__meta">${period.records.length} ${period.records.length === 1 ? 'planilha' : 'planilhas'} · ${categories.size} ${categories.size === 1 ? 'grupo' : 'grupos'}</span>
                        <span class="history-month__arrow" aria-hidden="true"></span>
                    </summary>
                    <div class="history-month__files">${period.records.map(renderRecord).join('')}</div>
                </details>
            `;
        }).join('');

        bindHistoryListEvents();

    } catch (error) {
        console.error('Erro ao carregar histórico local:', error);
        container.innerHTML = `
            <div class="history-empty history-empty--error">
                <strong>Histórico local indisponível</strong>
                <span>${escapeBI(error.message || 'Não foi possível abrir o armazenamento local.')}</span>
            </div>
        `;
    }
}


function bindHistoryListEvents() {

    document.querySelectorAll('[data-history-open]').forEach(button => {
        button.addEventListener('click', async () => {
            try {
                await activateHistoryImports([button.dataset.historyOpen], {
                    navigate: true,
                    section: 'bi'
                });
            } catch (error) {
                window.alert(error.message || 'Não foi possível abrir a base histórica.');
            }
        });
    });

    document.querySelectorAll('[data-history-checklist]').forEach(button => {
        button.addEventListener('click', () => {
            window._siapsChecklistImportId = button.dataset.historyChecklist || '';

            if (typeof showSection === 'function') {
                showSection('checklist');
            }
        });
    });

    document.querySelectorAll('[data-history-download]').forEach(button => {
        button.addEventListener('click', async () => {
            const record = await historyGet(button.dataset.historyDownload);
            if (!record?.fileBytes) {
                window.alert('O arquivo original não está disponível.');
                return;
            }

            try {
                await saveIntegraFile({
                    title: 'Salvar planilha original',
                    fileName: record.fileName || 'siaps.xlsx',
                    extension: 'xlsx',
                    mimeType: record.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    bytes: record.fileBytes
                });
            } catch (error) {
                console.error('Erro ao baixar planilha do histórico:', error);
                window.alert(error.message || 'Não foi possível salvar a planilha original.');
            }
        });
    });

    document.querySelectorAll('[data-history-delete]').forEach(button => {
        button.addEventListener('click', async () => {
            const id = button.dataset.historyDelete;
            const record = await historyGet(id);
            if (!record) {
                return;
            }

            const label = record.competenceKey
                ? formatHistoryCompetence(record.competenceKey, record.competenceLabel)
                : record.fileName;

            if (!window.confirm(`Excluir ${label} do histórico local?\n\nO arquivo salvo nesta aplicação será removido, mas o arquivo original do computador não será alterado.`)) {
                return;
            }

            await historyDelete(id);

            if (typeof checklistDeleteImport === 'function') {
                await checklistDeleteImport(id);
            }

            await rebuildHistoryPeopleRegistry();

            if (Array.isArray(window._siapsActiveHistoryIds)) {
                window._siapsActiveHistoryIds = window._siapsActiveHistoryIds.filter(item => item !== id);
            }

            setHistoryNotice('success', `${label} foi removido do histórico local.`);
            await renderSavedImports();
        });
    });
}


async function initSiapsHistory() {

    try {
        await openSiapsHistoryDB();
        window._siapsHistoryAvailable = true;

        /*
         * Atualiza/migra o cadastro mestre de pessoas. O registro
         * mestre é único por CPF (ou CNS quando não houver CPF),
         * enquanto cada competência mantém apenas a observação mensal.
         */
        await rebuildHistoryPeopleRegistry();
        await renderSavedImports();

        if (window.location?.protocol === 'file:') {
            setHistoryNotice(
                'info',
                'Para garantir que o histórico permaneça disponível entre meses, prefira abrir o painel por http://localhost/siaps/ usando o XAMPP. O sistema continua totalmente local e não usa internet.'
            );
        }
    } catch (error) {
        window._siapsHistoryAvailable = false;
        console.error('IndexedDB indisponível:', error);
        setHistoryNotice(
            'error',
            'O navegador não permitiu o histórico local. O painel continua funcionando, mas as planilhas não serão preservadas após fechar a página.'
        );
        await renderSavedImports();
    }
}
