from django.contrib import admin
from .models import Conversation, Message, AIResponse, UserMood

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'user', 'started_at', 'last_message_at', 'is_active']
    list_filter = ['is_active', 'started_at', 'last_message_at']
    search_fields = ['session_id', 'user__email']
    date_hierarchy = 'started_at'
    readonly_fields = ['session_id', 'started_at', 'last_message_at']

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['conversation', 'sender', 'content_preview', 'timestamp', 'is_read']
    list_filter = ['sender', 'timestamp', 'is_read']
    search_fields = ['content', 'conversation__session_id']
    date_hierarchy = 'timestamp'
    readonly_fields = ['timestamp']
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'

@admin.register(AIResponse)
class AIResponseAdmin(admin.ModelAdmin):
    list_display = ['category', 'keywords_preview', 'priority', 'is_active', 'updated_at']
    list_filter = ['category', 'is_active', 'priority']
    search_fields = ['keywords', 'response']
    ordering = ['-priority', 'category']
    readonly_fields = ['created_at', 'updated_at']
    
    def keywords_preview(self, obj):
        return obj.keywords[:50] + '...' if len(obj.keywords) > 50 else obj.keywords
    keywords_preview.short_description = 'Keywords'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('category', 'keywords', 'priority', 'is_active')
        }),
        ('Response Content', {
            'fields': ('response',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(UserMood)
class UserMoodAdmin(admin.ModelAdmin):
    list_display = ['user', 'mood', 'detected_at', 'conversation']
    list_filter = ['mood', 'detected_at']
    search_fields = ['user__email', 'keywords_detected']
    date_hierarchy = 'detected_at'
    readonly_fields = ['detected_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user', 'conversation')