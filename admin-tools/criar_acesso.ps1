$ErrorActionPreference = 'Stop'

$BaseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$JsonPath = Join-Path $BaseDir 'acessos.json'
$JsPath = Join-Path $BaseDir 'acessos.js'
$CredentialsPath = Join-Path $BaseDir 'credenciais_criadas.txt'

function Remove-Accents {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ''
    }

    $normalized = $Value.Normalize([Text.NormalizationForm]::FormD)
    $builder = New-Object Text.StringBuilder

    foreach ($char in $normalized.ToCharArray()) {
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
        if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$builder.Append($char)
        }
    }

    return $builder.ToString().Normalize([Text.NormalizationForm]::FormC)
}

function Normalize-Username {
    param([string]$Value)

    $plain = Remove-Accents $Value
    $plain = $plain.ToLowerInvariant()
    $plain = [Regex]::Replace($plain, '[^a-z0-9]', '')
    return $plain
}

function Get-PlainText {
    param([Security.SecureString]$SecureValue)

    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

function Get-Sha256 {
    param([string]$Value)

    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
        $hash = $sha.ComputeHash($bytes)
        return -join ($hash | ForEach-Object { $_.ToString('x2') })
    }
    finally {
        $sha.Dispose()
    }
}

function Load-Users {
    if (-not (Test-Path $JsonPath)) {
        return @()
    }

    $raw = Get-Content -Raw -Encoding UTF8 $JsonPath
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return @()
    }

    $parsed = $raw | ConvertFrom-Json
    return @($parsed)
}

function Save-Users {
    param([array]$Users)

    $json = $Users | ConvertTo-Json -Depth 5
    Set-Content -Path $JsonPath -Value $json -Encoding UTF8

    $compact = $Users | ConvertTo-Json -Depth 5 -Compress
    $javascript = "window.SIAPS_ACCESS_USERS = $compact;"
    Set-Content -Path $JsPath -Value $javascript -Encoding UTF8
}

function Ensure-CredentialsFile {
    if (-not (Test-Path $CredentialsPath)) {
        @(
            'SIAPS - CREDENCIAIS CRIADAS',
            '===========================',
            '',
            'IMPORTANTE: este arquivo contem senhas em texto legivel.',
            'Mantenha-o em local privado e nao envie junto com o sistema.',
            ''
        ) | Set-Content -Path $CredentialsPath -Encoding UTF8
    }
}

Clear-Host
Write-Host '=============================================' -ForegroundColor DarkCyan
Write-Host ' SIAPS - CRIAR NOVO ACESSO' -ForegroundColor Cyan
Write-Host '=============================================' -ForegroundColor DarkCyan
Write-Host ''
Write-Host 'O usuario sera convertido automaticamente para:' -ForegroundColor Gray
Write-Host 'letras minusculas, sem espacos, sem acentos e sem camelCase.' -ForegroundColor Gray
Write-Host 'Exemplo: Joao Silva -> joaosilva' -ForegroundColor Gray
Write-Host ''

$users = Load-Users

while ($true) {
    $typedUser = Read-Host 'Usuario'
    $username = Normalize-Username $typedUser

    if ([string]::IsNullOrWhiteSpace($username)) {
        Write-Host 'Usuario invalido. Tente novamente.' -ForegroundColor Red
        continue
    }

    Write-Host "Usuario final: $username" -ForegroundColor Yellow

    $exists = $users | Where-Object { (Normalize-Username $_.usuario) -eq $username }
    if ($exists) {
        Write-Host 'Este usuario ja existe. Nenhuma alteracao foi feita.' -ForegroundColor Red
    }
    else {
        $securePassword = Read-Host 'Senha' -AsSecureString
        $secureConfirm = Read-Host 'Confirme a senha' -AsSecureString

        $password = Get-PlainText $securePassword
        $confirm = Get-PlainText $secureConfirm

        if ($password.Length -lt 8) {
            Write-Host 'A senha deve ter pelo menos 8 caracteres.' -ForegroundColor Red
        }
        elseif ($password -ne $confirm) {
            Write-Host 'As senhas nao conferem.' -ForegroundColor Red
        }
        else {
            $newUser = [PSCustomObject]@{
                usuario = $username
                senhaHash = (Get-Sha256 $password)
                ativo = $true
                criadoEm = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
            }

            $users = @($users) + $newUser
            Save-Users $users
            Ensure-CredentialsFile

            @(
                "Usuario: $username",
                "Senha: $password",
                "Criado em: $((Get-Date).ToString('dd/MM/yyyy HH:mm'))",
                '-------------------------------------------',
                ''
            ) | Add-Content -Path $CredentialsPath -Encoding UTF8

            Write-Host ''
            Write-Host 'Acesso criado com sucesso.' -ForegroundColor Green
            Write-Host "Arquivo do sistema atualizado: $JsPath" -ForegroundColor Green
            Write-Host "Credenciais registradas em: $CredentialsPath" -ForegroundColor Green
        }
    }

    Write-Host ''
    $again = Read-Host 'Criar outro acesso? (S/N)'
    if ($again.ToLowerInvariant() -ne 's') {
        break
    }
    Write-Host ''
}

Write-Host ''
Write-Host 'Finalizado.' -ForegroundColor Cyan
