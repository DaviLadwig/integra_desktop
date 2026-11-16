/**
 * =========================================================
 * EXPORT.JS
 * =========================================================
 *
 * Responsável por:
 * - exportar os dados consolidados para Excel;
 * - gerar relatório PDF diretamente no navegador;
 * - abrir uma versão exclusiva para impressão.
 *
 * Tudo funciona localmente, sem dependência externa.
 */


/**
 * =========================================================
 * VALIDAÇÃO
 * =========================================================
 */

function ensureExportData() {

    if (
        !window._siapsLoaded ||
        !D ||
        Object.keys(D).length === 0
    ) {

        alert(
            'Nenhuma base SIAPS está carregada. Importe uma planilha antes de gerar o relatório.'
        );

        return false;

    }

    return true;

}


/**
 * =========================================================
 * MODELO DO RELATÓRIO
 * =========================================================
 */

function getReportTeams() {

    if (sINE === 'all') {
        return Object.values(D);
    }

    const team = D[String(sINE)];

    return team ? [team] : [];

}


function getReportSourceName() {

    if (
        window._siapsSource &&
        window._siapsSource.name
    ) {
        return window._siapsSource.name;
    }

    const fileName =
        document.getElementById('upFname');

    if (
        fileName &&
        fileName.textContent.trim()
    ) {
        return fileName.textContent.trim();
    }

    return 'Base SIAPS carregada';

}


function getReportScope(teams) {

    if (sINE === 'all') {
        return 'Todas as equipes';
    }

    if (teams[0]) {
        return `${teams[0].equipe} - INE ${teams[0].ine}`;
    }

    return 'Equipe selecionada';

}


function getReportCategoryStats(teams) {

    return CATS.map(category => {

        const total = teams.reduce(
            (sum, team) =>
                sum + Number(
                    team[category.totalKey] || 0
                ),
            0
        );

        const pending = category.pendingKey
            ? teams.reduce(
                (sum, team) =>
                    sum + Number(
                        team[category.pendingKey] || 0
                    ),
                0
            )
            : null;

        const accompanied =
            pending === null
                ? null
                : Math.max(total - pending, 0);

        const coverage =
            pending === null
                ? null
                : total > 0
                    ? Math.round(
                        (accompanied / total) * 100
                    )
                    : 0;

        return {
            key: category.k,
            label: category.label,
            total,
            pending,
            accompanied,
            coverage
        };

    });

}


function getReportPracticeCoverage(category, ines) {

    if (
        typeof PR === 'undefined' ||
        !PR[category]
    ) {
        return 0;
    }

    let compliant = 0;
    let denominator = 0;

    PR[category].forEach(practice => {

        ines.forEach(ine => {

            const counters =
                (((GC || {})[category] || {})[ine]) || {};

            const value = counters[practice];

            if (Array.isArray(value)) {

                compliant += Number(value[0] || 0);
                denominator += Number(value[1] || 0);

                return;

            }

            const total = Number(
                counters.total || 0
            );

            const missing = Number(
                value || 0
            );

            denominator += total;
            compliant += Math.max(
                total - missing,
                0
            );

        });

    });

    return denominator > 0
        ? Math.round(
            (compliant / denominator) * 100
        )
        : 0;

}


function buildReportModel() {

    const teams = getReportTeams();
    const categories = getReportCategoryStats(teams);

    const groupCategories = categories.filter(
        item => item.pending !== null
    );

    const monitoredTotal = groupCategories.reduce(
        (sum, item) => sum + item.total,
        0
    );

    const monitoredPending = groupCategories.reduce(
        (sum, item) => sum + item.pending,
        0
    );

    const monitoredOk = Math.max(
        monitoredTotal - monitoredPending,
        0
    );

    const monitoredCoverage = monitoredTotal > 0
        ? Math.round(
            (monitoredOk / monitoredTotal) * 100
        )
        : 0;

    const semDomicilio =
        categories.find(
            item => item.key === 'sem_domicilio'
        )?.total || 0;

    const semAcompanhamento =
        categories.find(
            item => item.key === 'sem_acompanhamento'
        )?.total || 0;

    const ines = teams.map(
        team => String(team.ine)
    );

    const practiceKeys = [
        ['crianca', 'Crianças'],
        ['gestante', 'Gestantes'],
        ['diabetes', 'Diabéticos'],
        ['hipertenso', 'Hipertensos'],
        ['idoso', 'Idosos'],
        ['mulher', 'Mulheres']
    ];

    const practices = practiceKeys.map(
        ([key, label]) => ({
            key,
            label,
            coverage: getReportPracticeCoverage(
                key,
                ines
            )
        })
    );

    return {
        generatedAt: new Date(),
        sourceName: getReportSourceName(),
        scope: getReportScope(teams),
        teams,
        categories,
        practices,
        summary: {
            teamCount: teams.length,
            semDomicilio,
            semAcompanhamento,
            monitoredCoverage
        }
    };

}


/**
 * =========================================================
 * EXPORTAÇÃO EXCEL
 * =========================================================
 */

async function exportarExcelAtual() {

    if (!ensureExportData()) {
        return;
    }

    if (typeof XLSX === 'undefined') {
        window.alert('A biblioteca XLSX não está disponível.');
        return;
    }

    try {
        const model = buildReportModel();

        const resumo = model.categories.map(item => ({
            Indicador: item.label,
            Total: item.total,
            Pendentes: item.pending === null ? '' : item.pending,
            Acompanhados: item.accompanied === null ? '' : item.accompanied,
            'Cobertura (%)': item.coverage === null ? '' : item.coverage
        }));

        const equipes = model.teams.map(team => ({
            Equipe: team.equipe || '',
            INE: team.ine || '',
            'Sem domicílio': Number(team.sem_domicilio || 0),
            'Sem acompanhamento': Number(team.sem_acompanhamento || 0),
            Crianças: Number(team.crianca_total || 0),
            Gestantes: Number(team.gestante_total || 0),
            Diabéticos: Number(team.diabetes_total || 0),
            Hipertensos: Number(team.hipertenso_total || 0),
            Idosos: Number(team.idoso_total || 0),
            Mulheres: Number(team.mulher_total || 0)
        }));

        const boasPraticas = model.practices.map(item => ({
            Grupo: item.label,
            'Conformidade (%)': item.coverage
        }));

        const workbook = XLSX.utils.book_new();
        const resumoSheet = XLSX.utils.json_to_sheet(resumo);
        const equipesSheet = XLSX.utils.json_to_sheet(equipes);
        const boasPraticasSheet = XLSX.utils.json_to_sheet(boasPraticas);

        resumoSheet['!cols'] = [
            { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 }
        ];
        equipesSheet['!cols'] = [
            { wch: 34 }, { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }
        ];
        boasPraticasSheet['!cols'] = [
            { wch: 26 }, { wch: 18 }
        ];

        XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');
        XLSX.utils.book_append_sheet(workbook, equipesSheet, 'Equipes');
        XLSX.utils.book_append_sheet(workbook, boasPraticasSheet, 'Boas_Praticas');

        // Gera os bytes sem tentar iniciar um download interno do WebView.
        const fileBytes = XLSX.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
            compression: true
        });

        await saveIntegraFile({
            title: 'Salvar relatório Excel',
            fileName: buildReportFileName('xlsx'),
            extension: 'xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            bytes: fileBytes
        });

    } catch (error) {
        console.error('Erro ao exportar Excel:', error);
        window.alert(error.message || 'Não foi possível salvar o arquivo Excel.');
    }

}


/**
 * =========================================================
 * PDF NATIVO
 * =========================================================
 *
 * Pequeno gerador PDF próprio para que a aplicação
 * continue 100% offline e não dependa de jsPDF/CDN.
 */

function pdfEscapeHex(text) {

    const normalized = String(text ?? '')
        .replace(/[–—]/g, '-')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/…/g, '...');

    let hex = '';

    for (let i = 0; i < normalized.length; i++) {

        let code = normalized.charCodeAt(i);

        if (code > 255) {
            code = 63;
        }

        hex += code
            .toString(16)
            .padStart(2, '0')
            .toUpperCase();

    }

    return `<${hex}>`;

}


function pdfRgb(hex) {

    const value = String(hex)
        .replace('#', '');

    const r = parseInt(value.slice(0, 2), 16) / 255;
    const g = parseInt(value.slice(2, 4), 16) / 255;
    const b = parseInt(value.slice(4, 6), 16) / 255;

    return [r, g, b]
        .map(number => number.toFixed(3))
        .join(' ');

}


function createPdfPage() {
    return [];
}


function pdfText(
    page,
    text,
    x,
    y,
    size = 10,
    options = {}
) {

    const font = options.bold
        ? 'F2'
        : 'F1';

    const color = pdfRgb(
        options.color || '#17304f'
    );

    page.push(
        `BT /${font} ${size} Tf ${color} rg ${x.toFixed(2)} ${(841.89 - y).toFixed(2)} Td ${pdfEscapeHex(text)} Tj ET`
    );

}


function pdfRect(
    page,
    x,
    y,
    width,
    height,
    options = {}
) {

    const commands = [];

    if (options.fill) {
        commands.push(
            `${pdfRgb(options.fill)} rg`
        );
    }

    if (options.stroke) {
        commands.push(
            `${pdfRgb(options.stroke)} RG`
        );
    }

    if (options.lineWidth) {
        commands.push(
            `${options.lineWidth} w`
        );
    }

    const drawMode =
        options.fill && options.stroke
            ? 'B'
            : options.fill
                ? 'f'
                : 'S';

    commands.push(
        `${x.toFixed(2)} ${(841.89 - y - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${drawMode}`
    );

    page.push(
        commands.join(' ')
    );

}


function pdfLine(
    page,
    x1,
    y1,
    x2,
    y2,
    color = '#dbe3ec',
    width = 0.7
) {

    page.push(
        `${pdfRgb(color)} RG ${width} w ${x1.toFixed(2)} ${(841.89 - y1).toFixed(2)} m ${x2.toFixed(2)} ${(841.89 - y2).toFixed(2)} l S`
    );

}


function pdfFitText(
    value,
    maxChars
) {

    const text = String(value ?? '');

    if (text.length <= maxChars) {
        return text;
    }

    return `${text.slice(0, Math.max(maxChars - 3, 1))}...`;

}


function pdfDrawHeader(
    page,
    model,
    pageTitle = 'Relatório consolidado'
) {

    pdfRect(
        page,
        0,
        0,
        595.28,
        92,
        {
            fill: '#183d78'
        }
    );

    pdfRect(
        page,
        0,
        88,
        595.28,
        4,
        {
            fill: '#0799d1'
        }
    );

    pdfText(
        page,
        'INTEGRA · SISTEMA DE PRODUÇÃO ISOLADA',
        40,
        31,
        8,
        {
            bold: true,
            color: '#d8e7f7'
        }
    );

    pdfText(
        page,
        'Integra',
        40,
        51,
        17,
        {
            bold: true,
            color: '#ffffff'
        }
    );

    pdfText(
        page,
        pageTitle,
        40,
        71,
        9,
        {
            color: '#d8e7f7'
        }
    );

    pdfText(
        page,
        'Integra',
        410,
        40,
        10,
        {
            bold: true,
            color: '#ffffff'
        }
    );

    pdfText(
        page,
        'Produção isolada',
        410,
        58,
        8,
        {
            color: '#d8e7f7'
        }
    );

}


function pdfDrawFooter(
    page,
    pageNumber,
    totalPages,
    model
) {

    pdfLine(
        page,
        40,
        806,
        555,
        806,
        '#dbe3ec',
        0.6
    );

    pdfText(
        page,
        `Gerado em ${formatReportDateTime(model.generatedAt)}`,
        40,
        824,
        7,
        {
            color: '#7e8da0'
        }
    );

    pdfText(
        page,
        `Página ${pageNumber} de ${totalPages}`,
        488,
        824,
        7,
        {
            color: '#7e8da0'
        }
    );

}


function pdfDrawKpi(
    page,
    x,
    y,
    width,
    label,
    value,
    accent
) {

    pdfRect(
        page,
        x,
        y,
        width,
        70,
        {
            fill: '#ffffff',
            stroke: '#dbe3ec',
            lineWidth: 0.7
        }
    );

    pdfRect(
        page,
        x,
        y,
        4,
        70,
        {
            fill: accent
        }
    );

    pdfText(
        page,
        label.toUpperCase(),
        x + 14,
        y + 22,
        7,
        {
            bold: true,
            color: '#66788f'
        }
    );

    pdfText(
        page,
        String(value),
        x + 14,
        y + 48,
        20,
        {
            bold: true,
            color: '#183d78'
        }
    );

}


function pdfDrawSectionTitle(
    page,
    title,
    subtitle,
    y
) {

    pdfText(
        page,
        title,
        40,
        y,
        12,
        {
            bold: true,
            color: '#183d78'
        }
    );

    if (subtitle) {

        pdfText(
            page,
            subtitle,
            40,
            y + 15,
            7,
            {
                color: '#7d8b9c'
            }
        );

    }

}


function pdfDrawTable(
    page,
    config
) {

    const {
        x,
        y,
        widths,
        headers,
        rows,
        rowHeight = 25,
        fontSize = 7,
        alignments = []
    } = config;

    const totalWidth = widths.reduce(
        (sum, value) => sum + value,
        0
    );

    pdfRect(
        page,
        x,
        y,
        totalWidth,
        rowHeight,
        {
            fill: '#eef3f8',
            stroke: '#dbe3ec',
            lineWidth: 0.6
        }
    );

    let currentX = x;

    headers.forEach((header, index) => {

        pdfText(
            page,
            header.toUpperCase(),
            currentX + 7,
            y + 16,
            6.3,
            {
                bold: true,
                color: '#52677e'
            }
        );

        currentX += widths[index];

    });

    let currentY = y + rowHeight;

    rows.forEach((row, rowIndex) => {

        pdfRect(
            page,
            x,
            currentY,
            totalWidth,
            rowHeight,
            {
                fill:
                    rowIndex % 2 === 0
                        ? '#ffffff'
                        : '#fafcfe',
                stroke: '#e6ebf0',
                lineWidth: 0.45
            }
        );

        currentX = x;

        row.forEach((cell, columnIndex) => {

            const alignment =
                alignments[columnIndex] || 'left';

            const cellText = pdfFitText(
                cell,
                Math.max(
                    Math.floor(widths[columnIndex] / 4.3),
                    4
                )
            );

            let textX = currentX + 7;

            if (alignment === 'center') {
                textX = currentX + widths[columnIndex] / 2 - Math.min(cellText.length * fontSize * 0.22, widths[columnIndex] / 2 - 4);
            }

            pdfText(
                page,
                cellText,
                textX,
                currentY + 16,
                fontSize,
                {
                    color:
                        columnIndex === 0
                            ? '#263f59'
                            : '#5b6e83',
                    bold:
                        columnIndex === 0
                }
            );

            currentX += widths[columnIndex];

        });

        currentY += rowHeight;

    });

    return currentY;

}


function buildPdfPages(model) {

    const pages = [];

    /**
     * Página 1 - resumo executivo.
     */
    const page1 = createPdfPage();
    pages.push(page1);

    pdfDrawHeader(
        page1,
        model,
        'Relatório consolidado dos indicadores'
    );

    pdfText(
        page1,
        `Escopo: ${model.scope}`,
        40,
        116,
        8,
        {
            bold: true,
            color: '#3c526a'
        }
    );

    pdfText(
        page1,
        `Fonte: ${pdfFitText(model.sourceName, 74)}`,
        40,
        132,
        7,
        {
            color: '#7a899a'
        }
    );

    const cardGap = 8;
    const cardWidth = (515 - cardGap * 3) / 4;
    const cardY = 151;

    pdfDrawKpi(
        page1,
        40,
        cardY,
        cardWidth,
        'Equipes',
        formatReportNumber(model.summary.teamCount),
        '#2455a4'
    );

    pdfDrawKpi(
        page1,
        40 + cardWidth + cardGap,
        cardY,
        cardWidth,
        'Sem domicílio',
        formatReportNumber(model.summary.semDomicilio),
        '#d1a20b'
    );

    pdfDrawKpi(
        page1,
        40 + (cardWidth + cardGap) * 2,
        cardY,
        cardWidth,
        'Sem acompanhamento',
        formatReportNumber(model.summary.semAcompanhamento),
        '#d14449'
    );

    pdfDrawKpi(
        page1,
        40 + (cardWidth + cardGap) * 3,
        cardY,
        cardWidth,
        'Cobertura registros',
        `${model.summary.monitoredCoverage}%`,
        '#2f7d50'
    );

    pdfDrawSectionTitle(
        page1,
        'Indicadores municipais',
        'Consolidado do escopo selecionado.',
        250
    );

    pdfDrawTable(
        page1,
        {
            x: 40,
            y: 277,
            widths: [170, 78, 88, 92, 87],
            headers: [
                'Indicador',
                'Total',
                'Pendentes',
                'Acompanhados',
                'Cobertura'
            ],
            rows: model.categories.map(item => [
                item.label,
                formatReportNumber(item.total),
                item.pending === null
                    ? '-'
                    : formatReportNumber(item.pending),
                item.accompanied === null
                    ? '-'
                    : formatReportNumber(item.accompanied),
                item.coverage === null
                    ? '-'
                    : `${item.coverage}%`
            ]),
            alignments: [
                'left',
                'center',
                'center',
                'center',
                'center'
            ]
        }
    );

    pdfDrawSectionTitle(
        page1,
        'Boas práticas',
        'Conformidade agregada por grupo assistencial.',
        535
    );

    const practiceRows = model.practices.map(item => [
        item.label,
        `${item.coverage}%`,
        getReportRiskLabel(item.coverage)
    ]);

    pdfDrawTable(
        page1,
        {
            x: 40,
            y: 562,
            widths: [235, 105, 175],
            headers: [
                'Grupo',
                'Conformidade',
                'Situação visual'
            ],
            rows: practiceRows,
            rowHeight: 25,
            alignments: [
                'left',
                'center',
                'center'
            ]
        }
    );

    /**
     * Páginas de equipes.
     */
    const sortedTeams = [...model.teams]
        .sort(
            (a, b) =>
                String(a.equipe || '')
                    .localeCompare(
                        String(b.equipe || ''),
                        'pt-BR'
                    )
        );

    const perPage = 22;

    for (
        let start = 0;
        start < sortedTeams.length;
        start += perPage
    ) {

        const page = createPdfPage();
        pages.push(page);

        pdfDrawHeader(
            page,
            model,
            'Detalhamento por equipe'
        );

        pdfText(
            page,
            `Escopo: ${model.scope}`,
            40,
            117,
            8,
            {
                bold: true,
                color: '#3c526a'
            }
        );

        const currentTeams = sortedTeams.slice(
            start,
            start + perPage
        );

        pdfDrawTable(
            page,
            {
                x: 24,
                y: 140,
                widths: [148, 84, 45, 50, 42, 42, 42, 45, 38, 39],
                headers: [
                    'Equipe',
                    'INE',
                    'S/Dom.',
                    'S/Acomp.',
                    'Crian.',
                    'Gest.',
                    'Diab.',
                    'Hiper.',
                    'Idoso',
                    'Mulher'
                ],
                rows: currentTeams.map(team => [
                    team.equipe || '',
                    team.ine || '',
                    formatReportNumber(team.sem_domicilio || 0),
                    formatReportNumber(team.sem_acompanhamento || 0),
                    formatReportNumber(team.crianca_total || 0),
                    formatReportNumber(team.gestante_total || 0),
                    formatReportNumber(team.diabetes_total || 0),
                    formatReportNumber(team.hipertenso_total || 0),
                    formatReportNumber(team.idoso_total || 0),
                    formatReportNumber(team.mulher_total || 0)
                ]),
                rowHeight: 27,
                fontSize: 6.1,
                alignments: [
                    'left',
                    'left',
                    'center',
                    'center',
                    'center',
                    'center',
                    'center',
                    'center',
                    'center',
                    'center'
                ]
            }
        );

    }

    const totalPages = pages.length;

    pages.forEach((page, index) => {
        pdfDrawFooter(
            page,
            index + 1,
            totalPages,
            model
        );
    });

    return pages;

}


function buildPdfBinary(pages) {

    const objects = [];

    const addObject = content => {
        objects.push(content);
        return objects.length;
    };

    const catalogNumber = addObject('');
    const pagesNumber = addObject('');

    const regularFontNumber = addObject(
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
    );

    const boldFontNumber = addObject(
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
    );

    const pageNumbers = [];

    pages.forEach(page => {

        const stream = page.join('\n');

        const contentNumber = addObject(
            `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
        );

        const pageNumber = addObject(
            `<< /Type /Page /Parent ${pagesNumber} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${regularFontNumber} 0 R /F2 ${boldFontNumber} 0 R >> >> /Contents ${contentNumber} 0 R >>`
        );

        pageNumbers.push(pageNumber);

    });

    objects[catalogNumber - 1] =
        `<< /Type /Catalog /Pages ${pagesNumber} 0 R >>`;

    objects[pagesNumber - 1] =
        `<< /Type /Pages /Kids [${pageNumbers.map(number => `${number} 0 R`).join(' ')}] /Count ${pageNumbers.length} >>`;

    const encoder = new TextEncoder();
    const parts = [];
    const offsets = [0];

    const header = '%PDF-1.4\n%SIAPS\n';
    parts.push(header);

    let byteLength = encoder.encode(header).length;

    objects.forEach((object, index) => {

        offsets[index + 1] = byteLength;

        const block =
            `${index + 1} 0 obj\n${object}\nendobj\n`;

        parts.push(block);
        byteLength += encoder.encode(block).length;

    });

    const xrefOffset = byteLength;

    let xref =
        `xref\n0 ${objects.length + 1}\n` +
        '0000000000 65535 f \n';

    for (
        let index = 1;
        index <= objects.length;
        index++
    ) {

        xref +=
            `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;

    }

    const trailer =
        `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNumber} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    parts.push(xref);
    parts.push(trailer);

    return encoder.encode(
        parts.join('')
    );

}


async function baixarRelatorioPDF() {

    if (!ensureExportData()) {
        return;
    }

    try {
        const model = buildReportModel();
        const pages = buildPdfPages(model);
        const bytes = buildPdfBinary(pages);

        await saveIntegraFile({
            title: 'Salvar relatório PDF',
            fileName: buildReportFileName('pdf'),
            extension: 'pdf',
            mimeType: 'application/pdf',
            bytes
        });

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        window.alert(error.message || 'Não foi possível salvar o PDF do relatório.');
    }

}


/**
 * =========================================================
 * IMPRESSÃO DO RELATÓRIO
 * =========================================================
 */

function imprimirRelatorio() {

    if (!ensureExportData()) {
        return;
    }

    if (typeof isIntegraTauriDesktop === 'function' && isIntegraTauriDesktop()) {
        baixarRelatorioPDF();
        return;
    }

    const model = buildReportModel();

    const printWindow = window.open(
        '',
        '_blank',
        'width=1200,height=850'
    );

    if (!printWindow) {

        alert(
            'O navegador bloqueou a janela de impressão. Permita pop-ups para este arquivo e tente novamente.'
        );

        return;

    }

    printWindow.document.open();
    printWindow.document.write(
        buildPrintableReportHtml(model)
    );
    printWindow.document.close();

    printWindow.focus();

    window.setTimeout(
        () => {
            printWindow.print();
        },
        350
    );

}


function buildPrintableReportHtml(model) {

    const categoryRows = model.categories
        .map(item => `
            <tr>
                <td>${escapeReportHtml(item.label)}</td>
                <td>${formatReportNumber(item.total)}</td>
                <td>${item.pending === null ? '-' : formatReportNumber(item.pending)}</td>
                <td>${item.accompanied === null ? '-' : formatReportNumber(item.accompanied)}</td>
                <td>${item.coverage === null ? '-' : `${item.coverage}%`}</td>
            </tr>
        `)
        .join('');

    const practiceRows = model.practices
        .map(item => `
            <tr>
                <td>${escapeReportHtml(item.label)}</td>
                <td>${item.coverage}%</td>
                <td>${getReportRiskLabel(item.coverage)}</td>
            </tr>
        `)
        .join('');

    const teamRows = model.teams
        .map(team => `
            <tr>
                <td>
                    <strong>${escapeReportHtml(team.equipe || '')}</strong>
                    <small>INE ${escapeReportHtml(team.ine || '')}</small>
                </td>
                <td>${formatReportNumber(team.sem_domicilio || 0)}</td>
                <td>${formatReportNumber(team.sem_acompanhamento || 0)}</td>
                <td>${formatReportNumber(team.crianca_total || 0)}</td>
                <td>${formatReportNumber(team.gestante_total || 0)}</td>
                <td>${formatReportNumber(team.diabetes_total || 0)}</td>
                <td>${formatReportNumber(team.hipertenso_total || 0)}</td>
                <td>${formatReportNumber(team.idoso_total || 0)}</td>
                <td>${formatReportNumber(team.mulher_total || 0)}</td>
            </tr>
        `)
        .join('');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório - Integra</title>

    <style>
        @page {
            size: A4 portrait;
            margin: 12mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: #ffffff;
            color: #17304f;
            font-family: Arial, "Segoe UI", sans-serif;
            font-size: 11px;
        }

        .report {
            width: 100%;
        }

        .header {
            padding: 22px 24px;
            margin-bottom: 18px;
            color: #ffffff;
            background: #183d78;
            border-bottom: 4px solid #0799d1;
        }

        .header__top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
        }

        .kicker {
            display: block;
            margin-bottom: 5px;
            color: #d6e7f8;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: .8px;
            text-transform: uppercase;
        }

        h1 {
            margin: 0;
            font-size: 23px;
            font-weight: 700;
        }

        .header p {
            margin: 7px 0 0;
            color: #d6e7f8;
            line-height: 1.4;
        }

        .municipality {
            text-align: right;
            white-space: nowrap;
        }

        .municipality strong,
        .municipality span {
            display: block;
        }

        .municipality span {
            margin-top: 4px;
            color: #d6e7f8;
            font-size: 9px;
        }

        .meta {
            margin-bottom: 15px;
            padding: 10px 12px;
            border: 1px solid #dbe3ec;
            border-left: 4px solid #2455a4;
            background: #f8fafc;
        }

        .meta strong {
            color: #183d78;
        }

        .meta div + div {
            margin-top: 3px;
        }

        .kpis {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 7px;
            margin-bottom: 20px;
        }

        .kpi {
            min-height: 72px;
            padding: 11px 12px;
            border: 1px solid #dbe3ec;
            border-left: 4px solid #2455a4;
            background: #ffffff;
        }

        .kpi.warning { border-left-color: #c48a14; }
        .kpi.danger { border-left-color: #b84444; }
        .kpi.success { border-left-color: #2f7d50; }

        .kpi span {
            display: block;
            color: #65758a;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .kpi strong {
            display: block;
            margin-top: 9px;
            color: #183d78;
            font-size: 20px;
        }

        .section {
            margin-top: 18px;
            page-break-inside: avoid;
        }

        .section h2 {
            margin: 0 0 4px;
            color: #183d78;
            font-size: 15px;
        }

        .section > p {
            margin: 0 0 9px;
            color: #7b8999;
            font-size: 9px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        th {
            padding: 7px;
            text-align: left;
            color: #52677e;
            background: #eef3f8;
            border: 1px solid #dbe3ec;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
        }

        td {
            padding: 7px;
            color: #52677e;
            border: 1px solid #e5eaf0;
            font-size: 8.5px;
            vertical-align: top;
        }

        tbody tr:nth-child(even) {
            background: #fafcfe;
        }

        td strong {
            display: block;
            color: #263f59;
            font-weight: 600;
        }

        td small {
            display: block;
            margin-top: 2px;
            color: #8795a5;
            font-size: 7px;
        }

        .footer {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #dbe3ec;
            color: #7e8da0;
            font-size: 8px;
        }

        .print-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-bottom: 14px;
        }

        .print-actions button {
            height: 34px;
            padding: 0 12px;
            border: 1px solid #2455a4;
            background: #2455a4;
            color: #ffffff;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
        }

        @media print {
            .print-actions {
                display: none !important;
            }

            .section--teams {
                page-break-before: always;
            }

            thead {
                display: table-header-group;
            }

            tr {
                page-break-inside: avoid;
            }
        }
    </style>
</h
<style id="siaps-dark-import-fix">
/* =========================================================
   SIAPS - CORRECAO DARK MODE / IMPORTACAO E HISTORICO
   Mantem a interface escura coerente sem alterar interacoes.
========================================================= */
html[data-theme="dark"] #sectionImport .import-card--simple,
html[data-theme="dark"] #sectionImport .history-card--simple {
    background: #111c27 !important;
    border-color: #31465a !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, .18) !important;
}

html[data-theme="dark"] #sectionImport .import-card__top h2,
html[data-theme="dark"] #sectionImport .history-card__header h2,
html[data-theme="dark"] #sectionImport .data-status-card__text strong {
    color: #e6eef7 !important;
}

html[data-theme="dark"] #sectionImport .import-card__top p,
html[data-theme="dark"] #sectionImport .data-status-card__text p,
html[data-theme="dark"] #sectionImport .history-card__header p {
    color: #9eb0c2 !important;
}

html[data-theme="dark"] #sectionImport .upload-dropzone {
    background: #0d1721 !important;
    border-color: #49647e !important;
    color: #e6eef7 !important;
}

html[data-theme="dark"] #sectionImport .upload-dropzone:hover,
html[data-theme="dark"] #sectionImport .upload-dropzone.drag {
    background: #122235 !important;
    border-color: #6aa8f2 !important;
    box-shadow: inset 0 0 0 1px rgba(106, 168, 242, .12) !important;
}

html[data-theme="dark"] #sectionImport .upload-dropzone__graphic {
    background: #142231 !important;
    border-color: #3d5872 !important;
}

html[data-theme="dark"] #sectionImport .upload-dropzone__line,
html[data-theme="dark"] #sectionImport .upload-dropzone__arrow,
html[data-theme="dark"] #sectionImport .upload-dropzone__arrow::before,
html[data-theme="dark"] #sectionImport .upload-dropzone__arrow::after {
    background: #72b0f5 !important;
}

html[data-theme="dark"] #sectionImport .upload-dropzone__content strong {
    color: #e6eef7 !important;
}

html[data-theme="dark"] #sectionImport .upload-dropzone__content span {
    color: #94a9bd !important;
}

html[data-theme="dark"] #sectionImport .upload-format {
    background: #162a3e !important;
    color: #a9cff7 !important;
    border: 1px solid #2f4c68 !important;
}

html[data-theme="dark"] #sectionImport .data-status-card--compact {
    background: #101b26 !important;
    border-color: #31465a !important;
}

html[data-theme="dark"] #sectionImport .data-status-card--compact .data-status-card__text > span {
    color: #8da3b8 !important;
    border-color: #31465a !important;
}

html[data-theme="dark"] #sectionImport .history-card__summary {
    background: #172636 !important;
    border: 1px solid #32485e !important;
    color: #aebfd0 !important;
}

html[data-theme="dark"] #sectionImport .history-empty {
    background: #0d1721 !important;
    border-color: #435d75 !important;
}

html[data-theme="dark"] #sectionImport .history-empty strong {
    color: #cdd9e5 !important;
}

html[data-theme="dark"] #sectionImport .history-empty span {
    color: #8fa5b9 !important;
}

html[data-theme="dark"] #sectionImport .history-notice--info {
    background: #10263a !important;
    border-color: #2d5478 !important;
    color: #a8cff6 !important;
}

html[data-theme="dark"] #sectionImport .history-notice--success {
    background: #10291f !important;
    border-color: #2b5943 !important;
    color: #a6d9bb !important;
}

html[data-theme="dark"] #sectionImport .history-notice--error,
html[data-theme="dark"] #sectionImport .history-empty--error {
    background: #32191c !important;
    border-color: #6d3439 !important;
    color: #efb2b5 !important;
}

html[data-theme="dark"] #sectionImport .history-item {
    background: #101b26 !important;
    border-color: #30465a !important;
    border-left-color: #45627c !important;
}

html[data-theme="dark"] #sectionImport .history-item.is-active {
    background: #12263a !important;
    border-color: #3f668c !important;
    border-left-color: #6aa8f2 !important;
}

html[data-theme="dark"] #sectionImport .history-item__main > strong {
    color: #e5edf6 !important;
}

html[data-theme="dark"] #sectionImport .history-item__meta,
html[data-theme="dark"] #sectionImport .history-item__main > small {
    color: #93a8bc !important;
}

html[data-theme="dark"] #sectionImport .history-badge {
    background: #1b2b3a !important;
    border: 1px solid #31495f !important;
    color: #aebfd0 !important;
}

html[data-theme="dark"] #sectionImport .history-badge--period {
    background: #15304a !important;
    border-color: #2d5c88 !important;
    color: #8fc0ff !important;
}

html[data-theme="dark"] #sectionImport .history-action {
    background: #14212d !important;
    border-color: #3a5066 !important;
    color: #b8c6d4 !important;
}

html[data-theme="dark"] #sectionImport .history-action:hover {
    background: #192d40 !important;
    border-color: #6aa8f2 !important;
    color: #8fc0ff !important;
}

html[data-theme="dark"] #sectionImport .history-action--primary {
    background: #2d6fbd !important;
    border-color: #4387d3 !important;
    color: #ffffff !important;
}

html[data-theme="dark"] #sectionImport .history-action--danger {
    background: #2a181b !important;
    border-color: #61363b !important;
    color: #e7a1a6 !important;
}

html[data-theme="dark"] #sectionImport .up-fname {
    background: #101b26 !important;
    border-color: #31465a !important;
    color: #c3d0dc !important;
}

html[data-theme="dark"] #sectionImport .up-status.loading {
    background: #10263a !important;
    border-color: #2f5578 !important;
    color: #a9cff7 !important;
}

html[data-theme="dark"] #sectionImport .up-status.success {
    background: #10291f !important;
    border-color: #2b5943 !important;
    color: #a6d9bb !important;
}

html[data-theme="dark"] #sectionImport .up-status.error {
    background: #32191c !important;
    border-color: #6d3439 !important;
    color: #efb2b5 !important;
}

html[data-theme="dark"] #sectionImport .btn-primary {
    background: #4f92df !important;
    border-color: #5da0ea !important;
    color: #ffffff !important;
}

html[data-theme="dark"] #sectionImport .btn-primary:hover {
    background: #66a7ee !important;
    border-color: #78b3f4 !important;
}
</style>
ead>
<body>

    <div class="report">

        <div class="print-actions">
            <button onclick="window.print()">
                Imprimir / Salvar como PDF
            </button>
        </div>

        <header class="header">
            <div class="header__top">
                <div>
                    <span class="kicker">Integra · Sistema de produção isolada</span>
                    <h1>Relatório SIAPS</h1>
                    <p>Consolidado dos indicadores da Atenção Primária à Saúde.</p>
                </div>

                <div class="municipality">
                    <strong>Integra</strong>
                    <span>Sistema de produção isolada</span>
                </div>
            </div>
        </header>

        <div class="meta">
            <div><strong>Escopo:</strong> ${escapeReportHtml(model.scope)}</div>
            <div><strong>Base:</strong> ${escapeReportHtml(model.sourceName)}</div>
            <div><strong>Gerado em:</strong> ${formatReportDateTime(model.generatedAt)}</div>
        </div>

        <div class="kpis">
            <div class="kpi">
                <span>Equipes</span>
                <strong>${formatReportNumber(model.summary.teamCount)}</strong>
            </div>

            <div class="kpi warning">
                <span>Sem domicílio</span>
                <strong>${formatReportNumber(model.summary.semDomicilio)}</strong>
            </div>

            <div class="kpi danger">
                <span>Sem acompanhamento</span>
                <strong>${formatReportNumber(model.summary.semAcompanhamento)}</strong>
            </div>

            <div class="kpi success">
                <span>Cobertura dos registros</span>
                <strong>${model.summary.monitoredCoverage}%</strong>
            </div>
        </div>

        <section class="section">
            <h2>Indicadores municipais</h2>
            <p>Consolidado do escopo atualmente selecionado no painel.</p>

            <table>
                <thead>
                    <tr>
                        <th style="width:34%">Indicador</th>
                        <th>Total</th>
                        <th>Pendentes</th>
                        <th>Acompanhados</th>
                        <th>Cobertura</th>
                    </tr>
                </thead>
                <tbody>
                    ${categoryRows}
                </tbody>
            </table>
        </section>

        <section class="section">
            <h2>Boas práticas</h2>
            <p>Conformidade agregada por grupo assistencial.</p>

            <table>
                <thead>
                    <tr>
                        <th>Grupo</th>
                        <th>Conformidade</th>
                        <th>Situação visual</th>
                    </tr>
                </thead>
                <tbody>
                    ${practiceRows}
                </tbody>
            </table>
        </section>

        <section class="section section--teams">
            <h2>Detalhamento por equipe</h2>
            <p>Distribuição dos principais grupos e pendências por equipe.</p>

            <table>
                <thead>
                    <tr>
                        <th style="width:25%">Equipe</th>
                        <th>Sem dom.</th>
                        <th>Sem acomp.</th>
                        <th>Crianças</th>
                        <th>Gestantes</th>
                        <th>Diabetes</th>
                        <th>Hipertensão</th>
                        <th>Idosos</th>
                        <th>Mulheres</th>
                    </tr>
                </thead>
                <tbody>
                    ${teamRows}
                </tbody>
            </table>
        </section>

        <div class="footer">
            Integra · Sistema de produção isolada
        </div>

    </div>

</body>
</html>
    `;

}


/**
 * =========================================================
 * AUXILIARES
 * =========================================================
 */

function getReportRiskLabel(value) {

    const number = Number(value || 0);

    if (number >= 80) {
        return 'Adequado';
    }

    if (number >= 60) {
        return 'Atenção';
    }

    if (number >= 40) {
        return 'Alerta';
    }

    return 'Crítico';

}


function formatReportNumber(value) {

    return Number(value || 0)
        .toLocaleString('pt-BR');

}


function formatReportDateTime(date) {

    return new Intl.DateTimeFormat(
        'pt-BR',
        {
            dateStyle: 'short',
            timeStyle: 'short'
        }
    ).format(date);

}


function buildReportFileName(extension) {

    const now = new Date();

    const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');

    const municipality = String(CONFIG.municipio || 'municipio')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    return `Relatorio_SIAPS_${municipality}_${stamp}.${extension}`;

}


function escapeReportHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

}
