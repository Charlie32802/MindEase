from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
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
else:
    # Fallback to serve static/media files through Daphne when DEBUG=False (Local Production)
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
        re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
    ]