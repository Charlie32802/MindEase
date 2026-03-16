from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from admin_panel.admin import custom_admin_site

urlpatterns = [
    path("", include("accounts.urls")),
    
    path("django-admin/", admin.site.urls),

    path('admin/email/', include('email_notifications.urls'), name='email_notifications'),
    path("admin/", custom_admin_site.urls),
    path("accounts/", include("accounts.urls")),
    path("ai-companion/", include("ai_companion.urls")),
    path("admin-panel/", include("admin_panel.urls")),
    path("core/", include("core.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)