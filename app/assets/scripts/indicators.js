/**
 * =========================================================
 * INDICATORS.JS
 * =========================================================
 *
 * Responsável por:
 * - ler as bases SIAPS já interpretadas pelo parser;
 * - cruzar CPF/CNS;
 * - identificar equipes;
 * - calcular pacientes sem domicílio;
 * - calcular pacientes sem acompanhamento;
 * - processar grupos assistenciais;
 * - calcular boas práticas;
 * - preencher:
 *
 *      D
 *      L
 *      GC
 *      GL
 *
 * Dependências:
 *
 * parser.js:
 * - findSheet()
 * - sheetToObjects()
 * - getField()
 * - normIne()
 * - onlyDigitsStr()
 * - fmtDate()
 * - isFilled()
 *
 * state.js:
 * - D
 * - L
 * - GC
 * - GL
 */


/**
 * =========================================================
 * BOAS PRÁTICAS
 * =========================================================
 */

const PR = {

    crianca: [
        '1ª Consulta (30 dias)',
        '9 Consultas',
        '9 Peso/Altura',
        '2 Visitas ACS',
        'Vacina'
    ],


    gestante: [
        'Início até 12ª sem.',
        '07 Consultas',
        '07 Aferição Pressão',
        '07 Peso/Altura',
        '03 Visitas ACS',
        'Vacina',
        'Teste Rápido 1º Tri.',
        'Teste Rápido 3º Tri.',
        'Consulta Puerpério',
        'Visita ACS Puerpério',
        'Consulta Odonto'
    ],


    diabetes: [
        'Consulta',
        'Aferição Pressão',
        '2 Visitas ACS',
        'Peso/Altura',
        'Hemoglobina Glicada',
        'Avaliação dos Pés'
    ],


    hipertenso: [
        'Consulta',
        'Aferição de Pressão',
        '2 Visitas ACS',
        'Peso e Altura'
    ],


    idoso: [
        'Consulta',
        '2 Peso/Altura',
        '2 Visitas ACS',
        'Vacina'
    ],


    mulher: [
        'Citopatológico (Colo)',
        'Vacina HPV',
        'Saúde Sexual',
        'Mamografia'
    ]

};


/**
 * =========================================================
 * MAPEAMENTO DAS COLUNAS
 * =========================================================
 */

const COLMAP = {

    crianca: {

        '1ª Consulta (30 dias)':
            '1 consulta - 30 dias',

        '9 Consultas':
            '9 consultas',

        '9 Peso/Altura':
            '9 peso/altura',

        '2 Visitas ACS':
            '2 visitas do ACS',

        'Vacina':
            'Vacina'

    },


    gestante: {

        'Início até 12ª sem.':
            'Iniciado até 12 semana',

        '07 Consultas':
            '07 consultas',

        '07 Aferição Pressão':
            '07 aferição de pressão',

        '07 Peso/Altura':
            '07 peso/altura',

        '03 Visitas ACS':
            '03 visita ACS',

        'Vacina':
            'Vacina',

        'Teste Rápido 1º Tri.':
            'Teste rápido 1 trimestre',

        'Teste Rápido 3º Tri.':
            'Teste rápido 3 trimestre',

        'Consulta Puerpério':
            'Consulta puerpério',

        'Visita ACS Puerpério':
            'Visita ACS puerperio',

        'Consulta Odonto':
            'Consulta odonto'

    },


    diabetes: {

        'Consulta':
            'Consulta',

        'Aferição Pressão':
            'Aferição pressão',

        '2 Visitas ACS':
            '2 visitas ACS',

        'Peso/Altura':
            'Peso/altura',

        'Hemoglobina Glicada':
            'Hemoglobina glicada',

        'Avaliação dos Pés':
            'Avaliação dos pés'

    },


    hipertenso: {

        'Consulta':
            'Consulta',

        'Aferição de Pressão':
            'Aferição de pressão',

        '2 Visitas ACS':
            '2 visitas ACS',

        'Peso e Altura':
            'Peso e altura'

    },


    idoso: {

        'Consulta':
            'Consulta',

        '2 Peso/Altura':
            '2 peso/altura',

        '2 Visitas ACS':
            '2 visita do ACS',

        'Vacina':
            'Vacina'

    },


    mulher: {

        'Citopatológico (Colo)':
            'NM.A',

        'Vacina HPV':
            'NM.B',

        'Saúde Sexual':
            'NM.C',

        'Mamografia':
            'NM.D'

    }

};


/**
 * =========================================================
 * PROCESSAMENTO PRINCIPAL
 * =========================================================
 */

function buildDataFromWorkbook(workbook) {

    console.log(
        'Iniciando construção dos indicadores...'
    );


    /**
     * =====================================================
     * CARREGA AS ABAS
     * =====================================================
     */

    const esusRows =
        sheetToObjects(
            findSheet(
                workbook,
                'ESUSBase',
                'ESUS',
                'ESUS Base'
            )
        );


    const vinculoRows =
        sheetToObjects(
            findSheet(
                workbook,
                'VinculoBase',
                'Vinculo',
                'Vínculo',
                'VinculoBASE'
            )
        );


    const criancaRows =
        sheetToObjects(
            findSheet(
                workbook,
                'CriancaBase',
                'Criança',
                'CriancaBASE',
                'CriançaBase'
            )
        );


    const gestanteRows =
        sheetToObjects(
            findSheet(
                workbook,
                'GestanteBase',
                'Gestante',
                'GestanteBASE'
            )
        );


    const diabetesRows =
        sheetToObjects(
            findSheet(
                workbook,
                'DiabetesBase',
                'Diabetes',
                'DiabetesBASE'
            )
        );


    const hasRows =
        sheetToObjects(
            findSheet(
                workbook,
                'HASBASE',
                'HASBase',
                'HAS Base',
                'HAS'
            )
        );


    const idosoRows =
        sheetToObjects(
            findSheet(
                workbook,
                'IdosoBase',
                'Idoso',
                'IdosoBASE'
            )
        );


    const mulherRows =
        sheetToObjects(
            findSheet(
                workbook,
                'MulherBase',
                'Mulher',
                'MulherBASE'
            )
        );


    /**
     * =====================================================
     * ESUSBASE É OBRIGATÓRIA
     * =====================================================
     */

    if (!esusRows.length) {

        throw new Error(
            'A aba "ESUSBase" não foi encontrada ou está vazia.'
        );

    }


    /**
     * =====================================================
     * DIAGNÓSTICO
     * =====================================================
     */

    window._siapsDiag = [

        {
            nome: 'ESUSBase',
            linhas: esusRows.length
        },

        {
            nome: 'VinculoBase',
            linhas: vinculoRows.length
        },

        {
            nome: 'CriancaBase',
            linhas: criancaRows.length
        },

        {
            nome: 'GestanteBase',
            linhas: gestanteRows.length
        },

        {
            nome: 'DiabetesBase',
            linhas: diabetesRows.length
        },

        {
            nome: 'HASBASE',
            linhas: hasRows.length
        },

        {
            nome: 'IdosoBase',
            linhas: idosoRows.length
        },

        {
            nome: 'MulherBase',
            linhas: mulherRows.length
        }

    ];


    console.table(
        window._siapsDiag
    );


    /**
     * =====================================================
     * EQUIPES
     * =====================================================
     *
     * INE -> Nome da equipe
     */

    const teamsMap = {};


    esusRows.forEach(row => {

        const ine =
            normIne(
                getField(
                    row,
                    'INE equipe',
                    'INE'
                )
            );


        if (!ine) {
            return;
        }


        const nomeEquipe =
            getField(
                row,
                'Nome equipe',
                'Nome da equipe',
                'Equipe'
            );


        if (nomeEquipe) {

            teamsMap[ine] =
                String(nomeEquipe).trim();

        }

    });


    /**
     * =====================================================
     * LOOKUP DOS PACIENTES
     * =====================================================
     *
     * ESUSBase pode possuir CPF OU CNS dentro
     * da coluna CPF/CNS.
     */

    const cpfToName = {};
    const cnsToName = {};

    const cpfToDob = {};
    const cnsToDob = {};


    esusRows.forEach(row => {

        const rawIdentifier =
            getField(
                row,
                'CPF/CNS',
                'CPF / CNS',
                'CPF',
                'CNS'
            );


        const digits =
            onlyDigitsStr(
                rawIdentifier
            );


        if (!digits) {
            return;
        }


        const nome =
            getField(
                row,
                'Nome',
                'Nome do usuário',
                'Nome do paciente'
            );


        const nascimentoRaw =
            getField(
                row,
                'Data de nascimento',
                'Nascimento'
            );


        const nascimento =
            isFilled(nascimentoRaw)
                ? fmtDate(nascimentoRaw)
                : '';


        /**
         * CPF normal.
         */
        if (digits.length === 11) {

            cpfToName[digits] =
                nome || '(Nome não informado)';


            if (nascimento) {

                cpfToDob[digits] =
                    nascimento;

            }

        }


        /**
         * CPF que perdeu zero inicial
         * por ter sido interpretado como número.
         */
        else if (digits.length === 10) {

            const cpf =
                digits.padStart(
                    11,
                    '0'
                );


            cpfToName[cpf] =
                nome || '(Nome não informado)';


            if (nascimento) {

                cpfToDob[cpf] =
                    nascimento;

            }

        }


        /**
         * CNS.
         */
        else if (digits.length === 15) {

            cnsToName[digits] =
                nome || '(Nome não informado)';


            if (nascimento) {

                cnsToDob[digits] =
                    nascimento;

            }

        }

    });


    /**
     * =====================================================
     * NORMALIZA CPF
     * =====================================================
     */

    function normCpf11(value) {

        const digits =
            onlyDigitsStr(value);


        if (!digits) {
            return '';
        }


        if (digits.length === 10) {

            return digits.padStart(
                11,
                '0'
            );

        }


        return digits;

    }


    /**
     * =====================================================
     * NORMALIZA CNS
     * =====================================================
     */

    function normCns15(value) {

        const digits =
            onlyDigitsStr(value);


        if (!digits) {
            return '';
        }


        if (digits.length < 15) {

            return digits.padStart(
                15,
                '0'
            );

        }


        return digits;

    }


    /**
     * =====================================================
     * MONTA OBJETO INTERNO DO PACIENTE
     * =====================================================
     *
     * Estrutura utilizada pelo dashboard:
     *
     * [
     *   nome,
     *   sem_nome,
     *   cpf,
     *   cns,
     *   nascimento
     * ]
     */

    function makePatient(
        cpfRaw,
        cnsRaw
    ) {

        const cpf =
            normCpf11(
                cpfRaw
            );


        const cns =
            normCns15(
                cnsRaw
            );


        let nome =
            (
                cpf &&
                cpfToName[cpf]
            )
            ||
            (
                cns &&
                cnsToName[cns]
            )
            ||
            '(Nome não informado)';


        const semNome =
            nome ===
                '(Nome não informado)'
                ? 1
                : 0;


        const nascimento =
            (
                cpf &&
                cpfToDob[cpf]
            )
            ||
            (
                cns &&
                cnsToDob[cns]
            )
            ||
            '';


        return [
            nome,
            semNome,
            cpf,
            cns,
            nascimento
        ];

    }


    /**
     * =====================================================
     * VÍNCULO
     * =====================================================
     */

    const semDomicilio = {};
    const semAcompanhamento = {};

    const vinculoByIne = {};


    vinculoRows.forEach(row => {

        const ine =
            normIne(
                getField(
                    row,
                    'INE'
                )
            );


        if (!ine) {
            return;
        }


        if (!vinculoByIne[ine]) {

            vinculoByIne[ine] = [];

        }


        vinculoByIne[ine].push(
            row
        );

    });


    Object.keys(
        vinculoByIne
    ).forEach(ine => {

        const rows =
            vinculoByIne[ine];


        const semDomicilioEquipe = [];
        const semAcompanhamentoEquipe = [];


        rows.forEach(row => {

            const paciente =
                makePatient(
                    getField(
                        row,
                        'CPF'
                    ),
                    getField(
                        row,
                        'CNS'
                    )
                );


            const cadastroIndividual =
                String(
                    getField(
                        row,
                        'Cadastro Individual'
                    )
                    || ''
                )
                    .trim()
                    .toUpperCase()
                === 'X';


            const cadastroDomiciliar =
                isFilled(
                    getField(
                        row,
                        'Cadastro Individual e Cadastro Domiciliar'
                    )
                );


            const pessoaVinculada =
                String(
                    getField(
                        row,
                        'Pessoa Vinculada à Equipe',
                        'Pessoa Vinculada a Equipe'
                    )
                    || ''
                )
                    .trim()
                    .toUpperCase()
                === 'X';


            /**
             * Tem cadastro individual,
             * mas não possui cadastro domiciliar.
             */
            if (
                cadastroIndividual &&
                !cadastroDomiciliar
            ) {

                semDomicilioEquipe.push(
                    paciente
                );

            }


            /**
             * Não está vinculada à equipe.
             */
            if (!pessoaVinculada) {

                semAcompanhamentoEquipe.push(
                    paciente
                );

            }

        });


        semDomicilio[ine] =
            semDomicilioEquipe;


        semAcompanhamento[ine] =
            semAcompanhamentoEquipe;

    });


    /**
     * =====================================================
     * PROCESSAMENTO GENÉRICO DAS BASES
     * =====================================================
     */

    function processBase(
        rows,
        practiceList,
        columnMap,
        acompanhamentoColumns
    ) {

        const columns =
            acompanhamentoColumns
            ||
            ['NM'];


        /**
         * Separa registros por equipe.
         */
        const byIne = {};


        rows.forEach(row => {

            const ine =
                normIne(
                    getField(
                        row,
                        'INE'
                    )
                );


            if (!ine) {
                return;
            }


            if (!byIne[ine]) {

                byIne[ine] = [];

            }


            byIne[ine].push(
                row
            );

        });


        const catAll = {};
        const catNao = {};

        const gc = {};
        const gl = {};


        practiceList.forEach(
            practice => {

                gl[practice] = {};

            }
        );


        Object.keys(
            byIne
        ).forEach(ine => {

            const rowsEquipe =
                byIne[ine];


            const todosPacientes = [];
            const naoAcompanhados = [];


            gc[ine] = {

                total:
                    rowsEquipe.length

            };


            const missing = {};


            practiceList.forEach(
                practice => {

                    missing[practice] =
                        [];

                }
            );


            rowsEquipe.forEach(row => {

                const paciente =
                    makePatient(
                        getField(
                            row,
                            'CPF'
                        ),
                        getField(
                            row,
                            'CNS'
                        )
                    );


                todosPacientes.push(
                    paciente
                );


                /**
                 * Um paciente é considerado
                 * acompanhado quando pelo menos
                 * uma das colunas de acompanhamento
                 * está preenchida.
                 */
                const temAcompanhamento =
                    columns.some(
                        column => {

                            return isFilled(
                                getField(
                                    row,
                                    column
                                )
                            );

                        }
                    );


                if (!temAcompanhamento) {

                    naoAcompanhados.push(
                        paciente
                    );

                }


                /**
                 * Verifica boas práticas.
                 */
                practiceList.forEach(
                    practice => {

                        const column =
                            columnMap[
                            practice
                            ];


                        if (!column) {
                            return;
                        }


                        const value =
                            getField(
                                row,
                                column
                            );


                        if (!isFilled(value)) {

                            missing[
                                practice
                            ].push(
                                paciente
                            );

                        }

                    }
                );

            });


            catAll[ine] =
                todosPacientes;


            catNao[ine] =
                naoAcompanhados;


            practiceList.forEach(
                practice => {

                    /**
                     * Quantidade pendente.
                     */
                    gc[ine][practice] =
                        missing[
                            practice
                        ].length;


                    /**
                     * Lista de pacientes pendentes.
                     */
                    gl[practice][ine] =
                        missing[
                        practice
                        ];

                }
            );

        });


        return {

            catAll,
            catNao,
            gc,
            gl

        };

    }


    /**
     * =====================================================
     * PROCESSA CATEGORIAS
     * =====================================================
     */

    const crianca =
        processBase(
            criancaRows,
            PR.crianca,
            COLMAP.crianca
        );


    const gestante =
        processBase(
            gestanteRows,
            PR.gestante,
            COLMAP.gestante
        );


    const diabetes =
        processBase(
            diabetesRows,
            PR.diabetes,
            COLMAP.diabetes
        );


    const hipertenso =
        processBase(
            hasRows,
            PR.hipertenso,
            COLMAP.hipertenso
        );


    const idoso =
        processBase(
            idosoRows,
            PR.idoso,
            COLMAP.idoso
        );


    /**
     * =====================================================
     * MULHER
     * =====================================================
     *
     * Mulher é diferente.
     *
     * Cada indicador possui denominador próprio:
     *
     * DN.A -> NM.A
     * DN.B -> NM.B
     * DN.C -> NM.C
     * DN.D -> NM.D
     */

    const mulherDnMap = {

        'NM.A': 'DN.A',
        'NM.B': 'DN.B',
        'NM.C': 'DN.C',
        'NM.D': 'DN.D'

    };


    const mulher =
        (() => {

            const practiceList =
                PR.mulher;


            const columnMap =
                COLMAP.mulher;


            const byIne = {};


            mulherRows.forEach(
                row => {

                    const ine =
                        normIne(
                            getField(
                                row,
                                'INE'
                            )
                        );


                    if (!ine) {
                        return;
                    }


                    if (!byIne[ine]) {

                        byIne[ine] =
                            [];

                    }


                    byIne[ine].push(
                        row
                    );

                }
            );


            const catAll = {};
            const catNao = {};

            const gc = {};
            const gl = {};


            practiceList.forEach(
                practice => {

                    gl[practice] =
                        {};

                }
            );


            Object.keys(
                byIne
            ).forEach(ine => {

                const rowsEquipe =
                    byIne[ine];


                const todosPacientes = [];
                const naoAcompanhados = [];


                gc[ine] = {

                    total:
                        rowsEquipe.length

                };


                const missing = {};


                practiceList.forEach(
                    practice => {

                        missing[
                            practice
                        ] = [];

                    }
                );


                rowsEquipe.forEach(
                    row => {

                        const paciente =
                            makePatient(
                                getField(
                                    row,
                                    'CPF'
                                ),
                                getField(
                                    row,
                                    'CNS'
                                )
                            );


                        todosPacientes.push(
                            paciente
                        );


                        /**
                         * Para Mulher usamos:
                         *
                         * NM
                         * NM.A
                         * NM.B
                         * NM.C
                         * NM.D
                         */
                        const temAcompanhamento =
                            [
                                'NM',
                                'NM.A',
                                'NM.B',
                                'NM.C',
                                'NM.D'
                            ].some(
                                column => {

                                    return isFilled(
                                        getField(
                                            row,
                                            column
                                        )
                                    );

                                }
                            );


                        if (
                            !temAcompanhamento
                        ) {

                            naoAcompanhados.push(
                                paciente
                            );

                        }


                        /**
                         * Processa cada prática.
                         */
                        practiceList.forEach(
                            practice => {

                                const nmColumn =
                                    columnMap[
                                    practice
                                    ];


                                const dnColumn =
                                    mulherDnMap[
                                    nmColumn
                                    ]
                                    ||
                                    null;


                                if (!nmColumn) {
                                    return;
                                }


                                const hasNM =
                                    isFilled(
                                        getField(
                                            row,
                                            nmColumn
                                        )
                                    );


                                const hasDN =
                                    dnColumn
                                        ? isFilled(
                                            getField(
                                                row,
                                                dnColumn
                                            )
                                        )
                                        : hasNM;


                                /**
                                 * Mulher utiliza:
                                 *
                                 * [realizado, elegível]
                                 */
                                if (
                                    !gc[ine][practice]
                                ) {

                                    gc[ine][practice] =
                                        [0, 0];

                                }


                                if (hasDN) {

                                    /**
                                     * Total elegível.
                                     */
                                    gc[ine][practice][1]++;


                                    if (hasNM) {

                                        /**
                                         * Em conformidade.
                                         */
                                        gc[ine][practice][0]++;

                                    } else {

                                        /**
                                         * Elegível mas pendente.
                                         */
                                        missing[
                                            practice
                                        ].push(
                                            paciente
                                        );

                                    }

                                }

                            }
                        );

                    }
                );


                catAll[ine] =
                    todosPacientes;


                catNao[ine] =
                    naoAcompanhados;


                practiceList.forEach(
                    practice => {

                        gl[practice][ine] =
                            missing[
                            practice
                            ];

                    }
                );

            });


            return {

                catAll,
                catNao,
                gc,
                gl

            };

        })();


    /**
     * =====================================================
     * TODAS AS EQUIPES
     * =====================================================
     */

    const allInes =
        new Set([

            /**
             * ESUS.
             */
            ...Object.keys(
                teamsMap
            ),

            /**
             * Vínculo.
             */
            ...Object.keys(
                vinculoByIne
            ),

            /**
             * Especialidades.
             */
            ...Object.keys(
                crianca.catAll
            ),

            ...Object.keys(
                gestante.catAll
            ),

            ...Object.keys(
                diabetes.catAll
            ),

            ...Object.keys(
                hipertenso.catAll
            ),

            ...Object.keys(
                idoso.catAll
            ),

            ...Object.keys(
                mulher.catAll
            )

        ]);


    /**
     * =====================================================
     * D
     * =====================================================
     *
     * Dados consolidados por equipe.
     */

    D = {};


    allInes.forEach(ine => {

        const nomeEquipe =
            teamsMap[ine]
            ||
            (
                'INE ' +
                ine
            );


        D[ine] = {

            ine:
                /^\d+$/.test(ine)
                    ? Number(ine)
                    : ine,


            equipe:
                nomeEquipe,


            /**
             * Vínculo.
             */
            sem_domicilio:
                (
                    semDomicilio[ine]
                    ||
                    []
                ).length,


            sem_acompanhamento:
                (
                    semAcompanhamento[ine]
                    ||
                    []
                ).length,


            /**
             * Criança.
             */
            crianca_total:
                (
                    crianca.catAll[ine]
                    ||
                    []
                ).length,


            crianca_nao_acomp:
                (
                    crianca.catNao[ine]
                    ||
                    []
                ).length,


            /**
             * Gestante.
             */
            gestante_total:
                (
                    gestante.catAll[ine]
                    ||
                    []
                ).length,


            gestante_nao_acomp:
                (
                    gestante.catNao[ine]
                    ||
                    []
                ).length,


            /**
             * Diabetes.
             */
            diabetes_total:
                (
                    diabetes.catAll[ine]
                    ||
                    []
                ).length,


            diabetes_nao_acomp:
                (
                    diabetes.catNao[ine]
                    ||
                    []
                ).length,


            /**
             * Hipertensão.
             */
            hipertenso_total:
                (
                    hipertenso.catAll[ine]
                    ||
                    []
                ).length,


            hipertenso_nao_acomp:
                (
                    hipertenso.catNao[ine]
                    ||
                    []
                ).length,


            /**
             * Idoso.
             */
            idoso_total:
                (
                    idoso.catAll[ine]
                    ||
                    []
                ).length,


            idoso_nao_acomp:
                (
                    idoso.catNao[ine]
                    ||
                    []
                ).length,


            /**
             * Mulher.
             */
            mulher_total:
                (
                    mulher.catAll[ine]
                    ||
                    []
                ).length,


            mulher_nao_acomp:
                (
                    mulher.catNao[ine]
                    ||
                    []
                ).length

        };

    });


    /**
     * =====================================================
     * L
     * =====================================================
     *
     * Listas de pacientes.
     */

    L = {

        sem_domicilio:
            semDomicilio,


        sem_acompanhamento:
            semAcompanhamento,


        crianca:
            crianca.catAll,


        crianca_nao_acomp:
            crianca.catNao,


        gestante:
            gestante.catAll,


        gestante_nao_acomp:
            gestante.catNao,


        diabetes:
            diabetes.catAll,


        diabetes_nao_acomp:
            diabetes.catNao,


        hipertenso:
            hipertenso.catAll,


        hipertenso_nao_acomp:
            hipertenso.catNao,


        idoso:
            idoso.catAll,


        idoso_nao_acomp:
            idoso.catNao,


        mulher:
            mulher.catAll,


        mulher_nao_acomp:
            mulher.catNao

    };


    /**
     * =====================================================
     * GC
     * =====================================================
     *
     * Contadores de boas práticas.
     */

    GC = {

        crianca:
            crianca.gc,


        gestante:
            gestante.gc,


        diabetes:
            diabetes.gc,


        hipertenso:
            hipertenso.gc,


        idoso:
            idoso.gc,


        mulher:
            mulher.gc

    };


    /**
     * =====================================================
     * GL
     * =====================================================
     *
     * Listas de pacientes pendentes
     * por boa prática.
     */

    GL = {

        crianca:
            crianca.gl,


        gestante:
            gestante.gl,


        diabetes:
            diabetes.gl,


        hipertenso:
            hipertenso.gl,


        idoso:
            idoso.gl,


        mulher:
            mulher.gl

    };


    /**
     * =====================================================
     * VALIDA RESULTADO
     * =====================================================
     */

    if (
        Object.keys(D).length === 0
    ) {

        throw new Error(
            'Nenhuma equipe (INE) foi identificada nas abas de dados.'
        );

    }


    console.log(
        'Indicadores construídos com sucesso.'
    );


    console.log(
        'Equipes:',
        D
    );


    console.log(
        'Listas:',
        L
    );


    console.log(
        'Boas práticas:',
        GC
    );

}
