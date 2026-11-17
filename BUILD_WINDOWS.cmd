@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo  INTEGRA - BUILD WINDOWS
 echo ============================================
echo.
where node >nul 2>nul || (echo [ERRO] Node.js nao encontrado.& pause & exit /b 1)
where cargo >nul 2>nul || (echo [ERRO] Rust/Cargo nao encontrado.& pause & exit /b 1)
if not defined TAURI_SIGNING_PRIVATE_KEY (
  echo [ERRO] Assinatura do atualizador nao configurada neste terminal.
  echo Leia CONFIGURAR_ATUALIZADOR.md ou use GitHub Actions com os Secrets.
  pause
  exit /b 1
)
echo Instalando/atualizando dependencias...
call npm install || (pause & exit /b 1)
echo Gerando instalador do Integra...
call npm run build
if errorlevel 1 (
  echo.
  echo [ERRO] O build falhou.
  pause
  exit /b 1
)
echo.
echo Build concluido.
echo Procure o Setup em:
echo src-tauri\target\release\bundle\nsis\
echo src-tauri\target\release\bundle\msi\
pause
