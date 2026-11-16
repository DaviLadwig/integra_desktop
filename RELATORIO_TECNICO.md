# Integra — correção do GitHub Actions

## Diagnóstico
A etapa `actions/setup-node@v4` falhou com `Some specified paths were not resolved, unable to cache dependencies`, devido à configuração de cache npm com `cache-dependency-path: package-lock.json` sem confirmação da presença desse arquivo no repositório.

## Arquivo alterado
- `.github/workflows/build-windows.yml`: removida a configuração obrigatória de cache; instalação de dependências usa `npm ci` quando existe `package-lock.json` e `npm install` caso contrário; build usa `npm run tauri -- build --bundles nsis,msi` para não duplicar o argumento `--bundles` já existente no script `build` do package.json; upload separado dos instaladores NSIS e MSI.

## Arquivos não alterados
Nenhum código do aplicativo, dados locais, `package.json`, `tauri.conf.json` ou configuração de segurança foi alterado.

## Instalação
Copie `.github/workflows/build-windows.yml` para o mesmo caminho no repositório GitHub, faça commit e execute `Actions > Gerar Integra para Windows > Run workflow`.

## Testes e limitações
O YAML foi inspecionado estruturalmente e confrontado com o `package.json` enviado. Não foi possível executar o GitHub Actions/compilação Windows neste ambiente. O resultado depende dos arquivos existentes no repositório, do CLI Tauri e das dependências do runner. Os artefatos aparecem na execução do Actions, não automaticamente no GitHub Releases. O MSI não remove por si só o alerta SmartScreen.
