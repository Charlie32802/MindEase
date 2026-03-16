from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class RecentActivity(models.Model):
    ACTIVITY_TYPES = (
        ('counselor_approved', 'Counselor Approved'),
        ('counselor_rejected', 'Counselor Rejected'),
        ('user_added', 'User Added'),
        ('counselor_added', 'Counselor Added'),
        ('admin_added', 'Admin Added'),
        ('user_registered', 'User Registered'),
        ('user_login', 'User Login'),
        ('email_verified', 'Email Verified'),
        ('appointment_booked', 'Appointment Booked'),
        ('appointment_cancelled', 'Appointment Cancelled'),
        ('first_chatbot_use', 'First Chatbot Use'),
        ('feedback_sent', 'Feedback Sent'),
    )
    
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    admin_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_activities', null=True, blank=True)
    description = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Recent Activity'
        verbose_name_plural = 'Recent Activities'
    
    def __str__(self):
        return f"{self.get_activity_type_display()} - {self.user.full_name}"
    
    def get_icon_and_color(self):
        """Returns FontAwesome icon HTML and color for the activity type"""
        icons = {
            'counselor_approved': ('<i class="fas fa-check-circle"></i>', 'rgba(72, 187, 120, 0.2)', '#48bb78'),
            'counselor_rejected': ('<i class="fas fa-times-circle"></i>', 'rgba(245, 101, 101, 0.2)', '#f56565'),
            'user_added': ('<i class="fas fa-user-plus"></i>', 'rgba(102, 126, 234, 0.2)', '#667eea'),
            'counselor_added': ('<i class="fas fa-user-md"></i>', 'rgba(139, 195, 74, 0.2)', '#8bc34a'),
            'admin_added': ('<i class="fas fa-user-shield"></i>', 'rgba(156, 39, 176, 0.2)', '#9c27b0'),
            'user_registered': ('<i class="fas fa-user-plus"></i>', 'rgba(102, 126, 234, 0.2)', '#667eea'),
            'user_login': ('<i class="fas fa-sign-in-alt"></i>', 'rgba(56, 178, 172, 0.2)', '#38b2ac'),
            'email_verified': ('<i class="fas fa-envelope-open-text"></i>', 'rgba(72, 187, 120, 0.2)', '#48bb78'),
            'appointment_booked': ('<i class="fas fa-calendar-check"></i>', 'rgba(66, 153, 225, 0.2)', '#4299e1'),
            'appointment_cancelled': ('<i class="fas fa-calendar-times"></i>', 'rgba(237, 137, 54, 0.2)', '#ed8936'),
            'first_chatbot_use': ('<i class="fas fa-robot"></i>', 'rgba(159, 122, 234, 0.2)', '#9f7aea'),
            'feedback_sent': ('<i class="fas fa-comment-dots"></i>', 'rgba(236, 201, 75, 0.2)', '#ecc94b'),
        }
        return icons.get(self.activity_type, ('<i class="fas fa-clipboard-list"></i>', 'rgba(102, 126, 234, 0.2)', '#667eea'))
    
    def time_since(self):
        """Returns human readable time since the activity"""
        now = timezone.now()
        diff = now - self.created_at
        
        if diff.days > 0:
            if diff.days == 1:
                return "Yesterday"
            else:
                return f"{diff.days} days ago"
        elif diff.seconds > 3600:  # More than 1 hour
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:  # More than 1 minute
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"
        

class WellnessTip(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title