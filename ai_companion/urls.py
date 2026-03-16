# ai_companion/urls.py

from django.urls import path
from . import views

app_name = 'ai_companion'

urlpatterns = [
    path('chat/', views.ai_companion, name='chat'),
    path('history/', views.chat_history, name='history'),
]