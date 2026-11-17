# Integra — configuração do atualizador Tauri 2

## Antes da primeira compilação

O projeto contém o atualizador, mas **nenhum segredo foi incluído no ZIP**. A compilação por GitHub Actions requer que o proprietário gere uma chave de assinatura e configure os segredos abaixo.

1. No Windows com Node.js 22 instalado, abra o PowerShell na raiz do projeto.
2. Execute `.\scripts\gerar-chaves-atualizacao.ps1` no PowerShell autorizado do seu computador.
3. O script gera um par de chaves na pasta de dados do usuário, fora do repositório. Defina uma senha forte quando solicitado.
4. O script também registra a chave **pública** em `src-tauri/tauri.conf.json`. Essa alteração deve entrar no commit do projeto; ela não é um segredo.
5. Na área **GitHub → repositório → Settings → Secrets and variables → Actions → New repository secret**, crie:

| Nome do segredo | Valor |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | Conteúdo integral do arquivo `.key` gerado, sem alterações |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Senha da chave privada definida ao gerar |

**Nunca faça commit do arquivo `.key`, não envie a chave privada nesta conversa, não compartilhe por e-mail e não a inclua no instalador.** Guarde um backup criptografado e a senha em local separado. Se perdê-la, as instalações existentes não poderão validar futuras atualizações feitas com uma nova chave.

## Validar a compilação

1. Substitua os arquivos do projeto e faça commit na branch principal.
2. Execute o workflow **Gerar e publicar Integra para Windows** manualmente em **Actions → Run workflow**.
3. Verifique se o artefato `Integra-Windows-Assinado` contém o `.msi`, `.exe`, seus `.sig` e `latest.json`.
4. Baixe o MSI, faça backup dos dados do Integra já instalado e teste a instalação da versão **1.0.3** sobre a **0.3.2**. Não desinstale a versão anterior sem antes testar.
5. Confira login, credencial `.integra`, histórico local, PDF do relatório, Excel do relatório, PDF do checklist, download original e modo claro.

## Publicar a versão inicial

1. Confirme que não existe uma Release mais nova que `v1.0.3` no repositório. A versão **dentro do aplicativo** e a **tag** agora seguem a mesma numeração.
   A versão interna anterior era `0.3.2`, mas a tag publicada foi `v1.0.2`; escolhemos `1.0.3` para eliminar essa divergência nas próximas versões.
2. Crie e envie a tag `v1.0.3` apontando para o commit validado. O workflow fará o build e publicará uma Release com `latest.json` e arquivos assinados.
3. No site, aponte o botão principal para o MSI correto da nova Release.

## Testar a primeira atualização automática

1. Com a versão **1.0.3 instalada**, altere a versão para **1.0.4** em `package.json`, `src-tauri/Cargo.toml` e `src-tauri/tauri.conf.json`.
2. Atualize `CHANGELOG_RELEASE.md` com as novidades da 1.0.4.
3. Faça commit e execute o build manual para validar. Depois publique a tag `v1.0.4`.
4. Abra a versão **1.0.3** do Integra com internet e faça login; aparecerá a opção de atualizar. Também é possível usar o botão **Atualizações**.
5. Aceite apenas após salvar o trabalho atual. Aguarde o instalador concluir e verifique a nova versão e os dados existentes.
6. Repita um teste sem internet. O Integra deverá continuar funcionando offline e não bloquear o login.

## Cuidados de segurança

- O `latest.json` contém a URL do MSI e sua assinatura Ed25519. O instalador é validado antes de executar.
- As atualizações usam HTTPS e não transmitem planilhas, senhas, CPFs ou dados clínicos.
- Proteja as tags de release e a branch principal; limite quem pode publicar código e novas versões.
- A assinatura do updater é **diferente da assinatura comercial de código Windows**, portanto não elimina automaticamente o alerta SmartScreen.
- O arquivo `src-tauri/tauri.conf.json` acompanha um marcador para a chave pública. O script substitui esse marcador no seu computador **antes do commit**. A chave privada nunca entra no repositório.
- Se o repositório ou as Releases não forem públicos, será preciso escolher um endpoint autenticado para os downloads; o endereço atual usa GitHub Releases público.

## Observação sobre instaladores antigos

Usuários que instalaram a 0.3.2 por NSIS (`.exe`) devem receber uma transição específica antes de migrar para MSI. Evite instalar o MSI por cima do NSIS sem teste, pois os dois formatos podem gerar instalações paralelas. Esta migração foi preparada para o grupo que já está usando o MSI.
