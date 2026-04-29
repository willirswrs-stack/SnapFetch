@echo off
echo ============================================
echo   SnapFetch - Instalacao Automatica
echo ============================================
echo.
echo Instalando Node.js e FFmpeg via winget...
echo.

winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
winget install --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements

echo.
echo ============================================
echo  Instalacao concluida!
echo  Por favor, FECHE e ABRA um novo terminal
echo  e entao execute: npm install
echo  e depois: npm run dev
echo ============================================
pause
