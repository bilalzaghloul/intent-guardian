@echo off
echo Installing dependencies for IntentGuardians...
echo.

echo Installing root dependencies...
call npm install
echo.

echo Installing backend dependencies...
cd backend
call npm install
cd ..
echo.

echo Installing frontend dependencies...
cd frontend
call npm install
cd ..
echo.

echo Setup complete!
echo.
echo To start the application, run:
echo npm start
echo.
echo This will start both the backend and frontend servers.
echo.
pause
