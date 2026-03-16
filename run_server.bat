@echo off
echo Starting MindEase Production Server via Daphne ASGI
echo.
echo Make sure you have Redis installed and running on port 6379!
echo (You can download Memurai for Windows or run Redis via WSL/Docker)
echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Collecting static files...
python manage.py collectstatic --noinput

echo Starting Daphne on 0.0.0.0:8000
daphne -b 0.0.0.0 -p 8000 config.asgi:application