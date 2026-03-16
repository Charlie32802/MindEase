from django.urls import path
from . import views

urlpatterns = [
    path('approve-counselor/<int:counselor_id>/', views.approve_counselor, name='approve_counselor'),
    path('reject-counselor/<int:counselor_id>/', views.reject_counselor, name='reject_counselor'),
]