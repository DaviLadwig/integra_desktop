# Gerar os instaladores MSI e EXE assinados no Windows

**Antes de compilar:** siga `CONFIGURAR_ATUALIZADOR.md`. É obrigatório gerar a chave pública, salvar a chave privada fora do projeto e configurar as variáveis de assinatura. Builds sem assinatura não serão publicados.

## Opção 1 — build local

Instale no Windows:

1. Node.js 22 ou compatível.
2. Rust (`rustup`).
3. Microsoft Visual Studio Build Tools com "Desktop development with C++".
4. WebView2 Runtime para desenvolvimento.

Na raiz do projeto, execute:

```bat
BUILD_WINDOWS.cmd
```

O script instala as dependências JavaScript, incluindo os plugins oficiais Tauri de diálogo e sistema de arquivos, e compila o instalador.

Os instaladores serão gerados em:

```text
src-tauri\target\release\bundle\nsis\
src-tauri\target\release\bundle\msi\
```

O instalador está configurado para incluir o instalador offline do WebView2, evitando dependência de internet no computador do usuário durante a instalação.

## Opção 2 — GitHub Actions

1. Suba a pasta completa para o repositório GitHub, substituindo a versão anterior.
2. Faça commit e push.
3. Abra `Actions`.
4. Selecione `Gerar e publicar Integra para Windows`.
5. Clique em `Run workflow`.
6. Ao terminar, baixe o artefato `Integra-Windows-Assinado`. Uma nova tag `v1.0.3` também publica a Release com o `latest.json`.

## Ícone

O ícone oficial é preservado em `src-tauri/icons/` e é aplicado ao executável, instalador e atalhos.

## Testes obrigatórios depois de instalar

- Exportar Excel do BI e abrir o `.xlsx` no Excel ou LibreOffice.
- Baixar o PDF do relatório e abrir o arquivo.
- Baixar o PDF do Checklist Assistencial.
- Baixar novamente uma planilha original pelo histórico.
- Cancelar uma janela "Salvar como" e confirmar que o Integra continua funcionando.
- Repetir os testes sem conexão com a internet.
