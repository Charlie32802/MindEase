"""
📌 NOTES FOR TEAM — PLEASE READ

This file (accounts/apps.py) defines the configuration for the accounts app.

🔹 What this file does:
- Tells Django that this app is called 'accounts'.
- Sets default behavior for primary key fields.

🔹 What you should NOT do:
- Don’t rename the class or the `name` field unless you rename the app folder too.
- Don’t delete this file; Django relies on it for app registration.

🔹 How you should FEEL about this file:
Think of it as a “name tag” for the app. It helps Django identify and manage the accounts app. 🙂
"""

from django.apps import AppConfig

class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'