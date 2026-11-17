# Integra Desktop v1.0.4 — relatórios com base local e atualizações assinadas

Projeto Tauri para gerar o instalador Windows do Integra.

## Correções desta versão

- A tela de Relatórios permite selecionar uma competência do histórico local mesmo após reiniciar o aplicativo.
- Botões Excel, PDF e impressão possuem eventos de clique próprios e indicam quando é necessário selecionar uma base.
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

1. Aplique o pacote de correção preservando a pasta `.git`, as credenciais e a chave pública já configurada.
2. Execute `node scripts/preparar-atualizacao-1.0.4.cjs` para atualizar apenas o número da versão na configuração Tauri e no lockfile.
3. Faça commit e push para a branch `main`.
4. Em **Actions**, execute **Gerar e publicar Integra para Windows** manualmente.
5. Baixe o artefato `Integra-Windows-Assinado` e confira os instaladores MSI e NSIS.

O workflow gera instaladores MSI/NSIS e assinaturas do atualizador. Só publique a tag `v1.0.4` após validar a compilação.

## Segurança de arquivos

O Integra não recebe permissão irrestrita para gravar em todo o computador. A janela nativa de salvamento solicita que o usuário escolha o destino; a permissão de escrita é usada para gravar o arquivo escolhido. O aplicativo não envia planilhas nem relatórios para a internet.

## Internet

A internet não é necessária para importar planilhas, gerar Excel, gerar PDF, imprimir via PDF, consultar o histórico ou utilizar o Checklist. O aplicativo permanece local; conectividade é usada somente para consultar e baixar atualizações, mediante consentimento.
