/**
 * =========================================================
 * CONFIGURAÇÃO DO PAINEL
 * =========================================================
 *
 * Informações específicas do município para o qual
 * este painel foi configurado.
 *
 * Importante:
 * Como esta é uma aplicação totalmente local em JavaScript,
 * essas informações não devem ser consideradas segurança
 * real de backend.
 */

const CONFIG = {
    uf: 'MA',
    municipio: 'Vitória do Mearim',
    ibge: '2112902',

    /**
     * CPF do responsável municipal.
     * Armazenado somente com números.
     */
    cpf: '00500681309',

    /**
     * Hash SHA-256 da senha utilizada no login.
     */
    pwdHash: 'a8d53dd8b801ec37a2091e13a0106e373a5f923aa253fb9002ab09e301e20929'
};