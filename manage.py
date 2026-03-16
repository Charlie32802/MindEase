#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""

"""
📌 NOTES FOR TEAM — PLEASE READ

This file (manage.py) is the command-line gateway for your Django project.
Think of it as the "control tower" — it lets you start the server, run migrations,
create users, and execute other management tasks.

🔹 What this file does:
- Sets the default settings module for Django (config.settings).
- Provides the execute_from_command_line function for running commands.
- Is essential for local development and deployment tasks.

🔹 What you should NOT do:
- Don’t rename this file. Django expects it to exist at the project root.
- Don’t remove or comment out imports.
- Don’t try to directly import models here; use Django shell or scripts instead.

🔹 How you should FEEL about this file:
Treat it as your control center — safe to use, but don’t tinker with it unless you know what you’re doing.
"""

import os
import sys

def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()