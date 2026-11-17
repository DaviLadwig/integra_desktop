# Integra Desktop v1.0.3 — exportações e atualizações assinadas

Projeto Tauri para gerar o instalador Windows do Integra.

## Correções desta versão

- Exportação Excel usa geração de bytes (`XLSX.write`) e não o download interno do WebView.
- Exportação de relatório PDF usa o mesmo fluxo de salvamento.
- PDF do Checklist Assistencial usa o mesmo fluxo de salvamento.
- Download da planilha XLSX original no histórico usa o mesmo fluxo.
- No Tauri, o usuário escolhe o destino em uma janela nativa **Salvar como** do Windows.
- Em `localhost`/navegador, permanece o download tradicional por Blob.
- As exportações são geradas localmente e funcionam sem internet.
- Os botões de impressão no Tauri direcionam para a geração do PDF, evitando depender de janelas popup do WebView.

## Tipos de arquivo contemplados

| Ação | Arquivo |
|---|---|
| Exportar relatório do BI | `.xlsx` com abas Resumo, Equipes e Boas_Praticas |
| Baixar relatório | `.pdf` |
| Baixar Checklist Assistencial | `.pdf` |
| Baixar arquivo original do histórico | `.xlsx` |

## Gerar o instalador Windows

1. Substitua o conteúdo do repositório pelo conteúdo deste ZIP, preservando a pasta `.git`.
2. Faça commit e push.
3. Abra **Actions** no GitHub.
4. Execute **Gerar Integra para Windows**.
5. Baixe o artifact `Integra-Windows`.

O workflow instala as dependências Tauri e gera o instalador NSIS.

## Segurança de arquivos

O Integra não recebe permissão irrestrita para gravar em todo o computador. A janela nativa de salvamento solicita que o usuário escolha o destino; a permissão de escrita é usada para gravar o arquivo escolhido. O aplicativo não envia planilhas nem relatórios para a internet.

## Internet

A internet não é necessária para importar planilhas, gerar Excel, gerar PDF, imprimir via PDF, consultar o histórico ou utilizar o Checklist. O aplicativo permanece local; conectividade poderá ser usada futuramente para atualizações ou serviços opcionais.
