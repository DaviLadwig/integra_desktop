# Relatório técnico — Integra Primeiro Acesso v2

## Objetivo

Adicionar o novo modelo universal de usuários sem recompilar o aplicativo a cada novo acesso.

## Arquivos criados

### `assets/scripts/access-public-key.js`
Expõe para o frontend a chave pública oficial e o `keyId` correspondente.

### `assets/scripts/first-access.js`
Implementa:
- IndexedDB local de autenticação;
- leitura do arquivo `.integra`;
- validação estrutural do envelope;
- validação RSA-SHA256 da assinatura;
- leitura do payload assinado;
- cadastro local do usuário;
- bloqueio de reutilização da mesma credencial nesta instalação;
- validação PBKDF2-HMAC-SHA256 da senha;
- opção `Lembrar de mim` armazenando somente o usuário.

### `assets/security/chave-publica-integra.xml`
Chave pública oficial fornecida pelo administrador do Integra. Pode ser distribuída no aplicativo.

## Arquivos alterados

### `index.html`
- adicionada opção `Lembrar de mim`;
- adicionado botão `Primeiro acesso`;
- adicionado modal de importação `.integra`;
- adicionados scripts `access-public-key.js` e `first-access.js`.

### `assets/scripts/auth.js`
- autenticação passa a consultar primeiro usuários locais ativados por `.integra`;
- mantém fallback para o `administrador` legado;
- usa PBKDF2 para usuários novos e SHA-256 apenas para o legado;
- integra `Lembrar de mim` no login/logout.

### `assets/scripts/accesses.js`
- removido acesso de teste `fernando`;
- mantido somente `administrador` durante a transição.

### `assets/styles/login.css`
- estilos do `Lembrar de mim`;
- botão `Primeiro acesso`;
- modal de ativação;
- mensagens de sucesso/erro.

### `assets/styles/dark-fixes.css`
- contraste completo do novo fluxo no modo escuro.

## Segurança

O aplicativo contém somente a chave pública. A chave privada continua exclusivamente no Integra Admin.

O arquivo `.integra` não contém a senha em texto aberto. Ele contém salt/hash PBKDF2 e payload assinado.

A reutilização do mesmo `credentialId` é bloqueada na mesma instalação. Como o sistema é totalmente offline, não existe verificação global entre computadores diferentes.

## Testes realizados

- sintaxe de todos os JS via Node.js;
- conferência de todos os assets referenciados pelo HTML;
- importação WebCrypto da chave pública RSA de 3072 bits;
- conferência do `keyId` calculado a partir da chave pública;
- teste de compatibilidade PBKDF2-HMAC-SHA256 entre Python e WebCrypto;
- parsing estrutural do HTML.

O teste final com uma credencial real `.integra` deve ser feito localmente pelo proprietário, sem necessidade de compartilhar o arquivo privado.

## Integração Tauri

O frontend atualizado foi copiado integralmente para `app/`.

Versões atualizadas:
- `package.json`: 0.3.0;
- `src-tauri/Cargo.toml`: 0.3.0;
- `src-tauri/tauri.conf.json`: 0.3.0.

O workflow `.github/workflows/build-windows.yml` continua gerando instalador NSIS para Windows.


## Correção v0.3.1

- Corrigida a inicialização do módulo de primeiro acesso.
- `initializeFirstAccessUi()` agora é chamado por `initializeApp()`.
- O evento `change` do input `.integra` passa a ser registrado.
- A preferência `Lembrar de mim` passa a ser inicializada corretamente.
