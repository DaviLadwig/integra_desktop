/**
 * =========================================================
 * PARSER.JS
 * =========================================================
 *
 * Responsável por:
 * - interpretar o Workbook;
 * - localizar abas;
 * - converter abas em objetos;
 * - validar o município;
 * - normalizar campos;
 * - enviar os dados para indicators.js.
 */


/**
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function normalizeText(value) {

    return String(value ?? '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}


function normalizeDigits(value) {

    return String(value ?? '')
        .replace(/\D/g, '');
}


function normalizeSheetName(value) {

    return String(value ?? '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s_-]+/g, '');
}


function normalizeColumnKey(value) {

    return String(value ?? '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}


/**
 * =========================================================
 * ABAS
 * =========================================================
 */

function findSheet(workbook, ...candidates) {

    if (
        !workbook ||
        !Array.isArray(workbook.SheetNames)
    ) {
        return null;
    }


    const sheetMap = {};


    workbook.SheetNames.forEach(sheetName => {

        sheetMap[
            normalizeSheetName(sheetName)
        ] = sheetName;

    });


    for (const candidate of candidates) {

        const key =
            normalizeSheetName(candidate);


        const realSheetName =
            sheetMap[key];


        if (realSheetName) {

            return workbook.Sheets[
                realSheetName
            ];

        }

    }


    return null;
}


/**
 * Converte uma aba em array de objetos.
 *
 * Também suporta planilhas que tenham linhas vazias
 * antes do cabeçalho.
 */
function sheetToObjects(worksheet) {

    if (!worksheet) {
        return [];
    }


    const rows =
        XLSX.utils.sheet_to_json(
            worksheet,
            {
                header: 1,
                defval: null,
                raw: true
            }
        );


    if (!rows.length) {
        return [];
    }


    /**
     * Localiza a primeira linha realmente preenchida.
     */
    let headerIndex = -1;


    for (
        let index = 0;
        index < rows.length;
        index++
    ) {

        const row = rows[index];


        if (
            row &&
            row.some(value => {

                return (
                    value !== null &&
                    value !== undefined &&
                    String(value).trim() !== ''
                );

            })
        ) {

            headerIndex = index;

            break;

        }

    }


    if (headerIndex === -1) {
        return [];
    }


    const headers =
        rows[headerIndex].map(value => {

            if (
                value === null ||
                value === undefined
            ) {
                return '';
            }

            return String(value).trim();

        });


    const result = [];


    for (
        let index = headerIndex + 1;
        index < rows.length;
        index++
    ) {

        const row = rows[index];


        if (!row) {
            continue;
        }


        const isEmpty =
            row.every(value => {

                return (
                    value === null ||
                    value === undefined ||
                    String(value).trim() === ''
                );

            });


        if (isEmpty) {
            continue;
        }


        const object = {};


        headers.forEach(
            (header, columnIndex) => {

                if (!header) {
                    return;
                }


                object[header] =
                    row[columnIndex] !== undefined
                        ? row[columnIndex]
                        : null;

            }
        );


        result.push(object);

    }


    return result;
}


/**
 * =========================================================
 * LEITURA DE CAMPOS
 * =========================================================
 */

function getField(row, ...names) {

    if (!row) {
        return null;
    }


    /**
     * Primeiro tenta correspondência exata.
     */
    for (const name of names) {

        if (row[name] !== undefined) {
            return row[name];
        }

    }


    /**
     * Depois tenta nome normalizado.
     */
    const keys =
        Object.keys(row);


    for (const name of names) {

        const target =
            normalizeColumnKey(name);


        const match =
            keys.find(key => {

                return (
                    normalizeColumnKey(key) ===
                    target
                );

            });


        if (match !== undefined) {
            return row[match];
        }

    }


    return null;
}


/**
 * =========================================================
 * UTILIDADES DOS DADOS
 * =========================================================
 */

function normIne(value) {

    let text =
        String(value ?? '').trim();


    /**
     * INE deve ser comparado apenas pelos números.
     */
    text =
        text.replace(/\D/g, '');


    /**
     * Remove zeros à esquerda.
     *
     * Exemplo:
     *
     * 0000085537
     * vira
     * 85537
     */
    text =
        text.replace(/^0+(?=\d)/, '');


    return text;
}


function onlyDigitsStr(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return '';
    }


    return String(value)
        .replace(/\D/g, '')
        .trim();
}


function fmtDate(value) {

    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return '';
    }


    /**
     * Date JavaScript.
     */
    if (value instanceof Date) {

        return value
            .toISOString()
            .slice(0, 10);

    }


    /**
     * Data serial do Excel.
     */
    if (typeof value === 'number') {

        const parsed =
            XLSX.SSF.parse_date_code(value);


        if (!parsed) {
            return '';
        }


        return (
            `${parsed.y}-` +
            `${String(parsed.m).padStart(2, '0')}-` +
            `${String(parsed.d).padStart(2, '0')}`
        );

    }


    const text =
        String(value).trim();


    /**
     * ISO:
     *
     * 2026-10-05
     */
    const iso =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );


    if (iso) {
        return iso[0];
    }


    /**
     * Data brasileira:
     *
     * 05/10/2026
     */
    const br =
        text.match(
            /^(\d{2})\/(\d{2})\/(\d{4})/
        );


    if (br) {

        return (
            `${br[3]}-` +
            `${br[2]}-` +
            `${br[1]}`
        );

    }


    return text.slice(0, 10);
}


function isFilled(value) {

    return (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ''
    );
}



/**
 * =========================================================
 * RELATÓRIO DIRETO DO PORTAL SIAPS
 * =========================================================
 *
 * O portal pode exportar uma "Lista Nominal" com apenas
 * uma aba chamada, normalmente, "Relatório - SIAPS".
 *
 * Esse formato é diferente da base consolidada preparada
 * anteriormente pelo sistema. Por isso detectamos o modelo,
 * extraímos os metadados e o convertemos para a estrutura
 * interna já utilizada por indicators.js.
 */

function isPortalSiapsReport(workbook) {

    if (
        !workbook ||
        !Array.isArray(workbook.SheetNames) ||
        workbook.SheetNames.length === 0
    ) {
        return false;
    }


    const firstSheetName =
        workbook.SheetNames[0];


    const worksheet =
        workbook.Sheets[firstSheetName];


    if (!worksheet) {
        return false;
    }


    const rows =
        XLSX.utils.sheet_to_json(
            worksheet,
            {
                header: 1,
                defval: '',
                raw: false
            }
        );


    const firstRowsText =
        rows
            .slice(0, 25)
            .flat()
            .map(value => normalizeText(value))
            .filter(Boolean);


    const hasSiaps =
        firstRowsText.some(text =>
            text.includes(
                'SISTEMA DE INFORMACAO PARA A ATENCAO PRIMARIA A SAUDE'
            )
        );


    const hasIndicator =
        firstRowsText.some(text =>
            text.startsWith(
                'INDICADOR SELECIONADO:'
            )
        );


    const hasNominalHeader =
        rows.some(row => {

            if (!Array.isArray(row)) {
                return false;
            }


            const normalized =
                row.map(value =>
                    normalizeColumnKey(value)
                );


            return (
                normalized.includes('CPF') &&
                normalized.includes('CNS') &&
                normalized.includes('NASCIMENTO') &&
                normalized.includes('INE')
            );

        });


    return (
        hasSiaps &&
        hasIndicator &&
        hasNominalHeader
    );
}


function getPortalFirstValue(row) {

    if (!Array.isArray(row)) {
        return '';
    }


    for (const value of row) {

        if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ''
        ) {
            return String(value).trim();
        }

    }


    return '';
}


function getPortalMetadataValue(rows, prefix) {

    const normalizedPrefix =
        normalizeText(prefix);


    for (const row of rows) {

        const text =
            getPortalFirstValue(row);


        const normalized =
            normalizeText(text);


        if (
            normalized.startsWith(
                normalizedPrefix
            )
        ) {

            const separator =
                text.indexOf(':');


            if (separator === -1) {
                return '';
            }


            return text
                .slice(separator + 1)
                .trim();

        }

    }


    return '';
}



function extractPortalDictionary(rows) {

    const dictionary = {};
    let collecting = false;

    (rows || []).forEach(row => {

        if (!Array.isArray(row)) {
            return;
        }

        const key =
            String(row[0] ?? '').trim();

        const description =
            String(row[1] ?? '').trim();

        const normalizedKey =
            normalizeText(key);

        const normalizedDescription =
            normalizeText(description);

        if (
            normalizedKey === 'COLUNA' &&
            normalizedDescription === 'DESCRICAO'
        ) {
            collecting = true;
            return;
        }

        if (!collecting) {
            return;
        }

        if (
            normalizedKey === 'RACA COR'
        ) {
            collecting = false;
            return;
        }

        if (
            key &&
            description
        ) {
            dictionary[key] =
                description;
        }

    });

    return dictionary;
}


function deduplicatePortalSiapsRecords(records) {

    const seen = new Map();
    const uniqueRecords = [];
    const duplicates = [];

    (records || []).forEach((row, index) => {

        const cpf = onlyDigitsStr(getField(row, 'CPF'));
        const cns = onlyDigitsStr(getField(row, 'CNS'));
        const key = cpf
            ? `cpf:${cpf}`
            : cns
                ? `cns:${cns}`
                : '';

        if (!key) {
            uniqueRecords.push(row);
            return;
        }

        if (seen.has(key)) {
            duplicates.push({
                key,
                cpf,
                cns,
                firstIndex: seen.get(key),
                duplicateIndex: index
            });
            return;
        }

        seen.set(key, index);
        uniqueRecords.push(row);
    });

    return {
        records: uniqueRecords,
        duplicates
    };
}


function parsePortalSiapsReport(workbook) {

    if (!isPortalSiapsReport(workbook)) {
        return null;
    }


    const sheetName =
        workbook.SheetNames[0];


    const worksheet =
        workbook.Sheets[sheetName];


    const rows =
        XLSX.utils.sheet_to_json(
            worksheet,
            {
                header: 1,
                defval: '',
                raw: false
            }
        );


    const municipioText =
        getPortalMetadataValue(
            rows,
            'Município:'
        );


    let municipio = '';
    let ibge = '';


    if (municipioText) {

        const match =
            municipioText.match(
                /^\s*(\d+)\s*\/\s*(.+?)\s*$/
            );


        if (match) {

            ibge = match[1];
            municipio = match[2];

        } else {

            municipio = municipioText;

        }

    }


    const uf =
        getPortalMetadataValue(
            rows,
            'UF:'
        );


    const competencia =
        getPortalMetadataValue(
            rows,
            'Competência selecionada:'
        );


    const indicador =
        getPortalMetadataValue(
            rows,
            'Indicador selecionado:'
        );


    const equipe =
        getPortalMetadataValue(
            rows,
            'Equipe Selecionada:'
        );


    const visualizacao =
        getPortalMetadataValue(
            rows,
            'Visualizacao:'
        ) ||
        getPortalMetadataValue(
            rows,
            'Visualização:'
        );


    const geradoEm =
        getPortalMetadataValue(
            rows,
            'Dado gerado em:'
        );


    let headerIndex = -1;
    let headers = [];


    for (
        let index = 0;
        index < rows.length;
        index++
    ) {

        const row = rows[index];


        if (!Array.isArray(row)) {
            continue;
        }


        const normalized =
            row.map(value =>
                normalizeColumnKey(value)
            );


        if (
            normalized.includes('CPF') &&
            normalized.includes('CNS') &&
            normalized.includes('NASCIMENTO') &&
            normalized.includes('INE')
        ) {

            headerIndex = index;

            headers = row.map(value =>
                String(value ?? '').trim()
            );

            break;

        }

    }


    if (headerIndex === -1) {

        throw new Error(
            'O relatório SIAPS foi identificado, mas a tabela nominal não foi encontrada.'
        );

    }


    const records = [];


    for (
        let index = headerIndex + 1;
        index < rows.length;
        index++
    ) {

        const row = rows[index];


        if (!Array.isArray(row)) {
            continue;
        }


        const firstValue =
            getPortalFirstValue(row);


        const normalizedFirstValue =
            normalizeText(firstValue);


        if (
            normalizedFirstValue.startsWith('FONTE:') ||
            normalizedFirstValue === 'DICIONARIO'
        ) {
            break;
        }


        const object = {};


        headers.forEach(
            (header, columnIndex) => {

                if (!header) {
                    return;
                }


                const value =
                    row[columnIndex] !== undefined
                        ? row[columnIndex]
                        : '';


                object[header] =
                    value === null ||
                    value === undefined
                        ? ''
                        : value;

            }
        );


        const cpf =
            onlyDigitsStr(
                getField(
                    object,
                    'CPF'
                )
            );


        const cns =
            onlyDigitsStr(
                getField(
                    object,
                    'CNS'
                )
            );


        const ine =
            onlyDigitsStr(
                getField(
                    object,
                    'INE'
                )
            );


        /**
         * Linhas de rodapé e dicionário não entram.
         */
        if (
            !cpf &&
            !cns &&
            !ine
        ) {
            continue;
        }


        records.push(object);

    }


    const dictionary =
        extractPortalDictionary(
            rows
        );


    const deduplication =
        deduplicatePortalSiapsRecords(records);

    if (deduplication.duplicates.length) {
        console.warn(
            'Registros duplicados na própria planilha foram ignorados:',
            deduplication.duplicates
        );
    }

    return {
        sourceType: 'portal-siaps',
        sheetName,
        uf,
        municipio,
        ibge,
        competencia,
        indicador,
        equipe,
        visualizacao,
        geradoEm,
        headers,
        dictionary,
        records: deduplication.records,
        sourceRowCount: records.length,
        duplicatesSkipped: deduplication.duplicates.length,
        duplicateDetails: deduplication.duplicates
    };
}


const PORTAL_SIAPS_INDICATORS = {

    'CUIDADO NO DESENVOLVIMENTO INFANTIL': {

        category: 'crianca',
        groupLabel: 'Crianças',
        targetSheet: 'CriancaBase',

        columns: {
            'A': '1 consulta - 30 dias',
            'B': '9 consultas',
            'C': '9 peso/altura',
            'D': '2 visitas do ACS',
            'E': 'Vacina',
            'NM': 'NM',
            'DN': 'DN',
            'COM 2 ANOS': 'COM 2 ANOS',
            'ATE 2 ANOS': 'ATE 2 ANOS'
        },

        practices: [
            { key: 'A', label: '1ª consulta até 30 dias' },
            { key: 'B', label: '9 consultas até 2 anos' },
            { key: 'C', label: '9 registros de peso e altura' },
            { key: 'D', label: '2 visitas domiciliares' },
            { key: 'E', label: 'Vacinação recomendada' }
        ],

        extraMarkers: [
            { key: 'ATE 2 ANOS', label: 'Até 2 anos' },
            { key: 'COM 2 ANOS', label: 'Com 2 anos' }
        ]

    },


    'CUIDADO DA PESSOA COM DIABETES': {

        category: 'diabetes',
        groupLabel: 'Diabetes',
        targetSheet: 'DiabetesBase',

        columns: {
            'A': 'Consulta',
            'B': 'Aferição pressão',
            'C': 'Peso/altura',
            'D': '2 visitas ACS',
            'E': 'Hemoglobina glicada',
            'F': 'Avaliação dos pés',
            'NM': 'NM',
            'DN': 'DN'
        },

        practices: [
            { key: 'A', label: 'Consulta médica/enfermagem' },
            { key: 'B', label: 'Aferição de pressão arterial' },
            { key: 'C', label: 'Peso e altura' },
            { key: 'D', label: '2 visitas domiciliares' },
            { key: 'E', label: 'Hemoglobina glicada' },
            { key: 'F', label: 'Avaliação dos pés' }
        ]

    },


    'CUIDADO NA GESTACAO E PUERPERIO': {

        category: 'gestante',
        groupLabel: 'Gestação e Puerpério',
        targetSheet: 'GestanteBase',

        columns: {
            'A': 'Iniciado até 12 semana',
            'B': '07 consultas',
            'C': '07 aferição de pressão',
            'D': '07 peso/altura',
            'E': '03 visita ACS',
            'F': 'Vacina',
            'G': 'Teste rápido 1 trimestre',
            'H': 'Teste rápido 3 trimestre',
            'I': 'Consulta puerpério',
            'J': 'Visita ACS puerperio',
            'K': 'Consulta odonto',
            'NM': 'NM',
            'DN': 'DN',
            'GESTANTE E PUERPERA ATIVA': 'GESTANTE E PUERPERA ATIVA',
            'GESTANTE E PUERPERA FINALIZADA': 'GESTANTE E PUERPERA FINALIZADA'
        },

        practices: [
            { key: 'A', label: 'Início do pré-natal até a 12ª semana' },
            { key: 'B', label: '7 consultas de pré-natal' },
            { key: 'C', label: '7 aferições de pressão arterial' },
            { key: 'D', label: '7 registros de peso e altura' },
            { key: 'E', label: '3 visitas domiciliares' },
            { key: 'F', label: 'Vacina dTpa' },
            { key: 'G', label: 'Testes do 1º trimestre' },
            { key: 'H', label: 'Testes do 3º trimestre' },
            { key: 'I', label: 'Consulta no puerpério' },
            { key: 'J', label: 'Visita domiciliar no puerpério' },
            { key: 'K', label: 'Atividade de saúde bucal' }
        ],

        extraMarkers: [
            { key: 'GESTANTE E PUERPERA ATIVA', label: 'Gestante/puérpera ativa' },
            { key: 'GESTANTE E PUERPERA FINALIZADA', label: 'Gestante/puérpera finalizada' }
        ]

    },


    'CUIDADO DA MULHER NA PREVENCAO DO CANCER': {

        category: 'mulher',
        groupLabel: 'Mulher · prevenção do câncer',
        targetSheet: 'MulherBase',

        columns: {
            'NM.A': 'NM.A',
            'DN.A': 'DN.A',
            'NM.B': 'NM.B',
            'DN.B': 'DN.B',
            'NM.C': 'NM.C',
            'DN.C': 'DN.C',
            'NM.D': 'NM.D',
            'DN.D': 'DN.D',
            'NM': 'NM',
            'DN': 'DN'
        },

        practices: [
            {
                key: 'NM.A',
                denominatorKey: 'DN.A',
                label: 'Rastreamento do câncer do colo do útero'
            },
            {
                key: 'NM.B',
                denominatorKey: 'DN.B',
                label: 'Vacinação HPV'
            },
            {
                key: 'NM.C',
                denominatorKey: 'DN.C',
                label: 'Saúde sexual e reprodutiva'
            },
            {
                key: 'NM.D',
                denominatorKey: 'DN.D',
                label: 'Rastreamento do câncer de mama'
            }
        ]

    },


    'CUIDADO DA PESSOA COM HIPERTENSAO': {

        category: 'hipertenso',
        groupLabel: 'Hipertensão',
        targetSheet: 'HASBASE',

        columns: {
            'A': 'Consulta',
            'B': 'Aferição de pressão',
            'C': 'Peso e altura',
            'D': '2 visitas ACS',
            'NM': 'NM',
            'DN': 'DN'
        },

        practices: [
            { key: 'A', label: 'Consulta médica/enfermagem' },
            { key: 'B', label: 'Aferição de pressão arterial' },
            { key: 'C', label: 'Peso e altura' },
            { key: 'D', label: '2 visitas domiciliares' }
        ]

    },


    'CUIDADO DA PESSOA IDOSA': {

        category: 'idoso',
        groupLabel: 'Pessoa idosa',
        targetSheet: 'IdosoBase',

        columns: {
            'A': 'Consulta',
            'B': '2 peso/altura',
            'C': '2 visita do ACS',
            'D': 'Vacina',
            'NM': 'NM',
            'DN': 'DN'
        },

        practices: [
            { key: 'A', label: 'Consulta médica/enfermagem' },
            { key: 'B', label: 'Peso e altura' },
            { key: 'C', label: '2 visitas domiciliares' },
            { key: 'D', label: 'Vacinação contra influenza' }
        ]

    }

};


function getPortalIndicatorProfile(indicator) {

    const key =
        normalizeText(indicator);


    return (
        PORTAL_SIAPS_INDICATORS[key]
        ||
        null
    );
}


function normalizePortalMark(value) {

    const text =
        String(value ?? '').trim();


    /**
     * O relatório do portal usa "X" para marcar o item.
     * Células sem marcação podem vir como string vazia.
     */
    if (
        normalizeText(text) === 'X'
    ) {
        return 'X';
    }


    return '';
}


function buildPortalIndicatorDetails(
    portalReport,
    profile
) {

    if (
        !portalReport ||
        !profile
    ) {
        return null;
    }


    const raceLabels = {
        '1': 'Branca',
        '2': 'Preta',
        '3': 'Amarela',
        '4': 'Parda',
        '5': 'Indígena',
        '6': 'Sem informação'
    };


    const dictionary =
        portalReport.dictionary || {};


    const criteria =
        (
            Array.isArray(profile.practices)
                ? profile.practices
                : []
        ).map(item => ({
            ...item,
            description:
                dictionary[item.key]
                ||
                item.description
                ||
                item.label
                ||
                item.key
        }));


    const total =
        portalReport.records.length;


    const sex = {};
    const race = {};

    let withAnyPractice = 0;
    let totalMarks = 0;
    let possibleMarks = 0;


    const practiceStats =
        criteria.map(item => ({
            ...item,
            completed: 0,
            eligible: 0,
            pending: 0,
            percentage: 0
        }));


    const extraMarkers =
        (
            Array.isArray(profile.extraMarkers)
                ? profile.extraMarkers
                : []
        ).map(item => ({
            ...item,
            count: 0
        }));


    portalReport.records.forEach(row => {

        let rowHasAnyPractice = false;


        practiceStats.forEach(item => {

            const completed =
                normalizePortalMark(
                    getField(row, item.key)
                ) === 'X';


            let eligible = true;


            if (item.denominatorKey) {

                eligible =
                    (
                        normalizePortalMark(
                            getField(
                                row,
                                item.denominatorKey
                            )
                        ) === 'X'
                    )
                    ||
                    completed;

            }


            if (eligible) {

                item.eligible++;
                possibleMarks++;

            }


            if (completed) {

                item.completed++;
                totalMarks++;
                rowHasAnyPractice = true;

            }

        });


        if (rowHasAnyPractice) {
            withAnyPractice++;
        }


        extraMarkers.forEach(item => {

            if (
                normalizePortalMark(
                    getField(
                        row,
                        item.key
                    )
                ) === 'X'
            ) {
                item.count++;
            }

        });


        const rawSex =
            String(
                getField(row, 'Sexo') || ''
            )
                .trim()
                .toUpperCase();


        const sexLabel =
            rawSex === 'M'
                ? 'Masculino'
                : rawSex === 'F'
                    ? 'Feminino'
                    : 'Não informado';


        sex[sexLabel] =
            (sex[sexLabel] || 0) + 1;


        const raceCode =
            String(
                getField(row, 'Raça cor') || ''
            ).trim();


        const raceLabel =
            raceLabels[raceCode]
            ||
            'Não informado';


        race[raceLabel] =
            (race[raceLabel] || 0) + 1;

    });


    practiceStats.forEach(item => {

        item.pending =
            Math.max(
                item.eligible - item.completed,
                0
            );


        item.percentage =
            item.eligible > 0
                ? Math.round(
                    (item.completed / item.eligible) * 100
                )
                : 0;

    });


    const extraMarkerMap = {};

    extraMarkers.forEach(item => {
        extraMarkerMap[item.key] = item.count;
    });


    return {
        category: profile.category,
        groupLabel:
            profile.groupLabel
            ||
            historyCategoryLabel(profile.category),
        indicator:
            portalReport.indicador || '',
        total,
        withAnyPractice,
        withoutAnyPractice:
            Math.max(total - withAnyPractice, 0),
        activityCoverage:
            total > 0
                ? Math.round(
                    (withAnyPractice / total) * 100
                )
                : 0,
        totalMarks,
        possibleMarks,
        practiceCompliance:
            possibleMarks > 0
                ? Math.round(
                    (totalMarks / possibleMarks) * 100
                )
                : 0,
        sex,
        race,
        practices: practiceStats,
        extraMarkers,
        extraMarkerMap,
        underTwo:
            extraMarkerMap['ATE 2 ANOS'] || 0,
        exactlyTwo:
            extraMarkerMap['COM 2 ANOS'] || 0
    };
}


function buildInternalWorkbookFromPortalReport(
    portalReport
) {

    const profile =
        getPortalIndicatorProfile(
            portalReport.indicador
        );


    if (!profile) {

        throw new Error(
            `O arquivo é um relatório direto do portal SIAPS, ` +
            `mas o indicador "${portalReport.indicador || 'não informado'}" ` +
            `ainda não está mapeado neste painel.`
        );

    }


    if (!portalReport.records.length) {

        throw new Error(
            'O relatório SIAPS não possui registros nominais para processar.'
        );

    }


    const esusRows = [];
    const indicatorRows = [];


    portalReport.records.forEach(row => {

        const cpf =
            onlyDigitsStr(
                getField(
                    row,
                    'CPF'
                )
            );


        const cns =
            onlyDigitsStr(
                getField(
                    row,
                    'CNS'
                )
            );


        const nascimento =
            getField(
                row,
                'Nascimento'
            );


        const ineRaw =
            getField(
                row,
                'INE'
            ) ||
            portalReport.equipe;


        const ine =
            onlyDigitsStr(
                ineRaw
            );


        if (!ine) {
            return;
        }


        const displayIne =
            String(ineRaw || ine).trim();


        esusRows.push({
            'CPF/CNS': cpf || cns,
            'Nome': '(Nome não informado)',
            'Data de nascimento': nascimento || '',
            'INE equipe': displayIne,
            'Nome equipe': `Equipe ${displayIne}`
        });


        const target = {
            CPF: cpf,
            CNS: cns,
            INE: displayIne
        };


        Object.entries(
            profile.columns
        ).forEach(
            ([sourceColumn, targetColumn]) => {

                target[targetColumn] =
                    normalizePortalMark(
                        getField(
                            row,
                            sourceColumn
                        )
                    );

            }
        );


        indicatorRows.push(target);

    });


    if (!esusRows.length) {

        throw new Error(
            'O relatório foi reconhecido, mas nenhum registro com INE válido foi encontrado.'
        );

    }


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
            esusRows
        ),
        'ESUSBase'
    );


    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
            indicatorRows
        ),
        profile.targetSheet
    );


    return {
        workbook,
        profile,
        rowCount: indicatorRows.length,
        details: buildPortalIndicatorDetails(
            portalReport,
            profile
        )
    };
}


function extractPortalMunicipioInfo(
    portalReport
) {

    if (!portalReport) {
        return null;
    }


    return {
        estado:
            portalReport.uf || null,

        municipio:
            portalReport.municipio || null,

        ibge:
            portalReport.ibge || null,

        sheetName:
            portalReport.sheetName
    };
}

/**
 * =========================================================
 * IDENTIFICAÇÃO DO MUNICÍPIO
 * =========================================================
 */

function findCadastroSheet(workbook) {

    if (
        !workbook ||
        !workbook.SheetNames ||
        !workbook.SheetNames.length
    ) {
        return null;
    }


    const candidates =
        workbook.SheetNames.filter(
            sheetName => {

                const normalized =
                    normalizeText(sheetName);


                return (
                    normalized.includes('CADASTRO') &&
                    normalized.includes('MUNICIPIO')
                );

            }
        );


    /**
     * Se encontrou a aba correta, utiliza ela.
     */
    if (candidates.length) {
        return candidates[0];
    }


    /**
     * Fallback:
     * tenta a primeira aba.
     */
    return workbook.SheetNames[0];
}


/**
 * Extrai:
 *
 * Estado
 * Município
 * Código da base
 */
function extractMunicipioInfo(workbook) {

    const sheetName =
        findCadastroSheet(workbook);


    if (!sheetName) {
        return null;
    }


    const worksheet =
        workbook.Sheets[sheetName];


    if (!worksheet) {
        return null;
    }


    const range =
        XLSX.utils.decode_range(
            worksheet['!ref'] || 'A1:A1'
        );


    let estado = null;
    let municipio = null;
    let ibge = null;


    /**
     * Primeiro tenta o layout padrão SIAPS:
     *
     * coluna B = rótulo
     * coluna C = valor
     */
    for (
        let row = range.s.r;
        row <= range.e.r;
        row++
    ) {

        const labelAddress =
            XLSX.utils.encode_cell({
                r: row,
                c: 1
            });


        const valueAddress =
            XLSX.utils.encode_cell({
                r: row,
                c: 2
            });


        const labelCell =
            worksheet[labelAddress];

        const valueCell =
            worksheet[valueAddress];


        if (!labelCell) {
            continue;
        }


        const label =
            normalizeText(labelCell.v);


        const value =
            valueCell
                ? valueCell.v
                : null;


        if (label === 'ESTADO') {

            estado = value;

        } else if (
            label.includes('MUNICIPIO')
        ) {

            municipio = value;

        } else if (
            label === 'IBGE'
        ) {

            ibge = value;

        }

    }


    /**
     * Fallback:
     *
     * procura os rótulos em qualquer parte da aba.
     */
    if (
        estado === null ||
        municipio === null ||
        ibge === null
    ) {

        for (
            let row = range.s.r;
            row <= range.e.r;
            row++
        ) {

            for (
                let column = range.s.c;
                column <= range.e.c;
                column++
            ) {

                const address =
                    XLSX.utils.encode_cell({
                        r: row,
                        c: column
                    });


                const cell =
                    worksheet[address];


                if (
                    !cell ||
                    typeof cell.v !== 'string'
                ) {
                    continue;
                }


                const label =
                    normalizeText(cell.v);


                const nextAddress =
                    XLSX.utils.encode_cell({
                        r: row,
                        c: column + 1
                    });


                const nextCell =
                    worksheet[nextAddress];


                const nextValue =
                    nextCell
                        ? nextCell.v
                        : null;


                if (
                    label === 'ESTADO' &&
                    estado === null
                ) {

                    estado = nextValue;

                }


                if (
                    label.includes('MUNICIPIO') &&
                    municipio === null
                ) {

                    municipio = nextValue;

                }


                if (
                    label === 'IBGE' &&
                    ibge === null
                ) {

                    ibge = nextValue;

                }

            }

        }

    }


    return {
        estado,
        municipio,
        ibge,
        sheetName
    };
}


/**
 * =========================================================
 * VALIDAÇÃO MUNICIPAL
 * =========================================================
 */

function validateMunicipio(info) {

    if (
        !info ||
        info.estado === null ||
        info.municipio === null ||
        info.ibge === null
    ) {

        return {
            ok: false,
            reason: 'NAO_ENCONTRADO'
        };

    }


    const ufIsValid =
        normalizeText(info.estado) ===
        normalizeText(CONFIG.uf);


    const municipioIsValid =
        normalizeText(info.municipio) ===
        normalizeText(CONFIG.municipio);


    const expectedIbge =
        normalizeDigits(CONFIG.ibge);


    const receivedIbge =
        normalizeDigits(info.ibge);


    /**
     * A lista nominal baixada diretamente do portal SIAPS
     * pode apresentar o código municipal com 6 dígitos
     * (sem o dígito verificador final do código IBGE).
     */
    const ibgeIsValid =
        receivedIbge === expectedIbge ||
        (
            expectedIbge.length === 7 &&
            receivedIbge.length === 6 &&
            expectedIbge.slice(0, 6) === receivedIbge
        ) ||
        (
            expectedIbge.length === 6 &&
            receivedIbge.length === 7 &&
            receivedIbge.slice(0, 6) === expectedIbge
        );


    if (
        ufIsValid &&
        municipioIsValid &&
        ibgeIsValid
    ) {

        return {
            ok: true
        };

    }


    return {
        ok: false,
        reason: 'DIVERGENTE',
        got: info
    };
}


/**
 * =========================================================
 * PROCESSAMENTO PRINCIPAL
 * =========================================================
 */

/**
 * Função chamada pelo upload.js depois que
 * XLSX.read() cria o Workbook.
 *
 * @param {Object} workbook
 */
function processWorkbook(workbook) {

    console.log(
        'Iniciando parser do Workbook:',
        workbook.SheetNames
    );


    /**
     * -----------------------------------------------------
     * VALIDA WORKBOOK
     * -----------------------------------------------------
     */

    if (
        !workbook ||
        !Array.isArray(workbook.SheetNames) ||
        workbook.SheetNames.length === 0
    ) {

        setUploadStatus(
            'error',
            'A planilha não possui abas válidas.'
        );

        return;
    }


    /**
     * -----------------------------------------------------
     * IDENTIFICA MUNICÍPIO
     * -----------------------------------------------------
     */

    const portalReport =
        isPortalSiapsReport(workbook)
            ? parsePortalSiapsReport(workbook)
            : null;


    const municipioInfo =
        portalReport
            ? extractPortalMunicipioInfo(
                portalReport
            )
            : extractMunicipioInfo(
                workbook
            );


    console.log(
        'Município encontrado:',
        municipioInfo
    );


    const validation =
        validateMunicipio(
            municipioInfo
        );


    /**
     * -----------------------------------------------------
     * MUNICÍPIO NÃO IDENTIFICADO
     * -----------------------------------------------------
     */

    if (!validation.ok) {

        if (
            validation.reason ===
            'NAO_ENCONTRADO'
        ) {

            setUploadStatus(
                'error',
                `
                    <strong>
                        Não foi possível identificar o município.
                    </strong>

                    <div class="up-status__detail">
                        Verifique se esta é uma planilha SIAPS válida
                        e se a aba de cadastro do município está presente.
                    </div>
                `
            );


            return;

        }


        /**
         * Município diferente.
         */
        const received =
            validation.got || {};


        setUploadStatus(
            'error',
            `
                <strong>
                    A planilha pertence a outro município.
                </strong>

                <div class="up-status__detail">

                    <div>
                        O arquivo selecionado não corresponde à base configurada para esta instalação do Integra.
                    </div>

                    <div>
                        Verifique a origem da planilha e tente novamente.
                    </div>

                </div>
            `
        );


        return;

    }


    /**
     * -----------------------------------------------------
     * MUNICÍPIO VÁLIDO
     * -----------------------------------------------------
     */

    setUploadStatus(
        'loading',
        'Base identificada. Processando os dados...'
    );


    /**
     * -----------------------------------------------------
     * INDICADORES
     * -----------------------------------------------------
     */

    if (
        typeof buildDataFromWorkbook !==
        'function'
    ) {

        console.error(
            'buildDataFromWorkbook() não encontrada.'
        );


        setUploadStatus(
            'error',
            `
                Não foi possível processar os indicadores.

                <div class="up-status__detail">
                    A função buildDataFromWorkbook() não está disponível
                    em indicators.js.
                </div>
            `
        );


        return;

    }


    try {

        /**
         * Monta:
         *
         * D
         * L
         * GC
         * GL
         */
        let dataWorkbook =
            workbook;


        if (portalReport) {

            const adapted =
                buildInternalWorkbookFromPortalReport(
                    portalReport
                );


            dataWorkbook =
                adapted.workbook;


            window._siapsPortalMeta = {
                indicador: portalReport.indicador,
                competencia: portalReport.competencia,
                equipe: portalReport.equipe,
                geradoEm: portalReport.geradoEm,
                registros: adapted.rowCount
            };


            window._siapsAvailableCategories = [
                adapted.profile.category
            ];


            window._siapsPortalDetails =
                adapted.details || null;


            window._siapsPartialImport = true;


            console.log(
                'Relatório direto do portal SIAPS detectado:',
                window._siapsPortalMeta
            );

        } else {

            window._siapsPortalMeta = null;
            window._siapsPortalDetails = null;
            window._siapsAvailableCategories = null;
            window._siapsPartialImport = false;

        }


        buildDataFromWorkbook(
            dataWorkbook
        );


        /**
         * Marca dados como carregados.
         */
        window._siapsLoaded = true;


        /**
         * -------------------------------------------------
         * ATUALIZA STATUS DA BASE
         * -------------------------------------------------
         */

        updateLoadedDatabaseState();


        /**
         * -------------------------------------------------
         * DIAGNÓSTICO DAS ABAS
         * -------------------------------------------------
         */

        const diagnostics =
            window._siapsDiag || [];


        const emptySheets =
            diagnostics
                .filter(item => {

                    return (
                        item.linhas === 0
                    );

                })
                .map(item => item.nome);


        let detail = '';


        if (portalReport) {

            detail =
                `
                    <div class="up-status__detail">
                        Origem: <strong>Portal SIAPS</strong> ·
                        Indicador: <strong>${escapeParserHtml(portalReport.indicador || 'Não informado')}</strong> ·
                        Competência: <strong>${escapeParserHtml(portalReport.competencia || 'Não informada')}</strong> ·
                        Equipe: <strong>${escapeParserHtml(portalReport.equipe || 'Não informada')}</strong>
                    </div>
                `;

        }


        if (
            diagnostics.length &&
            !portalReport
        ) {

            detail +=
                `
                    <div class="up-status__detail">
                        ${diagnostics
                    .map(item => {

                        return (
                            `${escapeParserHtml(item.nome)}: ` +
                            `<strong>${item.linhas}</strong>`
                        );

                    })
                    .join(' · ')
                }
                    </div>
                `;

        }


        if (portalReport) {

            setUploadStatus(
                'success',
                `
                    Relatório direto do portal SIAPS processado com sucesso.
                    ${detail}
                `
            );

        } else if (emptySheets.length) {

            setUploadStatus(
                'success',
                `
                    Planilha carregada.

                    Algumas abas não possuem registros:
                    <strong>
                        ${emptySheets.map(escapeParserHtml).join(', ')}
                    </strong>.

                    ${detail}
                `
            );

        } else {

            setUploadStatus(
                'success',
                `
                    Planilha validada e processada com sucesso.
                    ${detail}
                `
            );

        }


        /**
         * -------------------------------------------------
         * INICIALIZA DASHBOARD
         * -------------------------------------------------
         */

        if (
            typeof initDashboard ===
            'function'
        ) {

            initDashboard();

        }


        /**
         * Atualiza os estados da Visão Geral.
         */
        const emptyState =
            document.getElementById(
                'dashboardEmptyState'
            );


        const loadedState =
            document.getElementById(
                'dashboardLoaded'
            );


        if (emptyState) {
            emptyState.style.display = 'none';
        }


        if (loadedState) {
            loadedState.style.display = 'block';
        }


        /**
         * Leva o usuário para a visão geral
         * depois da importação.
         */
        window.setTimeout(
            () => {

                if (
                    typeof showSection ===
                    'function'
                ) {

                    showSection(
                        'dashboard'
                    );

                }

            },
            600
        );


        console.log(
            'Planilha SIAPS processada com sucesso.'
        );


        return {
            ok: true,
            portalReport,
            municipioInfo,
            diagnostics: window._siapsDiag || [],
            portalMeta: window._siapsPortalMeta,
            portalDetails: window._siapsPortalDetails,
            partialImport: window._siapsPartialImport
        };


    } catch (error) {

        console.error(
            'Erro ao montar indicadores:',
            error
        );


        setUploadStatus(
            'error',
            `
                Não foi possível processar os dados da planilha.

                <div class="up-status__detail">
                    ${escapeParserHtml(error.message)}
                </div>
            `
        );


        return {
            ok: false,
            error
        };

    }

}


/**
 * =========================================================
 * ESTADO DA BASE CARREGADA
 * =========================================================
 */

function updateLoadedDatabaseState() {

    const title =
        document.getElementById(
            'dataSourceTitle'
        );


    const description =
        document.getElementById(
            'dataSourceDescription'
        );


    const statusCard =
        document.getElementById(
            'dataSourceStatus'
        );


    if (title) {

        title.textContent =
            'Planilha carregada';

    }


    if (description) {

        description.textContent =
            'Os dados desta sessão estão disponíveis para consulta no painel.';

    }


    if (statusCard) {

        statusCard.classList.add(
            'is-loaded'
        );

    }

}


/**
 * =========================================================
 * SEGURANÇA DE HTML
 * =========================================================
 */

function escapeParserHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

}
