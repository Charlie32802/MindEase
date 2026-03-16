"""
📌 NOTES FOR TEAM — PLEASE READ

This file (config/asgi.py) sets up ASGI (Asynchronous Server Gateway Interface) for our project.  
Think of it as the “front door” for handling incoming requests asynchronously, which can include 
websockets or long-lived connections.

🔹 What this file does:
- Tells Django where to find the settings (config/settings.py).
- Creates the ASGI application callable that servers like Daphne or Uvicorn use to run the project.

🔹 What you should NOT do:
- Don’t delete or rename this file.
- Don’t modify it unless you’re adding async support or using websockets.

🔹 How you should FEEL about this file:
Think of it as a silent gatekeeper. It quietly lets traffic in and out without interfering.  
Most of the time, you don’t need to touch it, and that’s perfectly fine. 🙂
"""

import os
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
import core.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

#application = get_asgi_application()

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            core.routing.websocket_urlpatterns
        )
    ),
})