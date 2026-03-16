from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.timezone import localdate

User = get_user_model()

WEEKDAYS = [
    ("Monday", "Monday"),
    ("Tuesday", "Tuesday"),
    ("Wednesday", "Wednesday"),
    ("Thursday", "Thursday"),
    ("Friday", "Friday"),
    ("Saturday", "Saturday"),
    ("Sunday", "Sunday"),
]

class Appointment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('started', 'Started'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
     
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='appointments')
    counselor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='counselor_appointments')
    date = models.DateField()
    time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')  # e.g., Scheduled, Completed, Cancelled
    google_meet_link = models.URLField(blank=True, null=True)
    counselor_notes = models.TextField(blank=True, null=True)
    actual_duration = models.IntegerField(null=True, blank=True)
    user_joined_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.patient.full_name} with {self.counselor.full_name} on {self.date} at {self.time}"


class Availability(models.Model):
    counselor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='availabilities')
    weekday = models.CharField(max_length=10, choices=WEEKDAYS, blank=True)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_vacation = models.BooleanField(default=False)
    total_slots = models.IntegerField(default=1)   # <-- add this
    booked_slots = models.IntegerField(default=0)

    class Meta:
        unique_together = ('counselor', 'date', 'start_time', 'end_time')
        ordering = ['date', 'start_time']

    def save(self, *args, **kwargs):
        # auto-compute weekday from date
        self.weekday = self.date.strftime('%A')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.counselor.full_name} available on {self.date} from {self.start_time} to {self.end_time}"


class CounselorFeedback(models.Model):
    counselor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='received_feedbacks'
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='given_feedbacks'
    )
    appointment = models.OneToOneField(
        'Appointment', on_delete=models.CASCADE, related_name='feedback'
    )
    rating = models.IntegerField(null=True, blank=True)  # 1-5, optional
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        star = f"{self.rating} star" if self.rating else "no rating"
        return f"Feedback by user#{self.patient.id} for {self.counselor.full_name} ({star})"


class CounselorProfileView(models.Model):
    counselor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='profile_views'
    )
    viewer_hash = models.CharField(max_length=64)
    view_date = models.DateField(default=localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('counselor', 'viewer_hash', 'view_date')

    def __str__(self):
        return f"View for {self.counselor.full_name} on {self.view_date}"

class SystemFeedback(models.Model):
    name = models.CharField(max_length=100, blank=True, null=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        if self.name:
            return f"System Feedback from {self.name}"
        return "Anonymous System Feedback"