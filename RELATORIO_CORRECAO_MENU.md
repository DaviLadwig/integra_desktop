# Correção do menu retrátil — Integra Modelo 3

## Diagnóstico
O seletor CSS `:focus-within` mantinha o menu expandido após o clique em uma aba, mesmo quando o cursor saía do menu.

## Arquivo alterado
- `app/assets/styles/integra-modelo3.css`: nas duas regras de expansão do menu e exibição dos rótulos, substituído `:focus-within` por `:has(.app-nav__item:focus-visible)`. O hover continua expandindo o menu, mas o foco gerado pelo clique do mouse não deve prendê-lo aberto. A navegação pelo teclado mantém a expansão enquanto o botão exibe foco visível.

## Arquivos preservados
Todos os HTML, JavaScript, configuração Tauri, lógica de autenticação, importação, relatórios, indicadores e dados foram preservados.

## Instalação
Substitua o projeto pelos arquivos deste pacote após backup e gere novo instalador pelo workflow do GitHub. Atualize a versão do aplicativo antes de publicar um novo instalador.

## Testes recomendados
1. Abra o menu passando o cursor pela lateral.
2. Clique em Checklist e mova o cursor para o centro: o menu deve recolher.
3. Repita com todas as abas.
4. Navegue usando Tab e Enter para confirmar acesso pelo teclado.
5. Verifique modo claro, modo escuro e resolução reduzida.

## Limites
A compilação Windows e os testes no WebView não foram executados neste ambiente. Esta alteração é apenas CSS e não constitui auditoria de segurança.
