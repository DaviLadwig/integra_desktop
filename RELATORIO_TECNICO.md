# Relatório técnico — Integra Desktop Tauri 0.2.0

## Base utilizada

Projeto reconstruído a partir da versão mais recente do Integra corrigida em 11/11/2026, contendo:

- identidade Integra;
- logos claro/escuro corrigidas;
- `icone-sistema.png`;
- isolamento de histórico e checklist por usuário;
- correções de contraste do modo dark.

## Ajuste adicional desta entrega

Foi incorporada a correção da tela **Equipes** no modo escuro:

- `teams-overview__summary` deixa de usar fundo branco;
- card da equipe recebe fundo/bordas adequados ao tema;
- textos secundários ganham contraste;
- badge INE recebe contraste adequado;
- estatísticas recebem fundo/borda escuros;
- botão "Abrir na visão geral" recebe aparência escura e hover coerente.

## Arquivos de aplicação

### `app/index.html`
- Base funcional completa do Integra.
- Inclui a correção CSS da tela Equipes no dark mode.
- Mantém a separação dos bancos por usuário.
- Mantém as referências para `logo-integra-light.png` e `logo-integra-dark.png`.

### `app/styles/dark-fixes.css`
- Recebeu o mesmo bloco de correção da tela Equipes para manter a fonte modular sincronizada.

### `app/acessos.js`
- Mantido da base atual.
- Usado pela autenticação offline.

### `app/images/icone-sistema.png`
- Ícone oficial fornecido no sistema atual.
- Fonte usada para gerar os ícones do Tauri/Windows.

### `app/images/logo-integra-light.png`
- Logo usada no modo claro.

### `app/images/logo-integra-dark.png`
- Logo usada no modo escuro.

### `app/scripts/*`, `app/styles/*`, `app/vendor/*`
- Preservados da base funcional atual.

## Arquivos Tauri criados/atualizados

### `src-tauri/tauri.conf.json`
- Produto: `Integra`.
- Identificador: `br.com.integra.producaoisolada`.
- Janela inicial: 1440×900; mínimo 1024×680.
- Bundle: NSIS.
- WebView2: `offlineInstaller`.
- Ícone do instalador/desinstalador: `icons/icon.ico`.

### `src-tauri/Cargo.toml`
- Projeto Rust/Tauri 2.
- Release com LTO e otimização de tamanho.

### `src-tauri/src/lib.rs` e `src-tauri/src/main.rs`
- Inicialização mínima do aplicativo Tauri.

### `src-tauri/icons/*`
- Gerados a partir de `app/images/icone-sistema.png`.

### `.github/workflows/build-windows.yml`
- Workflow manual para gerar o Setup.exe em runner Windows.

### `BUILD_WINDOWS.cmd`
- Build local simplificado.

## Ferramentas administrativas

A pasta `admin-tools/` contém:

- `CRIAR_ACESSO.cmd`;
- `criar_acesso.ps1`;
- `acessos.json`;
- `LEIA-ME.txt`.

Ela não deve ser distribuída junto aos usuários finais.

O arquivo `credenciais_criadas.txt` não está incluído porque pode conter senhas em texto legível.

## Validações executadas

- 16 blocos JavaScript internos do `index.html`: sintaxe válida via `node --check`.
- Todos os arquivos de `app/scripts/*.js`: sintaxe válida.
- `app/acessos.js`: sintaxe válida.
- `package.json` e `tauri.conf.json`: JSON válido.
- Logos clara/escura: presentes.
- Ícone oficial e ícones Tauri/Windows: presentes.
- Correção de Equipes no dark mode: presente no HTML e em `dark-fixes.css`.
- Separação `siaps_local_history__usuario`: presente.
- Separação `siaps_local_checklist__usuario`: presente.

## Limitação do ambiente de geração

O ambiente usado para preparar este pacote não possui Rust/Cargo nem o toolchain Windows. Por isso, o `Setup.exe` não foi compilado aqui. O projeto está preparado para build em Windows ou via GitHub Actions.
