from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth import get_user_model
from admin_panel.models import RecentActivity
from django.utils import timezone
from datetime import datetime, timedelta, date
from django.http import JsonResponse
from .models import Appointment, Availability, CounselorFeedback, CounselorProfileView
from admin_panel.models import WellnessTip
from django.views.decorators.csrf import csrf_exempt
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .agora_token import build_token_with_uid, ROLE_PUBLISHER
import json
import os
import hashlib
import time as _time
from django.db import transaction
from django.db.models import Avg, Count, Q

User = get_user_model()


def _generate_agora_token(channel_name):
    app_id = os.environ.get('AGORA_APP_ID', '')
    app_certificate = os.environ.get('AGORA_APP_CERTIFICATE', '')
    expire_ts = int(_time.time()) + 3600
    return build_token_with_uid(app_id, app_certificate, channel_name, 0, ROLE_PUBLISHER, expire_ts)


@login_required
def user_dashboard(request):
    if request.user.role != 'user':
        return redirect('login')

    first_name = request.user.full_name.split()[0] if request.user.full_name else 'User'
    full_name = request.user.full_name or 'User'
    today = timezone.now().date()

    todays_appointments = Appointment.objects.filter(
        patient=request.user,
        date=today
    ).order_by('time')

    upcoming_sessions = Appointment.objects.filter(
        patient=request.user,
        date__gt=today
    ).order_by('date', 'time')

    wellness_tips = WellnessTip.objects.all()[:5]

    # Find completed appointments that have no feedback yet
    pending_feedback = Appointment.objects.filter(
        patient=request.user,
        status='completed'
    ).exclude(
        feedback__isnull=False
    ).select_related('counselor').order_by('-date', '-time').first()

    pending_feedback_data = None
    if pending_feedback:
        pending_feedback_data = {
            'appointment_id': pending_feedback.id,
            'counselor_name': pending_feedback.counselor.full_name,
        }

    return render(request, 'core/user_dashboard.html', {
        'first_name': first_name,
        'full_name': full_name,
        'todays_appointments': todays_appointments,
        'upcoming_sessions': upcoming_sessions,
        'wellness_tips': wellness_tips,
        'pending_feedback': json.dumps(pending_feedback_data),
    })


@login_required
def join_session(request, appointment_id):
    appointment = get_object_or_404(Appointment, id=appointment_id)

    if request.user != appointment.patient and request.user != appointment.counselor:
        return redirect('login')

    if request.user == appointment.patient:
        from django.utils.timezone import now
        appointment.user_joined_at = now()
        appointment.save()

    past_notes = []
    if request.user == appointment.counselor:
        past_notes = Appointment.objects.filter(
            counselor=appointment.counselor,
            patient=appointment.patient,
            status='completed'
        ).exclude(id=appointment.id).order_by('-date', '-time')

    channel_name = appointment.google_meet_link or ''
    agora_token = ''
    if channel_name:
        agora_token = _generate_agora_token(channel_name)

    context = {
        'appointment': appointment,
        'user_role': request.user.role,
        'patient': appointment.patient,
        'counselor': appointment.counselor,
        'past_notes': past_notes,
        'agora_app_id': os.environ.get('AGORA_APP_ID', ''),
        'agora_token': '', 
        'agora_channel': channel_name,
    }

    return render(request, 'core/join_session.html', context)


@login_required
def start_session(request, appointment_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request'}, status=400)

    appointment = get_object_or_404(Appointment, id=appointment_id)

    if request.user != appointment.counselor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=403)

    if appointment.status == 'started' and appointment.google_meet_link:
        from django.urls import reverse
        join_url = reverse('join_session', args=[appointment_id])
        return JsonResponse({'success': True, 'join_url': join_url})

    channel_name = f"mindease{appointment.id}"

    appointment.status = 'started'
    appointment.google_meet_link = channel_name
    appointment.save()

    try:
        channel_layer = get_channel_layer()
        group_name = f"user_{appointment.patient.id}"
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "session_started",
                "appointment_id": appointment.id,
                "counselor_name": appointment.counselor.full_name or appointment.counselor.get_username(),
            }
        )
    except Exception:
        pass

    from django.urls import reverse
    join_url = reverse('join_session', args=[appointment_id])
    return JsonResponse({'success': True, 'join_url': join_url})


@login_required
@csrf_exempt
def end_session(request, appointment_id):
    if request.method == 'POST':
        from django.utils.timezone import now
        appointment = get_object_or_404(Appointment, id=appointment_id)
        if request.user != appointment.counselor:
            return JsonResponse({'success': False, 'message': 'Not authorized.'})

        data = json.loads(request.body)
        notes = data.get('notes', '')
        
        # Calculate duration based on patient join (store total seconds)
        duration_secs = 0
        if appointment.user_joined_at:
            delta = now() - appointment.user_joined_at
            duration_secs = max(1, int(delta.total_seconds()))
            
        appointment.status = 'completed'
        appointment.counselor_notes = notes
        appointment.actual_duration = duration_secs
        appointment.save()

        try:
            channel_layer = get_channel_layer()
            group_name = f"session_{appointment.id}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "session_ended",
                }
            )
        except Exception:
            pass

        return JsonResponse({'success': True})

    return JsonResponse({'success': False, 'message': 'Invalid request.'})


@login_required
@csrf_exempt
def cancel_booking(request, appointment_id):
    appointment = get_object_or_404(Appointment, id=appointment_id, patient=request.user)

    if request.method == "POST":
        try:
            slot = Availability.objects.get(
                counselor=appointment.counselor,
                date=appointment.date,
                start_time=appointment.time
            )
            if slot.booked_slots > 0:
                slot.booked_slots -= 1
                slot.save()
        except Availability.DoesNotExist:
            pass

        try:
            RecentActivity.objects.create(
                activity_type='appointment_cancelled',
                user=request.user,
                description=f'{request.user.full_name} cancelled a session with {appointment.counselor.full_name}'
            )
        except Exception:
            pass

        try:
            channel_layer = get_channel_layer()
            group_name = f"user_{appointment.counselor.id}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "appointment_cancelled",
                    "appointment_id": str(appointment.id),
                    "patient_name": request.user.full_name or request.user.get_username(),
                    "date": appointment.date.strftime('%Y-%m-%d'),
                    "time": appointment.time.strftime('%I:%M %p'),
                }
            )
        except Exception:
            pass

        appointment.delete()
        return JsonResponse({'success': True})

    return JsonResponse({'success': False, 'message': 'Invalid request'})


def counselors_page(request):
    """Render the counselor filter page. The actual counselor data is loaded
    lazily via the counselors_page_api endpoint."""
    return render(request, 'core/counselorsfilter.html')


def counselors_page_api(request):
    """Lazy-loading API: returns a page of counselors with dynamic stats."""
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 6))
    search = request.GET.get('search', '').strip().lower()
    specialization = request.GET.get('specialization', 'all').strip()

    qs = User.objects.filter(
        role='counselor', is_verified=True, is_active=True
    ).order_by('id')

    if search:
        qs = qs.filter(full_name__icontains=search)
    if specialization and specialization != 'all':
        qs = qs.filter(specializations__icontains=specialization)

    total = qs.count()
    start = (page - 1) * per_page
    end = start + per_page
    counselors = qs[start:end]

    results = []
    for c in counselors:
        feedbacks = CounselorFeedback.objects.filter(counselor=c)
        review_count = feedbacks.count()
        avg_rating = feedbacks.filter(rating__isnull=False).aggregate(
            avg=Avg('rating')
        )['avg']
        avg_rating = round(avg_rating, 1) if avg_rating else 0

        view_count = CounselorProfileView.objects.filter(counselor=c).count()

        # Best review: most recent 5-star review with a rating
        best_review = feedbacks.filter(rating=5).order_by('-created_at').first()
        best_review_data = None
        if best_review:
            best_review_data = {
                'id': best_review.id,
                'rating': best_review.rating,
                'message': best_review.message,
                'created_at': best_review.created_at.strftime('%b %d, %Y'),
            }

        specs = c.get_specializations_list() if hasattr(c, 'get_specializations_list') else []

        # Get upcoming vacation dates for this counselor
        today_date = timezone.now().date()
        vacations = Availability.objects.filter(
            counselor=c, is_vacation=True, date__gte=today_date
        ).order_by('date').values_list('date', flat=True)
        
        # Group consecutive dates
        vacation_dates = []
        if vacations:
            sorted_dates = sorted(list(set(vacations)))
            groups = []
            curr_g = [sorted_dates[0]]
            for i in range(1, len(sorted_dates)):
                if (sorted_dates[i] - sorted_dates[i-1]).days == 1:
                    curr_g.append(sorted_dates[i])
                else:
                    groups.append(curr_g)
                    curr_g = [sorted_dates[i]]
            groups.append(curr_g)
            for g in groups:
                if len(g) == 1:
                    vacation_dates.append(g[0].strftime('%b %d'))
                else:
                    if g[0].month == g[-1].month:
                        vacation_dates.append(f"{g[0].strftime('%b %d')}-{g[-1].strftime('%d')}")
                    else:
                        vacation_dates.append(f"{g[0].strftime('%b %d')} - {g[-1].strftime('%b %d')}")

        results.append({
            'id': c.id,
            'full_name': c.full_name,
            'initial': c.full_name[0].upper() if c.full_name else '?',
            'institution': c.get_institution_display(),
            'bio': c.get_bio_display(),
            'verified': c.get_verified_display(),
            'specializations': specs,
            'other_specializations': c.other_specializations if hasattr(c, 'other_specializations') else '',
            'review_count': review_count,
            'avg_rating': avg_rating,
            'profile_views': view_count,
            'best_review': best_review_data,
            'vacation_dates': vacation_dates,
        })

    return JsonResponse({
        'counselors': results,
        'has_more': end < total,
        'total': total,
        'page': page,
    })


@login_required
def counselor_dashboard(request):
    if request.user.role != 'counselor':
        return redirect('login')

    today = timezone.now().date()
    # Monday of this week
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    today_appointments = Appointment.objects.filter(counselor=request.user, date=today)
    upcoming_appointments = Appointment.objects.filter(
        counselor=request.user, date__gt=today
    ).order_by('date', 'time')[:5]

    # This week's schedule: combined today + rest of the week, ordered by date/time
    this_week_schedule = Appointment.objects.filter(
        counselor=request.user,
        date__gte=today,
        date__lte=week_end,
    ).exclude(status='cancelled').order_by('date', 'time')

    # Weekly stats
    week_appointments = Appointment.objects.filter(
        counselor=request.user,
        date__gte=week_start,
        date__lte=week_end,
    )
    weekly_total_patients = week_appointments.values('patient').distinct().count()
    weekly_sessions = week_appointments.filter(status='completed').count()

    from core.models import CounselorFeedback
    avg_obj = CounselorFeedback.objects.filter(
        counselor=request.user,
        appointment__date__gte=week_start,
        appointment__date__lte=week_end,
        rating__isnull=False,
    ).aggregate(avg=Avg('rating'))
    weekly_avg_rating = round(avg_obj['avg'], 1) if avg_obj['avg'] else 0

    recent_feedback = CounselorFeedback.objects.filter(counselor=request.user).select_related('patient').order_by('-created_at')[:1]

    context = {
        'today_appointments': today_appointments,
        'upcoming_appointments': upcoming_appointments,
        'this_week_schedule': this_week_schedule,
        'weekly_total_patients': weekly_total_patients,
        'weekly_sessions': weekly_sessions,
        'weekly_avg_rating': weekly_avg_rating,
        'recent_feedback': recent_feedback,
    }
    return render(request, 'core/counselor_dashboard.html', context)


@login_required
def get_counselor_availability(request, counselor_id):
    from datetime import date
    from django.db import models
    counselor = get_object_or_404(User, id=counselor_id, role='counselor')
    today = date.today()
    now_time = timezone.now().time()
    slots = Availability.objects.filter(
        counselor_id=counselor_id,
        date__gte=today,
        is_vacation=False
    ).exclude(
        booked_slots__gte=models.F('total_slots')
    ).exclude(
        # Exclude today's slots whose booking window has already passed
        date=today,
        end_time__lte=now_time
    ).order_by('date', 'start_time')

    data = [
        {
            "id": s.id,
            "weekday": s.weekday,
            "date": s.date.strftime("%Y-%m-%d"),
            "start": s.start_time.strftime("%I:%M %p"),
            "end": s.end_time.strftime("%I:%M %p"),
            "start_time": s.start_time.strftime("%I:%M %p"),
            "end_time": s.end_time.strftime("%I:%M %p"),
            "total_slots": s.total_slots,
            "booked_slots": s.booked_slots,
        }
        for s in slots
    ]

    return JsonResponse({"slots": data})


@login_required
def manage_availability(request):
    if request.user.role != 'counselor':
        return redirect('login')

    if request.method == 'POST':
        date = request.POST.get('date')
        start_time = request.POST.get('start_time')
        end_time = request.POST.get('end_time')

        if date and start_time and end_time:
            Availability.objects.create(
                counselor=request.user,
                date=date,
                start_time=start_time,
                end_time=end_time
            )
            return redirect('manage_availability')

    availabilities = Availability.objects.filter(
        counselor=request.user, date__gte=timezone.now().date()
    )
    return render(request, 'core/manage_availability.html', {'availabilities': availabilities})


@login_required
def get_support(request):
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        message = request.POST.get("message", "").strip()

        if not message:
            messages.error(request, "Message is required.")
        else:
            from core.models import SystemFeedback
            SystemFeedback.objects.create(
                name=name or None,
                message=message
            )
            messages.success(request, "Your message has been sent to our support team. Thank you!")
            return redirect("get_support")

    return render(request, "core/get_support.html")


@login_required
def patient_records(request):
    if request.user.role != "counselor":
        return redirect("login")
    return render(request, 'core/patient_records.html')

@login_required
def patient_records_api(request):
    if request.user.role != 'counselor':
        return JsonResponse({'error': 'Unauthorized'}, status=403)
        
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 10))
    search = request.GET.get('search', '').strip().lower()

    qs = Appointment.objects.filter(
        counselor=request.user, 
        status__in=['completed', 'started', 'pending', 'cancelled']
    ).order_by('-date', '-time')
    
    if search:
        qs = qs.filter(patient__full_name__icontains=search)

    total = qs.count()
    start = (page - 1) * per_page
    end = start + per_page
    sessions = qs[start:end]

    results = []
    for s in sessions:
        if s.status == 'completed':
            total_secs = s.actual_duration or 0
            mins = total_secs // 60
            secs = total_secs % 60
            if mins > 0 and secs > 0:
                duration_text = f"{mins} mins {secs} secs"
            elif mins > 0:
                duration_text = f"{mins} mins"
            else:
                duration_text = f"{secs} secs"
        elif s.status == 'started':
            duration_text = "In Progress"
        else:
            duration_text = "N/A"
            
        results.append({
            'patient_name': s.patient.full_name,
            'patient_initial': s.patient.full_name[0].upper() if s.patient.full_name else '?',
            'status': s.status,
            'date': s.date.strftime('%b %d, %Y'),
            'time': s.time.strftime('%I:%M %p'),
            'duration_text': duration_text,
            'counselor_notes': s.counselor_notes or 'No notes yet.'
        })

    return JsonResponse({
        'sessions': results,
        'has_more': end < total,
        'total': total,
        'page': page
    })

@login_required
def past_sessions(request):
    return render(request, 'core/past_sessions.html')

@login_required
def past_sessions_api(request):
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 10))
    sort = request.GET.get('sort', 'latest')

    qs = Appointment.objects.filter(
        patient=request.user, 
        status__in=['completed', 'started', 'pending']
    ).select_related('counselor')

    # Sorting
    if sort == 'a-z':
        qs = qs.order_by('counselor__full_name', '-date')
    elif sort == 'z-a':
        qs = qs.order_by('-counselor__full_name', '-date')
    elif sort == 'oldest':
        qs = qs.order_by('date', 'time')
    else:  # latest (default)
        qs = qs.order_by('-date', '-time')

    total = qs.count()
    start = (page - 1) * per_page
    end = start + per_page
    sessions = qs[start:end]

    results = []
    for s in sessions:
        # Safely get feedback
        try:
            fb = s.feedback
            rating = fb.rating if fb.rating else 0
            has_feedback = True
            feedback_message = fb.message or ''
        except Exception:
            rating = 0
            has_feedback = False
            feedback_message = ''

        # Get counselor specializations
        specs = s.counselor.get_specializations_list() if hasattr(s.counselor, 'get_specializations_list') else []
        other_specs = s.counselor.other_specializations if hasattr(s.counselor, 'other_specializations') else ''

        # Duration text
        if s.status == 'completed':
            total_secs = s.actual_duration or 0
            mins = total_secs // 60
            secs = total_secs % 60
            if mins > 0 and secs > 0:
                duration_text = f"{mins} mins {secs} secs"
            elif mins > 0:
                duration_text = f"{mins} mins"
            else:
                duration_text = f"{secs} secs"
        elif s.status == 'started':
            duration_text = "In Progress"
        else:
            duration_text = "N/A"

        results.append({
            'id': s.id,
            'counselor_name': s.counselor.full_name,
            'counselor_initial': s.counselor.full_name[0].upper() if s.counselor.full_name else '?',
            'status': s.status,
            'date': s.date.strftime('%b %d, %Y'),
            'time': s.time.strftime('%I:%M %p'),
            'duration_text': duration_text,
            'rating': rating,
            'has_feedback': has_feedback,
            'feedback_message': feedback_message,
            'specializations': specs,
            'other_specializations': other_specs or '',
        })

    return JsonResponse({
        'sessions': results,
        'has_more': end < total,
        'total': total,
        'page': page
    })

@login_required
def counselor_profile_update(request):
    user = request.user
    if user.role != "counselor":
        messages.error(request, "Unauthorized access.")
        return redirect('home')

    if request.method == "POST":
        try:
            user.full_name = request.POST.get("full_name", user.full_name)
            user.years_experience = request.POST.get("years_experience", user.years_experience)
            user.bio = request.POST.get("bio", user.bio)
            user.institution_name = request.POST.get("institution_name", user.institution_name)
            user.institution_email = request.POST.get("institution_email", user.institution_email)
            user.license_number = request.POST.get("license_number", user.license_number)

            specializations = request.POST.getlist("specializations")
            user.specializations = specializations if specializations else []
            user.other_specializations = request.POST.get("other_concerns", user.other_specializations)

            if 'professional_id' in request.FILES:
                user.professional_id = request.FILES['professional_id']
            if 'degree_certificate' in request.FILES:
                user.degree_certificate = request.FILES['degree_certificate']

            user.save()
            messages.success(request, "Profile updated successfully!")
            return redirect('counselor_dashboard')

        except Exception as e:
            messages.error(request, f"Error updating profile: {str(e)}")
            return redirect('counselor_dashboard')

    # Dynamic stats
    feedbacks = CounselorFeedback.objects.filter(counselor=user)
    review_count = feedbacks.count()
    avg_obj = feedbacks.filter(rating__isnull=False).aggregate(avg=Avg('rating'))
    avg_rating = round(avg_obj['avg'], 1) if avg_obj['avg'] else None
    profile_views = CounselorProfileView.objects.filter(counselor=user).count()

    return render(request, "core/counselor_profile_update.html", {
        "user": user,
        "specializations": [
            "Anxiety & Stress", "Depression & Mood", "Relationship Issues",
            "Trauma & PTSD", "Grief & Loss", "Self-Esteem", "Life Transitions",
            "Work Stress", "Financial Stress", "Academic Pressure", "Parenting",
            "Anger Management", "Mindfulness", "Other Mild Concerns"
        ],
        "selected_specializations": user.specializations or [],
        "profile_views": profile_views,
        "avg_rating": avg_rating,
        "review_count": review_count,
    })


@login_required
def user_profile(request):
    return render(request, 'core/user_profile.html')


@login_required
def counselor_profile(request):
    user = request.user
    if user.role != "counselor":
        return redirect("counselor_dashboard")

    if request.method == "POST":
        user.full_name = request.POST.get("fullname") or user.full_name
        user.email = request.POST.get("email") or user.email
        user.years_experience = request.POST.get("experience") or user.years_experience
        user.bio = request.POST.get("bio") or user.bio
        user.license_number = request.POST.get("license_number") or user.license_number
        user.institution_name = request.POST.get("institution_name") or user.institution_name

        specializations = request.POST.getlist("specializations")
        user.specializations = specializations if specializations else []
        user.save()

        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse({
                "status": "success",
                "full_name": user.full_name,
                "email": user.email,
                "years_experience": user.years_experience,
                "bio": user.bio,
                "license_number": user.license_number,
                "institution_name": user.institution_name,
                "specializations": user.specializations
            })

        return redirect("counselor_profile")

    # Dynamic stats
    feedbacks = CounselorFeedback.objects.filter(counselor=user)
    review_count = feedbacks.count()
    avg_obj = feedbacks.filter(rating__isnull=False).aggregate(avg=Avg('rating'))
    avg_rating = round(avg_obj['avg'], 1) if avg_obj['avg'] else None
    profile_views = CounselorProfileView.objects.filter(counselor=user).count()

    return render(request, "core/counselor_profile_update.html", {
        "user": user,
        "selected_specializations": user.specializations or [],
        "profile_views": profile_views,
        "avg_rating": avg_rating,
        "review_count": review_count,
    })


@login_required
@csrf_exempt
@transaction.atomic
def book_counselor(request, counselor_id):
    counselor = get_object_or_404(User, id=counselor_id, role='counselor')

    if request.method == 'POST':
        slot_id = request.POST.get('slot_id')
        if not slot_id:
            return JsonResponse({'error': 'Invalid data'}, status=400)

        slot = get_object_or_404(Availability.objects.select_for_update(), id=slot_id, counselor=counselor)

        # Reject if the slot's time window has expired (deadline-style)
        now = timezone.now()
        if slot.date == now.date() and now.time() > slot.end_time:
            return JsonResponse({'error': 'This time slot is no longer available. The booking window has passed.'}, status=400)

        remaining = slot.total_slots - slot.booked_slots
        if remaining <= 0:
            return JsonResponse({'error': 'This slot is fully booked'}, status=400)

        existing_booking = Appointment.objects.filter(
            patient=request.user,
            date=slot.date
        ).exists()

        if existing_booking:
            return JsonResponse({'error': 'Sorry! You can only book once per day'}, status=400)

        slot.booked_slots += 1
        slot.save()

        appointment = Appointment.objects.create(
            patient=request.user,
            counselor=counselor,
            date=slot.date,
            time=slot.start_time
        )

        try:
            RecentActivity.objects.create(
                activity_type='appointment_booked',
                user=request.user,
                description=f'{request.user.full_name} booked a session with {counselor.full_name}'
            )
        except Exception:
            pass
            
        # Send WebSocket notification to counselor
        channel_layer = get_channel_layer()
        if channel_layer:
            from asgiref.sync import async_to_sync
            async_to_sync(channel_layer.group_send)(
                f"user_{counselor.id}",
                {
                    "type": "appointment_booked",
                    "patient_name": request.user.full_name,
                    "date": slot.date.strftime('%Y-%m-%d'),
                    "time": slot.start_time.strftime('%I:%M %p'),
                    "appointment_id": appointment.id,
                }
            )

        return JsonResponse({'success': True})

    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
def get_availability(request):
    slots = Availability.objects.filter(
        counselor=request.user, 
        is_vacation=False, 
        date__gte=timezone.now().date()
    ).order_by('date', 'start_time')
    data = [
        {
            "id": s.id,
            "weekday": s.weekday,
            "date": s.date.strftime("%Y-%m-%d"),
            "start_time": s.start_time.strftime("%I:%M %p"),
            "end_time": s.end_time.strftime("%I:%M %p"),
            "total_slots": s.total_slots,
            "booked_slots": s.booked_slots
        }
        for s in slots
    ]
    return JsonResponse({"slots": data})


@csrf_exempt
@login_required
def add_availability(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            date_str = data.get("date")
            start_time = data.get("start_time")
            end_time = data.get("end_time")
            total_slots = int(data.get("total_slots", 1))

            if not date_str or not start_time or not end_time:
                return JsonResponse({"success": False, "message": "Missing fields"})

            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            start_time_obj = datetime.strptime(start_time, "%I:%M %p").time()
            end_time_obj = datetime.strptime(end_time, "%I:%M %p").time()

            slot = Availability.objects.create(
                counselor=request.user,
                date=date_obj,
                start_time=start_time_obj,
                end_time=end_time_obj,
                total_slots=total_slots,
                booked_slots=0
            )

            return JsonResponse({"success": True, "slot_id": slot.id})

        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)})


@login_required
@csrf_exempt
def delete_availability(request, slot_id):
    try:
        slot = Availability.objects.get(id=slot_id, counselor=request.user)
        
        appointments = Appointment.objects.filter(
            counselor=request.user,
            date=slot.date,
            time=slot.start_time,
            status__in=['pending', 'Pending']
        )
        
        try:
            channel_layer = get_channel_layer()
            for appt in appointments:
                group_name = f"user_{appt.patient.id}"
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "availability_removed",
                        "appointment_id": str(appt.id),
                        "counselor_name": request.user.full_name or request.user.get_username(),
                        "date": slot.date.strftime('%Y-%m-%d'),
                        "time": slot.start_time.strftime('%I:%M %p'),
                    }
                )
        except Exception:
            pass
            
        appointments.update(status='cancelled')
        
        slot.delete()
        return JsonResponse({"success": True})
    except Availability.DoesNotExist:
        return JsonResponse({"success": False, "message": "Slot not found"})


@csrf_exempt
@login_required
def copy_last_week(request):
    if request.method == "POST":
        today = date.today()
        last_week_start = today - timedelta(days=7)
        last_week_end = last_week_start + timedelta(days=6)
        slots = Availability.objects.filter(
            counselor=request.user, date__range=[last_week_start, last_week_end]
        )
        for slot in slots:
            next_week_date = slot.date + timedelta(days=7)
            Availability.objects.create(
                counselor=request.user,
                weekday=slot.weekday,
                date=next_week_date,
                start_time=slot.start_time,
                end_time=slot.end_time
            )
        return JsonResponse({"success": True})
    return JsonResponse({"success": False, "message": "Invalid request"})


@csrf_exempt
@login_required
def clear_week(request):
    if request.method == "POST":
        today = date.today()
        week_start = today
        week_end = today + timedelta(days=6)
        Availability.objects.filter(
            counselor=request.user, date__range=[week_start, week_end]
        ).delete()
        return JsonResponse({"success": True})
    return JsonResponse({"success": False, "message": "Invalid request"})


@csrf_exempt
@login_required
def vacation_mode(request):
    if request.method == "POST":
        data = json.loads(request.body)
        start_str = data.get("start")
        end_str = data.get("end")
        if not start_str or not end_str:
            return JsonResponse({"success": False, "message": "Invalid dates"})
        start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
        if end_date < start_date:
            return JsonResponse({"success": False, "message": "End date must be after start date"})
        # Create vacation entries for each day in the range
        current = start_date
        created_count = 0
        while current <= end_date:
            _, created = Availability.objects.get_or_create(
                counselor=request.user,
                date=current,
                start_time='00:00',
                end_time='23:59',
                defaults={'is_vacation': True, 'total_slots': 0}
            )
            if created:
                created_count += 1
            else:
                # Update existing to vacation
                Availability.objects.filter(
                    counselor=request.user, date=current,
                    start_time='00:00', end_time='23:59',
                ).update(is_vacation=True)
            current += timedelta(days=1)
        return JsonResponse({"success": True, "days_set": created_count})
    return JsonResponse({"success": False, "message": "Invalid request"})


def check_session_status(request):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': False, 'appointments': []})

    today = timezone.now().date()
    appointments = Appointment.objects.filter(
        patient=request.user,
        date=today,
        status__in=['started', 'completed']
    )

    data = []
    for appt in appointments:
        needs_feedback = False
        if appt.status == 'completed':
            from core.models import CounselorFeedback
            needs_feedback = not hasattr(appt, 'feedback')

        data.append({
            'id': appt.id,
            'status': appt.status,
            'google_meet_link': appt.google_meet_link or '',
            'counselor_name': appt.counselor.full_name or appt.counselor.get_username(),
            'needs_feedback': needs_feedback,
        })

    return JsonResponse({'isAuthenticated': True, 'appointments': data})


@login_required
@csrf_exempt
def submit_feedback(request, appointment_id):
    """Submit feedback for a completed appointment. One-time only."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request'}, status=400)

    appointment = get_object_or_404(Appointment, id=appointment_id, patient=request.user)
    if appointment.status != 'completed':
        return JsonResponse({'success': False, 'message': 'Appointment not completed'}, status=400)

    if hasattr(appointment, 'feedback'):
        return JsonResponse({'success': False, 'message': 'Feedback already submitted'}, status=400)

    data = json.loads(request.body)
    message_text = data.get('message', '').strip()
    rating = data.get('rating')  # can be None

    if not message_text:
        return JsonResponse({'success': False, 'message': 'Message is required'}, status=400)

    if rating is not None:
        rating = int(rating)
        if rating < 1 or rating > 5:
            return JsonResponse({'success': False, 'message': 'Invalid rating'}, status=400)

    CounselorFeedback.objects.create(
        counselor=appointment.counselor,
        patient=request.user,
        appointment=appointment,
        rating=rating,
        message=message_text,
    )

    # Log to recent activity
    try:
        if rating:
            desc = f'User #{request.user.id} sent feedback with {rating} rating(s) for {appointment.counselor.full_name}'
        else:
            desc = f'User #{request.user.id} sent feedback without ratings for {appointment.counselor.full_name}'
        RecentActivity.objects.create(
            activity_type='feedback_sent',
            user=request.user,
            description=desc,
        )
    except Exception:
        pass

    return JsonResponse({'success': True})


def get_counselor_reviews(request, counselor_id):
    """Return anonymized reviews for a counselor."""
    counselor = get_object_or_404(User, id=counselor_id, role='counselor')
    feedbacks = CounselorFeedback.objects.filter(counselor=counselor).order_by('-created_at')

    reviews = []
    for idx, fb in enumerate(feedbacks, 1):
        reviews.append({
            'id': fb.id,
            'user_label': f'User #{idx}',
            'rating': fb.rating,
            'message': fb.message,
            'created_at': fb.created_at.strftime('%b %d, %Y'),
        })

    return JsonResponse({'reviews': reviews, 'total': len(reviews)})


def get_single_review(request, review_id):
    """Return a single review detail (for featured review modal)."""
    fb = get_object_or_404(CounselorFeedback, id=review_id)
    return JsonResponse({
        'id': fb.id,
        'rating': fb.rating,
        'message': fb.message,
        'created_at': fb.created_at.strftime('%b %d, %Y'),
    })


@csrf_exempt
def track_profile_view(request, counselor_id):
    """Track a profile view. One unique view per visitor per counselor per day."""
    if request.method != 'POST':
        return JsonResponse({'success': False}, status=400)

    counselor = get_object_or_404(User, id=counselor_id, role='counselor')

    # Build a viewer hash from session key or IP
    if hasattr(request, 'session') and request.session.session_key:
        raw = request.session.session_key
    else:
        raw = request.META.get('REMOTE_ADDR', 'unknown')
    viewer_hash = hashlib.sha256(raw.encode()).hexdigest()

    today = timezone.now().date()
    _, created = CounselorProfileView.objects.get_or_create(
        counselor=counselor,
        viewer_hash=viewer_hash,
        view_date=today,
    )

    return JsonResponse({'success': True, 'new': created})


# ── New API endpoints ──

@login_required
def get_vacations(request):
    """Return counselor's upcoming vacation entries, grouped by consecutive dates."""
    if request.user.role != 'counselor':
        return JsonResponse({'success': False}, status=403)
    today = timezone.now().date()
    vacations = Availability.objects.filter(
        counselor=request.user, is_vacation=True, date__gte=today
    ).order_by('date')
    
    if not vacations:
        return JsonResponse({'vacations': []})
        
    # Group consecutive dates
    groups = []
    current_group = [vacations[0]]
    
    for i in range(1, len(vacations)):
        if (vacations[i].date - vacations[i-1].date).days == 1:
            current_group.append(vacations[i])
        else:
            groups.append(current_group)
            current_group = [vacations[i]]
    groups.append(current_group)
    
    data = []
    for g in groups:
        ids = ",".join(str(v.id) for v in g)
        if len(g) == 1:
            date_str = g[0].date.strftime('%b %d, %Y')
            weekday_str = g[0].date.strftime('%A')
        else:
            if g[0].date.month == g[-1].date.month:
                date_str = f"{g[0].date.strftime('%b %d')}-{g[-1].date.strftime('%d, %Y')}"
            else:
                date_str = f"{g[0].date.strftime('%b %d')} - {g[-1].date.strftime('%b %d, %Y')}"
            weekday_str = f"{g[0].date.strftime('%a')} - {g[-1].date.strftime('%a')}"
            
        data.append({
            'id': ids,
            'date': date_str,
            'weekday': weekday_str,
        })
        
    return JsonResponse({'vacations': data})


@csrf_exempt
@login_required
def delete_vacation(request, vacation_id):
    """Delete one or multiple vacation entries (comma-separated string of IDs)."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request'}, status=400)
    try:
        # vacation_id is passed as a string which could be a single ID or comma-separated
        ids = str(vacation_id).split(',')
        Availability.objects.filter(id__in=ids, counselor=request.user, is_vacation=True).delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@login_required
def last_week_report(request):
    """Return last week's stats for clipboard copy."""
    if request.user.role != 'counselor':
        return JsonResponse({'success': False}, status=403)
    today = timezone.now().date()
    # Last week: Monday to Sunday
    this_monday = today - timedelta(days=today.weekday())
    last_monday = this_monday - timedelta(days=7)
    last_sunday = this_monday - timedelta(days=1)

    appointments = Appointment.objects.filter(
        counselor=request.user,
        date__gte=last_monday,
        date__lte=last_sunday,
    )
    completed = appointments.filter(status='completed').count()
    missed = appointments.filter(status__in=['cancelled', 'pending']).count()
    patients = appointments.values('patient__full_name').distinct()
    patient_names = [p['patient__full_name'] for p in patients]
    total_patients = len(patient_names)

    return JsonResponse({
        'counselor_name': request.user.full_name,
        'week_start': last_monday.strftime('%b %d, %Y'),
        'week_end': last_sunday.strftime('%b %d, %Y'),
        'completed': completed,
        'missed': missed,
        'total_patients': total_patients,
        'patient_names': patient_names,
    })


@csrf_exempt
@login_required
def clear_week_schedule(request):
    """Cancel all this week's non-completed appointments for the counselor."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request'}, status=400)
    if request.user.role != 'counselor':
        return JsonResponse({'success': False}, status=403)
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    updated = Appointment.objects.filter(
        counselor=request.user,
        date__gte=today,
        date__lte=week_end,
        status__in=['pending', 'Pending'],
    ).update(status='cancelled')
    return JsonResponse({'success': True, 'cancelled': updated})