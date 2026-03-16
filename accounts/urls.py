from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"), 
    path("form/", views.form_page, name="form"), 
    path("register/user/", views.register_user, name="register_user"),  
    path("register/counselor/", views.register_counselor, name="register_counselor"),
    path("login/", views.custom_login, name="login"),  
    path("registration-pending/", views.registration_pending, name="registration_pending"),
    path("api/salle/<int:salle_id>/", views.api_get_salle_details, name="api_get_salle_details"),
    path("logout/", views.custom_logout, name="logout"),

    path("activate/<uidb64>/<token>/", views.activate_account, name="activate_account"),

    path("privacy-policy/", views.privacy_policy, name="privacy_policy"),
    path("terms-of-service/", views.terms_of_service, name="terms_of_service"),
    path("code-of-ethics/", views.code_of_ethics, name="code_of_ethics"),
]