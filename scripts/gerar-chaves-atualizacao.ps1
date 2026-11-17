# Execute no PowerShell do Windows, na pasta do projeto.
# As chaves de assinatura NÃO são salvas no código-fonte.
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$privateDir = Join-Path $env:APPDATA 'Integra\assinatura'
$privatePath = Join-Path $privateDir 'integra-updater.key'
$publicPath = "$privatePath.pub"

if (Test-Path $privatePath) {
    throw "Uma chave ja existe em $privatePath. Nao a substitua: atualizacoes futuras dependem dela."
}

New-Item -ItemType Directory -Path $privateDir -Force | Out-Null
Push-Location $projectRoot
try {
    npm install --no-audit --no-fund
    npm run tauri -- signer generate -w $privatePath
} finally {
    Pop-Location
}

if (!(Test-Path $privatePath) -or !(Test-Path $publicPath)) {
    throw 'Nao foi possivel gerar o par de chaves. Confira a saida do Tauri CLI.'
}

$configPath = Join-Path $projectRoot 'src-tauri\tauri.conf.json'
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$publicKey = (Get-Content $publicPath -Raw).Trim()
if ($config.plugins.updater.pubkey -ne '__INTEGRA_UPDATER_PUBKEY__') {
    throw 'Chave publica ja configurada. Nao substitua uma chave de atualizacao existente.'
}
$config.plugins.updater.pubkey = $publicKey
$config | ConvertTo-Json -Depth 100 | Set-Content $configPath -Encoding utf8

Write-Host 'Chaves criadas com sucesso.' -ForegroundColor Green
Write-Host "Chave privada (NUNCA publicar): $privatePath"
Write-Host 'A chave publica ja foi adicionada em src-tauri/tauri.conf.json.'
Write-Host 'Chave publica (pode constar no codigo):'
Get-Content $publicPath
Write-Host 'Guarde uma copia privada e segura da chave, da senha e dos acessos GitHub.'
