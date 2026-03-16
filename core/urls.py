from django.urls import path
from . import views

urlpatterns = [
    # User profile
    path('user-profile/', views.user_profile, name='user_profile'),
    # user dashboard
    path('user-dashboard/', views.user_dashboard, name='user_dashboard'),
    # counselor dashboard
    path('counselor-dashboard/', views.counselor_dashboard, name='counselor_dashboard'),
    # Get support
    path('get-support/', views.get_support, name='get_support'),
    # filter counselors
    path('counselorsfilter/', views.counselors_page, name='counselors_page'),
    # past sessions
     path('past-sessions/', views.past_sessions, name='past_sessions'),
    path('api/past-sessions/', views.past_sessions_api, name='past_sessions_api'),
    path('counselors/', views.counselors_page, name='counselors_page'),

    # counselorsdashboard
    # manage availability
    path('manage-availability/', views.manage_availability, name='manage_availability'),
    # core/urls.py
    path('patients/', views.patient_records, name='patient_records'),
    path('api/patients/', views.patient_records_api, name='patient_records_api'),
    # Counselor profile
    path('counselor-profile-update/', views.counselor_profile_update, name='counselor_profile_update'),

    path('counselor/profile/', views.counselor_profile, name='counselor_profile'),

    path('book/<int:counselor_id>/', views.book_counselor, name='book_counselor'),
    #path('counselor-profile/<int:counselor_id>/', views.counselor_profile, name='counselor_profile'),

    path('api/availability/', views.get_availability),
    path('api/availability/add/', views.add_availability),
    path('api/availability/<int:slot_id>/delete/', views.delete_availability),
    path('api/availability/copy-last-week/', views.copy_last_week),
    path('api/availability/clear-week/', views.clear_week),
    path('api/availability/vacation-mode/', views.vacation_mode),

    path('api/availability/counselor/<int:counselor_id>/', views.get_counselor_availability, name='get_counselor_availability'),
    path('cancel-booking/<int:appointment_id>/', views.cancel_booking, name='cancel_booking'),

    # core/urls.py
    path('session/<int:appointment_id>/join/', views.join_session, name='join_session'),
    path('start-session/<int:appointment_id>/', views.start_session, name='start_session'),

    path('start-session/<int:appointment_id>/', views.start_session, name='start_session'),
    path('end-session/<int:appointment_id>/', views.end_session, name='end_session'),
    path('check-session-status/', views.check_session_status, name='check_session_status'),

    # Feedback & Reviews API
    path('api/feedback/submit/<int:appointment_id>/', views.submit_feedback, name='submit_feedback'),
    path('api/counselor/<int:counselor_id>/reviews/', views.get_counselor_reviews, name='get_counselor_reviews'),
    path('api/review/<int:review_id>/', views.get_single_review, name='get_single_review'),
    path('api/counselor/<int:counselor_id>/track-view/', views.track_profile_view, name='track_profile_view'),
    path('api/counselors/', views.counselors_page_api, name='counselors_page_api'),

    # Vacation management
    path('api/availability/vacations/', views.get_vacations, name='get_vacations'),
    path('api/availability/vacation/<str:vacation_id>/delete/', views.delete_vacation, name='delete_vacation'),

    # Last week report & clear schedule
    path('api/counselor/last-week-report/', views.last_week_report, name='last_week_report'),
    path('api/counselor/clear-week-schedule/', views.clear_week_schedule, name='clear_week_schedule'),


]
    

