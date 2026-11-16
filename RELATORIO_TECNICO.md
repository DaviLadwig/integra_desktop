# Integra — alteração do workflow Windows

## Arquivo alterado
- `.github/workflows/build-windows.yml`
  - Etapa `Instalar dependencias`: `npm install` substituído por `npm ci` para instalações reproduzíveis com `package-lock.json`.
  - Etapa de compilação: `npm run build -- --bundles nsis,msi`, passando a solicitar instaladores NSIS e MSI ao Tauri.
  - Etapa de upload: dois artefatos separados, `Integra-Windows-EXE` e `Integra-Windows-MSI`.

## Instalação
Copie `.github/workflows/build-windows.yml` para o mesmo caminho na raiz do repositório GitHub, substituindo o workflow existente. Faça commit e execute `Actions > Gerar Integra para Windows > Run workflow`.

## Atenção
- O comando assume que `npm run build` chama o Tauri CLI e aceita `--bundles`, como indicado pelo workflow original que gerava o NSIS. Se o script `build` executar outra ferramenta, será necessário ajustá-lo.
- `npm ci` exige um `package-lock.json` válido e sincronizado; caso o projeto não possua esse arquivo, mantenha `npm install`.
- O workflow cria artefatos na aba Actions, NÃO publica automaticamente em GitHub Releases.
- O MSI não remove garantidamente o alerta do SmartScreen e não substitui assinatura digital.
- Nenhum arquivo do aplicativo, banco de dados ou credenciais foi alterado.
- Não foi possível executar um build real Windows neste ambiente; valide no GitHub Actions.
