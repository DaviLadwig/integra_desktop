# Relatório técnico — Integra Modelo 3

## Referência
Modelo escuro enviado pelo usuário: grafite/preto, destaque azul e navegação por ícones que revela rótulos ao aproximar o cursor.

## Arquivos alterados
- `app/index.html`: importação de `integra-modelo3.css`; inclusão de ícones SVG e rótulos separados nos sete botões existentes do menu, preservando `data-section`, IDs, eventos e texto.
- `app/assets/styles/integra-modelo3.css` (novo): layout escuro grafite, menu fixo de 64 px que expande para 224 px em hover/foco, responsividade touch e redução de movimento.

## Arquivos preservados
Todos os scripts de autenticação, importação, cálculo, checklist, exportação, armazenamento, administração e configuração Tauri permanecem inalterados.

## Instalação
Substituir a pasta do projeto pelos arquivos deste pacote após backup. Para recompilar: executar o workflow existente no GitHub Actions. A compilação e a inspeção visual em Windows não foram executadas aqui.

## Validação recomendada
1. Login e logout.
2. Navegação das sete abas, mouse e teclado.
3. Importar Excel, conferir indicadores e checklist.
4. Exportar PDF e Excel e conferir os dados.
5. Reiniciar o aplicativo e verificar persistência dos dados.
6. Conferir tela pequena e modo claro.

## Segurança
Alterações apenas de HTML e CSS. Não há mudança em permissões, credenciais, armazenamento, CSP ou backend. A ausência de mudanças na lógica não substitui auditoria de segurança.
