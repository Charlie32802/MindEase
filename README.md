# MindEase — Developer Setup Guide

Welcome to the MindEase project! Follow **every step below in order** and you will have the server running in about 10 minutes.

---

## Prerequisites — Install These First

Before touching the project files, make sure you have **all three** of these installed:

| Software | Version | Download Link |
|----------|---------|---------------|
| **Python** | 3.13+ | [python.org/downloads](https://www.python.org/downloads/) |
| **MySQL** | 8.0+ | [dev.mysql.com/downloads/installer](https://dev.mysql.com/downloads/installer/) |
| **Memurai** (Redis for Windows) | Latest free edition | [memurai.com/get-memurai](https://www.memurai.com/get-memurai) |

### Installation Notes

- **Python**: During installation, **check the box** that says `Add python.exe to PATH`. Without this, none of the commands below will work.
- **MySQL**: During installation, set a root password (or leave it blank for local development). Remember it — you'll need it in Step 2.
- **Memurai**: Just click "Next" until finished. It runs silently in the background on port `6379`. You don't need to open any app.

---

## Step 1 — Create the MySQL Database

Open **MySQL Command Line Client** (installed with MySQL) or any MySQL tool and run:

```sql
CREATE DATABASE IF NOT EXISTS mindease_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> If you set a root password during MySQL installation, you'll use that in the next step.

---

## Step 2 — Set Up Environment Variables

The project needs a `.env` file with API keys and database credentials. **This file is never pushed to GitHub** — each developer creates their own.

```powershell
# In the project folder, copy the template
copy .env.example .env
```

Now open `.env` in any text editor and fill in the real values. Ask the team lead for the API keys. At minimum, make sure these are correct for your machine:

```
DB_NAME=mindease_db
DB_USER=root
DB_PASSWORD=your_mysql_password_here
```

> **If your MySQL has no password**, just leave `DB_PASSWORD=` empty (that's fine for local development).

---

## Step 3 — Set Up Python Environment & Install Dependencies

Open **PowerShell** in the project folder and run these commands one by one:

```powershell
# 1. Create a virtual environment
python -m venv venv

# 2. Activate the virtual environment
.\venv\Scripts\Activate.ps1

# 3. Install all dependencies
pip install -r requirements.txt
```

> **Troubleshooting: `mysqlclient` fails to install?**
> This is the #1 most common error. You need the MySQL C connector:
> 1. Download the **MySQL Connector/C** or install **Visual Studio Build Tools**
> 2. Or use the simpler alternative — run: `pip install PyMySQL` (already included in requirements)
> 3. If it still fails, try: `pip install mysqlclient --only-binary=:all:`

> **Troubleshooting: `.\venv\Scripts\Activate.ps1` gives a red error?**
> PowerShell blocks scripts by default. Run this **once** as Administrator:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

---

## Step 4 — Apply Database Migrations

With the virtual environment **still activated**:

```powershell
python manage.py migrate
```

This creates all the database tables. You should see a series of `OK` messages.

> **Error: `Access denied for user 'root'@'localhost'`?**
> Your `DB_PASSWORD` in `.env` doesn't match your MySQL root password. Fix it and retry.

> **Error: `Unknown database 'mindease_db'`?**
> You skipped Step 1. Go back and create the database first.

---

## Step 5 — Create a Superuser (First Time Only)

```powershell
python manage.py createsuperuser
```

Follow the prompts to set up your admin account.

---

## Step 6 — Run the Server

**🛑 Do NOT use `python manage.py runserver`!**

The project uses **Daphne** (an ASGI server) for WebSocket support. We have a script that handles everything:

```powershell
.\run_server.bat
```

You should see:
```
Starting Daphne on 0.0.0.0:8000
Listening on TCP address 0.0.0.0:8000
```

Open your browser and go to **http://127.0.0.1:8000** — the app should load!

> For all other Django commands (`makemigrations`, `createsuperuser`, `flush`, etc.), you still use `python manage.py <command>` as normal.

---

## Quick Reference — Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ModuleNotFoundError: No module named 'django'` | Virtual environment not activated | Run `.\venv\Scripts\Activate.ps1` first |
| `mysqlclient` install fails | Missing MySQL C libraries | `pip install mysqlclient --only-binary=:all:` |
| `Access denied for user 'root'` | Wrong DB password in `.env` | Check `DB_PASSWORD` in your `.env` file |
| `Unknown database 'mindease_db'` | Database not created | Run the SQL command from Step 1 |
| PowerShell script execution error | Execution policy blocked | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| `Connection refused` on port 6379 | Redis/Memurai not running | Install Memurai or restart it from Windows Services |
| Static files / CSS not loading | Need to collect static files | `python manage.py collectstatic --noinput` (run_server.bat does this automatically) |
| `No module named 'channels_redis'` | Incomplete pip install | Re-run `pip install -r requirements.txt` |
