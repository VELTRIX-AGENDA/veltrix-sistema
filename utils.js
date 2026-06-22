/**
 * VELTRIX - Sistema de Agendamento Inteligente
 * Módulo: Utilitários Globais e Formatação (utils.js)
 */

const VELTRIX_UTILS = {
    
    /**
     * Formata um valor numérico bruto para a moeda local do estabelecimento (padrão real brasileiro)
     * @param {number|string} valor - O preço ou faturamento bruto
     * @returns {string} Valor devidamente formatado (Ex: R$ 150,00)
     */
    formatarMoeda(valor) {
        const numero = Number(valor) || 0;
        // Padrão profissional internacional utilizando a API nativa do ECMAScript (Intl)
        return numero.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    },

    /**
     * Converte um objeto Date do JavaScript para a string aceita pelos inputs do tipo 'date' (AAAA-MM-DD)
     * @param {Date} data objeto de data nativo do JS
     * @returns {string} String formatada no padrão ISO para inputs (Ex: 2026-06-09)
     */
    formatarDataParaInput(data) {
        if (!(data instanceof Date) || isNaN(data)) {
            data = new Date();
        }
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const dia = String(data.getDate()).padStart(2, "0");

        return `${ano}-${mes}-${dia}`;
    },

    /**
     * Converte o padrão de data ISO (AAAA-MM-DD) para exibição visual amigável ao usuário
     * @param {string} dataString Data salva no formato do banco/localStorage
     * @returns {string} Data formatada para leitura humana (Ex: 09/06/2026)
     */
    formatarDataParaExibicao(dataString) {
        if (!dataString) return "Data inválida";
        const partes = dataString.split("-");
        if (partes.length !== 3) return dataString; // Caso já esteja formatada
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    },

    /**
     * Retorna um ID único e seguro baseado em timestamp e string aleatória para novos registros.
     * Excelente para quando sairmos do LocalStorage para um Banco de Dados de verdade.
     * @returns {string} Identificador alfanumérico único
     */
    gerarUid() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }
};

// Congela o objeto para garantir a imutabilidade do Core do sistema (segurança arquitetural)
Object.freeze(VELTRIX_UTILS);