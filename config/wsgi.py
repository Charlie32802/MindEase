"""
📌 NOTES FOR TEAM — PLEASE READ

This file (config/wsgi.py) is responsible for connecting our Django project 
to the web server when we deploy it. Think of it as the “doorway” for internet 
traffic to reach our project.

🔹 What this file does:
- Exposes the `application` object that the server uses to communicate with Django.
- Uses your settings from config/settings.py to know how the project is configured.
- Required for any production deployment (e.g., gunicorn, Apache, Nginx).

🔹 What you should NOT do:
- Don’t delete this file.
- Don’t add random code here.
- Don’t panic if you see this file and don’t fully understand it—Django needs it.

🔹 How you should FEEL about this file:
Think of it as a simple connector. It doesn’t build the app, it just allows the 
world to talk to it safely. Respect it, and your deployment will be smooth. 🙂
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
