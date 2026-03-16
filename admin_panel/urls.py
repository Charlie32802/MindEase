from django.urls import path
from . import views
from .admin import custom_admin_site

app_name = 'admin_panel'

urlpatterns = [
    path('api/news/', views.get_philippines_news, name='philippines_news'),
    path('recent-system-feedback/', custom_admin_site.admin_view(custom_admin_site.recent_system_feedback_view), name='recent_system_feedback'),
]