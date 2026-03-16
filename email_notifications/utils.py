from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

def send_counselor_approval_email(counselor_email, counselor_name):
    """Send approval email to counselor"""
    subject = 'Your MindEase Counselor Account Has Been Approved'
    
    # Render HTML content
    html_content = render_to_string('email_notifications/counselor_approved.html', {
        'counselor_name': counselor_name,
    })
    
    # Create text version
    text_content = strip_tags(html_content)
    
    # Send email
    email = EmailMultiAlternatives(
        subject,
        text_content,
        settings.DEFAULT_FROM_EMAIL,
        [counselor_email]
    )
    email.attach_alternative(html_content, "text/html")
    
    try:
        email.send()
        return True
    except Exception as e:
        print(f"Error sending approval email: {e}")
        return False

def send_counselor_rejection_email(counselor_email, counselor_name):
    """Send rejection email to counselor"""
    subject = 'Regarding Your MindEase Counselor Application'
    
    # Render HTML content
    html_content = render_to_string('email_notifications/counselor_rejected.html', {
        'counselor_name': counselor_name,
    })
    
    # Create text version
    text_content = strip_tags(html_content)
    
    # Send email
    email = EmailMultiAlternatives(
        subject,
        text_content,
        settings.DEFAULT_FROM_EMAIL,
        [counselor_email]
    )
    email.attach_alternative(html_content, "text/html")
    
    try:
        email.send()
        return True
    except Exception as e:
        print(f"Error sending rejection email: {e}")
        return False