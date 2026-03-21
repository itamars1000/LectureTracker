@echo off
echo Starting Lecture Tracker...
start "Backend" cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak > nul
start "Frontend" cmd /k "cd frontend && npm run dev"
echo.
echo Backend running at http://localhost:3001
echo Frontend running at http://localhost:5173
echo.
pause
