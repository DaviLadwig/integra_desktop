# Publicar Integra 1.0.5 e usar um único link de download

## Por que o endereço anterior dava erro 404?

O GitHub resolveu `/releases/latest` para a Release `v1.0.4`, mas essa Release
não tinha o arquivo chamado `Integra-Atual.msi`. O download direto exige que
**o nome do arquivo publicado** seja exatamente igual ao final do link.

O workflow incluído neste pacote copia o MSI do Tauri para `Integra-Atual.msi`
e publica ambos na próxima Release. A assinatura do atualizador e a URL
versionada dentro de `latest.json` são preservadas.

## Link definitivo do site

```text
https://github.com/DaviLadwig/integra_desktop/releases/latest/download/Integra-Atual.msi
```

Use esse URL no `href` do botão de download. Ele só ficará operacional depois
que o build e a publicação da primeira Release com o arquivo fixo tiverem
terminado com sucesso. Nas próximas versões, o link continuará igual.

## Antes de subir ao GitHub

1. Faça cópia de segurança do projeto instalado no seu Windows.
2. Extraia o ZIP entregue e copie os arquivos para a **raiz** do projeto
   `INTEGRA_DESKTOP_TAURI_FINAL`, sem apagar outros arquivos da pasta.
3. Não substitua a chave pública existente em `src-tauri/tauri.conf.json`.
   Este ZIP **não contém** o arquivo `tauri.conf.json` nem qualquer chave.
4. Instale as dependências (`npm install`) se necessário.
5. Execute `node scripts/preparar-atualizacao-1.0.5.cjs`. O script exige
   versões 1.0.4 alinhadas em NPM, Cargo e Tauri, preserva a chave pública e
   grava 1.0.5 em todos eles (e no lockfile, se existir).
6. Execute os testes abaixo:

```powershell
node tests/smoke-monthly-overview.cjs
node tests/smoke-bi-modes.cjs
node tests/smoke-monthly-history.cjs
node tests/smoke-monthly-report.cjs
node tests/smoke-contrast-1.0.5.cjs
node tests/smoke-release-preparation.cjs
npm run dev
```

7. No app de teste, carregue planilhas anonimizadas de dois ou mais grupos
   de uma competência; valide os números da Visão Geral, BI e PDFs. Verifique
   também um segundo mês, histórico expansível e dados de usuário diferentes.
8. Faça backup de uma instalação existente antes de testar a atualização
   automática assinada. Não misture instalações MSI/NSIS sem teste.

## Commit e build de validação

No PowerShell da raiz do projeto, após os testes:

```powershell
git status
git add app/index.html app/assets/scripts/monthly-overview.js app/assets/scripts/upload.js app/assets/scripts/app.js app/assets/scripts/bi.js app/assets/scripts/storage.js app/assets/scripts/export.js app/assets/scripts/reports-source.js
git add app/assets/styles/monthly-overview.css app/assets/styles/monthly-reports.css app/assets/styles/contrast-fixes-1.0.5.css
git add .github/workflows/build-windows.yml scripts/preparar-atualizacao-1.0.5.cjs CHANGELOG_RELEASE.md PUBLICAR_INTEGRA_1.0.5.md
git add tests/smoke-monthly-overview.cjs tests/smoke-bi-modes.cjs tests/smoke-monthly-history.cjs tests/smoke-monthly-report.cjs tests/smoke-reports-ui.cjs tests/smoke-contrast-1.0.5.cjs tests/smoke-release-preparation.cjs tests/smoke-version-1.0.4.cjs
git add RELATORIO_TECNICO_PANORAMA_MENSAL.md RELATORIO_TECNICO_RELATORIOS_MENSAIS.md RELATORIO_TECNICO_CONTRASTE_1.0.5.md
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git add package-lock.json
git diff --cached --name-only
git commit -m "Integra 1.0.5 - panorama mensal e relatorios gerais"
git push origin main
```

O `package-lock.json` só deve ser adicionado se existir. Antes do commit,
confira os arquivos em `git diff --cached --name-only`; **nunca** inclua
arquivos `.key`, senhas ou credenciais de assinatura.

Abra no GitHub: **Actions → Gerar e publicar Integra para Windows → Run
workflow**, selecionando `main`. Aguarde o build verde. Em especial, verifique
o artefato `Integra-Windows-Assinado`, que deve conter:

- Instaladores MSI e NSIS versionados;
- Arquivos `.sig` das atualizações;
- `Integra-Atual.msi` (nome fixo para o site);
- `latest.json` (atualizador do aplicativo).

O workflow de validação iniciado pela interface não cria uma Release pública.
Ele permite identificar erros de assinatura e empacotamento antes de publicar.

## Publicar a Release

Depois do build verde, confira se a tag `v1.0.5` já existe:

```powershell
git ls-remote --tags origin v1.0.5
```

Se não houver saída, crie e envie a tag:

```powershell
git tag v1.0.5
git push origin v1.0.5
```

O push da tag dispara o workflow e publica a Release automaticamente.

**Não recrie uma tag que já exista.** Se o teste falhar após publicar a versão,
faça uma correção e prepare uma versão superior, em vez de substituir uma tag
usada por instaladores distribuídos.

Ao final, confira em **Releases → v1.0.5 → Assets** se aparece
`Integra-Atual.msi`. Só depois teste o link definitivo em uma janela anônima;
ele deverá baixar o arquivo, não mostrar 404. Também confirme se `latest.json`
corresponde a 1.0.5 e se o atualizador instalado reconhece a versão.

## Cuidados

- Nunca faça commit de `TAURI_SIGNING_PRIVATE_KEY` ou sua senha.
- O link de download público só funciona se a Release e os assets estiverem
  visíveis ao público.
- `latest` aponta para a Release marcada como mais recente; evite publicar
  versões de teste como a Release mais recente.
- O MSI do Tauri pode continuar gerando aviso do SmartScreen se não houver
  assinatura comercial de código Windows. A assinatura Ed25519 do atualizador
  protege a verificação de atualizações, mas não elimina o aviso do Windows.
- Dados de pacientes permanecem locais. Valide os cálculos com arquivos
  anonimizados antes de distribuir a nova versão.
