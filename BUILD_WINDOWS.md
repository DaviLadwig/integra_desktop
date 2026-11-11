# Gerar o Integra Setup.exe no Windows

## Opção 1 — build local

Instale no Windows:

1. Node.js 22 ou compatível.
2. Rust (`rustup`).
3. Microsoft Visual Studio Build Tools com "Desktop development with C++".
4. WebView2 Runtime para desenvolvimento.

Depois, na raiz do projeto, execute:

```bat
BUILD_WINDOWS.cmd
```

O instalador NSIS será gerado em:

```text
src-tauri\target\release\bundle\nsis\
```

O instalador está configurado para incluir o instalador offline do WebView2, evitando dependência de internet no computador do usuário durante a instalação.

## Opção 2 — GitHub Actions

1. Suba a pasta completa para um repositório GitHub.
2. Abra `Actions`.
3. Selecione `Gerar Integra para Windows`.
4. Clique em `Run workflow`.
5. Ao terminar, baixe o artefato `Integra-Windows`.

## Ícone

O ícone é derivado de:

```text
app/images/icone-sistema.png
```

E foi convertido para:

```text
src-tauri/icons/icon.ico
src-tauri/icons/32x32.png
src-tauri/icons/128x128.png
src-tauri/icons/128x128@2x.png
```
