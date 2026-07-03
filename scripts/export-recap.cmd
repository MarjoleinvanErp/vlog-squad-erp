@echo off
rem Dubbelklik dit bestand om de complete speurtocht-export te maken.
rem Resultaat: de map recap-export\ met index.html + alle foto's en video's.
cd /d "%~dp0.."
set NODE_OPTIONS=--use-system-ca
node scripts\export-recap.mjs
echo.
echo Klaar? Open recap-export\index.html om het resultaat te bekijken.
pause
