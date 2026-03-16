from django.contrib import admin
from django.contrib.auth import login
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import path, reverse
from django.http import HttpResponseRedirect, JsonResponse
from django.contrib import messages
from django.core.paginator import Paginator
from urllib.parse import quote

from accounts.models import User
from accounts.admin import CustomUserAdmin
from accounts.forms import EmailAuthenticationForm
from .models import RecentActivity, WellnessTip
from core.models import CounselorFeedback
from django import forms


class WellnessTipForm(forms.ModelForm):
    class Meta:
        model = WellnessTip
        fields = ['title', 'description']


class CustomAdminSite(admin.AdminSite):
    """Custom AdminSite for MindEase admin panel"""
    site_header = "MindEase Administration"
    site_title = "Admin Portal"
    index_template = "admin_panel/admin_site.html"
    login_template = "admin_panel/admin_login.html"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('pending-approval/', self.admin_view(self.pending_approval_view), name='pending_approval'),
            path('approve-counselor/<int:user_id>/', self.admin_view(self.approve_counselor), name='approve_counselor'),
            path('reject-counselor/<int:user_id>/', self.admin_view(self.reject_counselor), name='reject_counselor'),
            path('users/', self.admin_view(self.user_list_view), name='user_list'),
            path('counselors/', self.admin_view(self.counselor_list_view), name='counselor_list'),
            path('recent-activities/', self.admin_view(self.recent_activities_view), name='recent_activities'),
            path('wellness-tips/', self.admin_view(self.wellness_tips_list_view), name='wellness_tips_list'),
            path('wellness-tips/add/', self.admin_view(self.add_wellness_tip), name='add_wellness_tip'),
            path('wellness-tips/<int:tip_id>/edit/', self.admin_view(self.edit_wellness_tip), name='edit_wellness_tip'),
            path('wellness-tips/<int:tip_id>/delete/', self.admin_view(self.delete_wellness_tip), name='delete_wellness_tip'),
            path('feedback/', self.admin_view(self.feedback_list_view), name='feedback_list'),
            path('recent-system-feedback/', self.admin_view(self.recent_system_feedback_view), name='recent_system_feedback'),
        ]
        return custom_urls + urls
    
    # --- Feedback views ---
    def feedback_list_view(self, request):
        feedbacks = CounselorFeedback.objects.select_related(
            'counselor', 'patient', 'appointment'
        ).order_by('-created_at')
        context = {
            'feedbacks': feedbacks,
            **self.each_context(request),
        }
        return render(request, 'admin_panel/list_of_feedback.html', context)

    # --- Wellness Tips views ---
    def wellness_tips_list_view(self, request):
        tips = WellnessTip.objects.all()
        context = {
            'tips': tips,
            **self.each_context(request),
        }
        return render(request, 'admin_panel/list_of_wellness_tips.html', context)

    def add_wellness_tip(self, request):
        if request.method == 'POST':
            form = WellnessTipForm(request.POST)
            if form.is_valid():
                form.save()
                messages.success(request, 'Wellness Tip added successfully!')
                return redirect('custom_admin:wellness_tips_list')
        else:
            form = WellnessTipForm()
        context = {
            'form': form,
            **self.each_context(request),
        }
        return render(request, 'admin_panel/add_edit_wellness_tip.html', context)

    def edit_wellness_tip(self, request, tip_id):
        tip = get_object_or_404(WellnessTip, id=tip_id)
        if request.method == 'POST':
            form = WellnessTipForm(request.POST, instance=tip)
            if form.is_valid():
                form.save()
                messages.success(request, 'Wellness Tip updated successfully!')
                return redirect('custom_admin:wellness_tips_list')
        else:
            form = WellnessTipForm(instance=tip)
        context = {
            'form': form,
            'tip': tip,
            **self.each_context(request),
        }
        return render(request, 'admin_panel/add_edit_wellness_tip.html', context)

    def delete_wellness_tip(self, request, tip_id):
        tip = get_object_or_404(WellnessTip, id=tip_id)
        tip.delete()
        messages.success(request, 'Wellness Tip deleted successfully!')
        return redirect('custom_admin:wellness_tips_list')

    def user_list_view(self, request):
        users = User.objects.all()
        context = {
            "users": users,
            **self.each_context(request),
        }
        return render(request, "admin_panel/list_of_users.html", context)

    def counselor_list_view(self, request):
        counselors = User.objects.filter(role='counselor', is_active=True)
        context = {
            "counselors": counselors,
            **self.each_context(request),
        }
        return render(request, "admin_panel/list_of_counselors.html", context)

    def pending_approval_view(self, request):
        pending_counselors = User.objects.filter(
            role='counselor',
            is_verified=False,
            is_active=True
        )
        context = {
            'pending_counselors': pending_counselors,
            'pending_counselors_count': pending_counselors.count(),
            **self.each_context(request),
        }
        return render(request, 'admin_panel/pending_approval.html', context)

    def recent_activities_view(self, request):
        """AJAX endpoint for paginated recent activities"""
        page = request.GET.get('page', 1)
        activities = RecentActivity.objects.select_related('user', 'admin_user')
        
        paginator = Paginator(activities, 3)  # 3 activities per page
        page_obj = paginator.get_page(page)
        
        activities_data = []
        for activity in page_obj:
            icon, bg_color, text_color = activity.get_icon_and_color()
            activities_data.append({
                'icon': icon,
                'bg_color': bg_color,
                'text_color': text_color,
                'description': activity.description,
                'time_since': activity.time_since(),
            })
        
        return JsonResponse({
            'activities': activities_data,
            'has_previous': page_obj.has_previous(),
            'has_next': page_obj.has_next(),
            'previous_page_number': page_obj.previous_page_number() if page_obj.has_previous() else None,
            'next_page_number': page_obj.next_page_number() if page_obj.has_next() else None,
            'current_page': page_obj.number,
            'total_pages': paginator.num_pages,
        })

    def approve_counselor(self, request, user_id):
        if request.method == 'POST':
            counselor = get_object_or_404(User, id=user_id, role='counselor')
            counselor.is_verified = True
            counselor.is_active = True
            counselor.save()
            
            # Create activity record
            RecentActivity.objects.create(
                activity_type='counselor_approved',
                user=counselor,
                admin_user=request.user,
                description=f'Counselor {counselor.full_name} was approved'
            )
            
            messages.success(request, f'{counselor.full_name} has been approved as a counselor.')
            return HttpResponseRedirect(reverse('custom_admin:pending_approval'))

    def reject_counselor(self, request, user_id):
        if request.method == 'POST':
            counselor = get_object_or_404(User, id=user_id, role='counselor')
            counselor.is_verified = False
            counselor.is_active = False
            counselor.save()
            
            # Create activity record
            RecentActivity.objects.create(
                activity_type='counselor_rejected',
                user=counselor,
                admin_user=request.user,
                description=f'Counselor {counselor.full_name} was rejected'
            )
            
            messages.success(request, f'{counselor.full_name} has been rejected as a counselor.')
            return HttpResponseRedirect(reverse('custom_admin:pending_approval'))

    def _time_since(self, dt):
        """Return a human-readable relative time string."""
        from django.utils import timezone
        now = timezone.now()
        diff = now - dt
        seconds = diff.total_seconds()
        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            mins = int(seconds // 60)
            return f"{mins} minute{'s' if mins != 1 else ''} ago"
        elif seconds < 86400:
            hours = int(seconds // 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif seconds < 604800:
            days = int(seconds // 86400)
            return f"{days} day{'s' if days != 1 else ''} ago"
        else:
            return dt.strftime('%b %d, %Y')

    def recent_system_feedback_view(self, request):
        """AJAX endpoint for paginated feedbacks – supports ?type=system|counselor"""
        from core.models import SystemFeedback, CounselorFeedback
        page = request.GET.get('page', 1)
        fb_type = request.GET.get('type', 'system')
        
        feedback_data = []
        
        if fb_type == 'counselor':
            feedbacks = CounselorFeedback.objects.select_related('patient', 'counselor').order_by('-created_at')
            paginator = Paginator(feedbacks, 3)
            page_obj = paginator.get_page(page)
            for fb in page_obj:
                feedback_data.append({
                    'name': f'User #{fb.patient.id}',
                    'message': fb.message,
                    'extra': f'for {fb.counselor.full_name}' if fb.counselor else '',
                    'rating': fb.rating,
                    'time_since': self._time_since(fb.created_at),
                    'type': 'counselor',
                })
        else:
            feedbacks = SystemFeedback.objects.all()
            paginator = Paginator(feedbacks, 3)
            page_obj = paginator.get_page(page)
            for fb in page_obj:
                feedback_data.append({
                    'name': fb.name or 'Anonymous',
                    'message': fb.message,
                    'extra': '',
                    'rating': None,
                    'time_since': self._time_since(fb.created_at),
                    'type': 'system',
                })
            
        return JsonResponse({
            'feedbacks': feedback_data,
            'has_previous': page_obj.has_previous(),
            'has_next': page_obj.has_next(),
            'previous_page_number': page_obj.previous_page_number() if page_obj.has_previous() else None,
            'next_page_number': page_obj.next_page_number() if page_obj.has_next() else None,
            'current_page': page_obj.number,
            'total_pages': paginator.num_pages,
        })

    def index(self, request, extra_context=None):
        extra_context = extra_context or {}

        # Load recent activities
        recent_activities = RecentActivity.objects.select_related('user', 'admin_user')[:3]
        activities_data = []

        for activity in recent_activities:
            icon, bg_color, text_color = activity.get_icon_and_color()
            activities_data.append({
                'icon': icon,
                'bg_color': bg_color,
                'text_color': text_color,
                'description': activity.description,
                'time_since': activity.time_since(),
            })

        total_activities = RecentActivity.objects.count()
        has_pagination = total_activities > 3
        import math
        total_pages = math.ceil(total_activities / 3)

        # Load system feedback (default tab)
        from core.models import SystemFeedback, CounselorFeedback
        system_feedbacks = SystemFeedback.objects.all()[:3]
        feedback_data = []
        for fb in system_feedbacks:
            feedback_data.append({
                'name': fb.name or 'Anonymous',
                'message': fb.message,
                'time_since': self._time_since(fb.created_at),
            })
        
        total_sys_feedback = SystemFeedback.objects.count()
        total_counselor_feedback = CounselorFeedback.objects.count()
        total_feedback = total_sys_feedback
        fb_has_pagination = total_feedback > 3
        fb_total_pages = math.ceil(total_feedback / 3) if total_feedback > 0 else 1

        # ✅ Add your dashboard counters here
        extra_context.update({
            "total_users": User.objects.filter(role="user").count(),
            "total_counselors": User.objects.filter(role="counselor", is_verified=True).count(),
            "pending_counselors": User.objects.filter(role="counselor", is_verified=False, is_active=True).count(),
            "total_admins": User.objects.filter(role="admin").count(),
            
            "recent_activities": activities_data,
            "has_pagination": has_pagination,
            "total_activities": total_activities,
            "total_pages": total_pages,

            "system_feedbacks": feedback_data,
            "fb_has_pagination": fb_has_pagination,
            "total_feedback": total_feedback,
            "fb_total_pages": fb_total_pages,
            "total_sys_feedback": total_sys_feedback,
            "total_counselor_feedback": total_counselor_feedback,
        })

        return super().index(request, extra_context)

    def login(self, request, extra_context=None):
        form = EmailAuthenticationForm(request, data=request.POST or None)
        if request.method == "POST":
            if form.is_valid():
                user = form.get_user()
                if user is not None and user.is_active:
                    if user.is_staff and user.is_superuser:
                        login(request, user)
                        return redirect("custom_admin:index")
                    else:
                        form.add_error(None, "Only Admins can enter this site!")
        context = {
            "form": form,
            **self.each_context(request),
            **(extra_context or {}),
        }
        return render(request, self.login_template, context)

    def logout(self, request, extra_context=None):
        from django.contrib.auth import logout as django_logout
        django_logout(request)
        return redirect("custom_admin:login")


class CustomUserAdminWithMedia(CustomUserAdmin):
    """CustomUserAdmin with media files for the admin panel"""
    class Media:
        js = (
            'admin_panel/js/user_admin.js',
            'admin_panel/js/custom_select.js',
        )
        css = {
            'all': ('admin_panel/css/add_form.css',)
        }
    
    def response_add(self, request, obj, post_url_continue=None):
        """Override the response after adding a new user"""
        if "_continue" not in request.POST and "_addanother" not in request.POST:
            # Create activity record
            activity_type_map = {
                'user': 'user_added',
                'counselor': 'counselor_added',
                'admin': 'admin_added',
            }
            
            activity_type = activity_type_map.get(obj.role, 'user_added')
            role_display = obj.role.capitalize() if obj.role != 'admin' else 'Admin'
            
            RecentActivity.objects.create(
                activity_type=activity_type,
                user=obj,
                admin_user=request.user,
                description=f'{role_display} {obj.full_name} was added to the system'
            )
            
            # Add success message as URL parameter
            if obj.role == 'counselor':
                success_message = quote(f"Counselor '{obj.full_name}' was added successfully")
                return redirect(f"{reverse('custom_admin:counselor_list')}?success={success_message}")
            else:
                role_name = "Admin" if obj.role == 'admin' else "User"
                success_message = quote(f"{role_name} '{obj.full_name}' was added successfully")
                return redirect(f"{reverse('custom_admin:user_list')}?success={success_message}")
        else:
            # For "Save and continue editing" or "Save and add another"
            response = super().response_add(request, obj, post_url_continue)
            # Clear any messages that might have been added
            storage = messages.get_messages(request)
            for message in storage:
                pass
            storage.used = True
            return response
    
    def response_change(self, request, obj):
        """Override the response after changing a user"""
        if "_continue" not in request.POST:
            # Add success message as URL parameter - use obj.full_name instead of str(obj)
            if obj.role == 'counselor':
                success_message = quote(f"Counselor '{obj.full_name}' was updated successfully")
                return redirect(f"{reverse('custom_admin:counselor_list')}?success={success_message}")
            else:
                role_name = "Admin" if obj.role == 'admin' else "User"
                success_message = quote(f"{role_name} '{obj.full_name}' was updated successfully")
                return redirect(f"{reverse('custom_admin:user_list')}?success={success_message}")
        else:
            # For "Save and continue editing"
            response = super().response_change(request, obj)
            # Clear any messages that might have been added
            storage = messages.get_messages(request)
            for message in storage:
                pass
            storage.used = True
            return response


# Register user model with custom admin site
custom_admin_site = CustomAdminSite(name="custom_admin")
custom_admin_site.register(User, CustomUserAdminWithMedia)
custom_admin_site.register(WellnessTip)
