/**
 * =========================================================
 * FUNÇÕES UTILITÁRIAS
 * =========================================================
 *
 * Funções pequenas e reutilizáveis por diferentes
 * partes do sistema.
 */


/**
 * Remove qualquer caractere que não seja número.
 *
 * @param {string} value
 * @returns {string}
 */
function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}


/**
 * Aplica máscara visual de CPF.
 *
 * Exemplo:
 *
 * 00500681309
 *
 * torna-se:
 *
 * 005.006.813-09
 *
 * @param {string} value
 * @returns {string}
 */
function maskCpf(value) {

    let cpf = onlyDigits(value).slice(0, 11);

    cpf = cpf
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    return cpf;
}


/**
 * Gera SHA-256 em formato hexadecimal.
 *
 * Utilizado atualmente para comparar a senha
 * informada com o hash presente em CONFIG.
 *
 * @param {string} text
 * @returns {Promise<string>}
 */
async function sha256Hex(text) {

    /**
     * Web Crypto é a opção preferencial.
     *
     * Em alguns navegadores, páginas abertas diretamente
     * por file:// podem não disponibilizar crypto.subtle.
     * Por isso existe um fallback local abaixo.
     */
    if (
        typeof crypto !== 'undefined' &&
        crypto.subtle &&
        typeof TextEncoder !== 'undefined'
    ) {

        try {

            const encoded =
                new TextEncoder().encode(text);

            const hashBuffer =
                await crypto.subtle.digest(
                    'SHA-256',
                    encoded
                );

            return Array.from(
                new Uint8Array(hashBuffer)
            )
                .map(
                    byte =>
                        byte
                            .toString(16)
                            .padStart(2, '0')
                )
                .join('');

        } catch (error) {

            console.warn(
                'Web Crypto indisponível. Utilizando SHA-256 local.',
                error
            );

        }

    }


    return sha256Fallback(text);
}


/**
 * SHA-256 em JavaScript puro.
 *
 * Utilizado somente como fallback para permitir que o painel
 * funcione ao ser aberto diretamente do computador, sem servidor.
 */
function sha256Fallback(value) {

    function rightRotate(number, amount) {
        return (
            number >>> amount
        ) | (
            number << (32 - amount)
        );
    }


    const maxWord =
        Math.pow(2, 32);

    const words = [];

    const ascii =
        unescape(
            encodeURIComponent(
                String(value)
            )
        );

    const asciiBitLength =
        ascii.length * 8;

    let hash =
        sha256Fallback.h =
            sha256Fallback.h || [];

    let k =
        sha256Fallback.k =
            sha256Fallback.k || [];

    let primeCounter =
        k.length;

    const isComposite = {};


    for (
        let candidate = 2;
        primeCounter < 64;
        candidate++
    ) {

        if (
            !isComposite[candidate]
        ) {

            for (
                let i = 0;
                i < 313;
                i += candidate
            ) {
                isComposite[i] =
                    candidate;
            }


            hash[primeCounter] =
                (
                    Math.pow(
                        candidate,
                        0.5
                    ) *
                    maxWord
                ) | 0;


            k[primeCounter++] =
                (
                    Math.pow(
                        candidate,
                        1 / 3
                    ) *
                    maxWord
                ) | 0;

        }

    }


    let message =
        ascii + '\x80';


    while (
        message.length % 64 !== 56
    ) {
        message += '\x00';
    }


    for (
        let i = 0;
        i < message.length;
        i++
    ) {

        const code =
            message.charCodeAt(i);

        if (
            code >> 8
        ) {
            throw new Error(
                'Falha ao calcular SHA-256.'
            );
        }


        words[i >> 2] |=
            code <<
            (
                (3 - i) % 4
            ) * 8;

    }


    words[
        words.length
    ] =
        (
            asciiBitLength /
            maxWord
        ) | 0;


    words[
        words.length
    ] =
        asciiBitLength;


    hash =
        hash.slice(0, 8);


    for (
        let j = 0;
        j < words.length;
    ) {

        const w =
            words.slice(
                j,
                j += 16
            );

        const oldHash =
            hash.slice(0);

        hash =
            hash.slice(0, 8);


        for (
            let i = 0;
            i < 64;
            i++
        ) {

            const w15 =
                w[i - 15];

            const w2 =
                w[i - 2];


            const a =
                hash[0];

            const e =
                hash[4];


            const temp1 =
                hash[7]
                +
                (
                    rightRotate(
                        e,
                        6
                    )
                    ^
                    rightRotate(
                        e,
                        11
                    )
                    ^
                    rightRotate(
                        e,
                        25
                    )
                )
                +
                (
                    (
                        e &
                        hash[5]
                    )
                    ^
                    (
                        (~e) &
                        hash[6]
                    )
                )
                +
                k[i]
                +
                (
                    w[i] =
                        i < 16
                            ? w[i]
                            : (
                                w[i - 16]
                                +
                                (
                                    rightRotate(
                                        w15,
                                        7
                                    )
                                    ^
                                    rightRotate(
                                        w15,
                                        18
                                    )
                                    ^
                                    (
                                        w15 >>>
                                        3
                                    )
                                )
                                +
                                w[i - 7]
                                +
                                (
                                    rightRotate(
                                        w2,
                                        17
                                    )
                                    ^
                                    rightRotate(
                                        w2,
                                        19
                                    )
                                    ^
                                    (
                                        w2 >>>
                                        10
                                    )
                                )
                            ) | 0
                );


            const temp2 =
                (
                    rightRotate(
                        a,
                        2
                    )
                    ^
                    rightRotate(
                        a,
                        13
                    )
                    ^
                    rightRotate(
                        a,
                        22
                    )
                )
                +
                (
                    (
                        a &
                        hash[1]
                    )
                    ^
                    (
                        a &
                        hash[2]
                    )
                    ^
                    (
                        hash[1] &
                        hash[2]
                    )
                );


            hash =
                [
                    (
                        temp1 +
                        temp2
                    ) | 0
                ]
                    .concat(hash);


            hash[4] =
                (
                    hash[4] +
                    temp1
                ) | 0;


            hash.pop();

        }


        for (
            let i = 0;
            i < 8;
            i++
        ) {

            hash[i] =
                (
                    hash[i] +
                    oldHash[i]
                ) | 0;

        }

    }


    let result = '';


    for (
        let i = 0;
        i < 8;
        i++
    ) {

        for (
            let j = 3;
            j + 1;
            j--
        ) {

            const byte =
                (
                    hash[i] >>
                    (
                        j * 8
                    )
                ) &
                255;


            result +=
                byte
                    .toString(16)
                    .padStart(2, '0');

        }

    }


    return result;
}