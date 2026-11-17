# Integra 1.0.3 — Correção de compilação E0433

## Diagnóstico

No GitHub Actions, a compilação Rust falhou em `src-tauri/src/lib.rs` na macro `tauri::generate_context!()` com o erro `E0433: cannot find serde_json in the list of imported crates`.

A configuração Tauri 2 precisa da dependência direta `serde_json` para que a macro gere os dados de configuração. A dependência estava ausente de `src-tauri/Cargo.toml`.

## Arquivo alterado

- `src-tauri/Cargo.toml` — seção `[dependencies]`: adicionado `serde_json = "1"` após `serde`.

Nenhum outro arquivo de código foi alterado neste pacote. Não há modificação de dados locais, chaves de assinatura, permissões, funcionalidades ou identidade do aplicativo.

## Instalação na pasta original

1. Confirme que a pasta aberta no VS Code é a original, conectada à branch `main` do repositório `DaviLadwig/integra_desktop`.
2. Extraia este ZIP na raiz do projeto, mantendo a estrutura de diretórios.
3. Autorize **somente** a substituição de `src-tauri/Cargo.toml` (o relatório de instruções também será incluído).
4. No PowerShell, execute:

   ```powershell
   git diff -- src-tauri/Cargo.toml
   git diff --check
   git add -- src-tauri/Cargo.toml
   git commit -m "Corrigir dependencia serde_json no build Windows"
   git push origin main
   ```

5. Execute novamente o workflow `Gerar e publicar Integra para Windows` na branch `main` via **Run workflow**.

## Resultado esperado e limites da verificação

O erro E0433 de ausência de `serde_json` deve desaparecer. O arquivo foi validado quanto à sintaxe TOML, mas **a compilação Windows não foi executada neste ambiente**; o GitHub Actions será a confirmação real. Se surgirem novos erros, registre o primeiro erro completo do log para nova correção.

**Segurança:** não envie os arquivos `integra-updater.key` nem senhas para o GitHub como código; somente GitHub Actions Secrets devem guardar a assinatura privada.
