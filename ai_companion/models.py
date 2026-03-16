# ai_companion/models.py

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class Conversation(models.Model):
    """Stores conversation sessions between users and AI"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_conversations', null=True, blank=True)
    session_id = models.CharField(max_length=100, unique=True)  # For anonymous users
    started_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-last_message_at']

    def run_service(self):
        from MindEase.ai_companion.services_local_llm import some_utility_function # ✅ Move import here
        return some_utility_function(self.message)
    
    def __str__(self):
        return f"Conversation {self.session_id} - {self.started_at}"

class Message(models.Model):
    """Individual messages in a conversation"""
    SENDER_CHOICES = [
        ('user', 'User'),
        ('ai', 'AI Companion'),
    ]
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.sender}: {self.content[:50]}..."

class AIResponse(models.Model):
    """Predefined AI responses for common queries"""
    CATEGORY_CHOICES = [
        ('greeting', 'Greeting'),
        ('registration', 'Registration Help'),
        ('login', 'Login Help'),
        ('navigation', 'Navigation'),
        ('features', 'Feature Information'),
        ('support', 'Mental Health Support'),
        ('emergency', 'Emergency'),
        ('general', 'General'),
    ]
    
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    keywords = models.TextField(help_text="Comma-separated keywords to trigger this response")
    response = models.TextField()
    priority = models.IntegerField(default=0, help_text="Higher priority responses are checked first")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-priority', 'category']
    
    def __str__(self):
        return f"{self.category} - {self.keywords[:50]}..."
    
    def get_keywords_list(self):
        return [k.strip().lower() for k in self.keywords.split(',')]

class UserMood(models.Model):
    """Track user mood from conversations"""
    MOOD_CHOICES = [
        ('very_positive', 'Very Positive'),
        ('positive', 'Positive'),
        ('neutral', 'Neutral'),
        ('negative', 'Negative'),
        ('very_negative', 'Very Negative'),
        ('crisis', 'Crisis/Emergency'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mood_logs', null=True, blank=True)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='mood_logs')
    mood = models.CharField(max_length=20, choices=MOOD_CHOICES)
    detected_at = models.DateTimeField(auto_now_add=True)
    keywords_detected = models.TextField(blank=True, help_text="Keywords that triggered mood detection")
    
    class Meta:
        ordering = ['-detected_at']
    
    def __str__(self):
        return f"{self.user or 'Anonymous'} - {self.mood} - {self.detected_at}"