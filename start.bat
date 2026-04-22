@echo off
echo Starting AI Tutor Agent v2...
echo.
echo Starting backend on http://localhost:4000
start "AI Tutor Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 3 /nobreak >nul
echo Starting frontend on http://localhost:5173
start "AI Tutor Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.
echo Both servers starting. Open http://localhost:5173 in your browser.
