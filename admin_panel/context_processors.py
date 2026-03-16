from accounts.models import User
from core.models import CounselorFeedback

def sidebar_context(request):
    if request.user.is_authenticated and request.user.is_staff:
        return {
            'total_users_count': User.objects.filter(role='user').count(),
            'total_counselors_count': User.objects.filter(role='counselor', is_verified=True).count(),
            'pending_approval_count': User.objects.filter(role='counselor', is_verified=False, is_active=True).count(),
            'total_feedback_count': CounselorFeedback.objects.count(),
        }
    return {}