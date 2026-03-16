# ai_companion/views.py
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db import transaction, IntegrityError
import json
import re

from .models import Conversation, Message
from .services import build_message_history, call_groq_api, create_simple_fallback, get_counselor_context, evaluate_counselor_need, generate_counselor_transition
from admin_panel.models import RecentActivity
from accounts.models import User


def get_counselor_suggestions(user_input, ai_response, counselor_ctx):
    """
    Uses a secondary NLP evaluator to determine if human intervention is strictly required.
    Returns only 1 counselor (highest rated match). Includes has_slots availability info.
    Returns (cleaned_response, list_of_counselor_dicts).
    """
    from django.db.models import Avg
    from django.utils.timezone import localdate
    from core.models import Availability

    counselors_data = []
    
    cleaned_response = re.sub(r'\n*\[SUGGEST_COUNSELORS:.*?\]\n*', '', ai_response).strip()

    eval_result = evaluate_counselor_need(user_input, cleaned_response, counselor_ctx)
    
    if eval_result.get("needs_counselor"):
        counselor_ids = eval_result.get("counselor_ids", [])
        
        # Fallback: if evaluator said yes but returned no IDs, pick top-rated counselor
        if not counselor_ids:
            top_counselor = (
                User.objects.filter(role='counselor', is_verified=True, is_active=True)
                .annotate(avg_rating=Avg('received_feedbacks__rating'))
                .order_by('-avg_rating', '-years_experience')
                .first()
            )
            if top_counselor:
                counselor_ids = [top_counselor.id]

        # Get only the first (best) match
        for counselor in (
            User.objects.filter(id__in=counselor_ids, role='counselor', is_verified=True, is_active=True)
            .annotate(avg_rating=Avg('received_feedbacks__rating'))
            .order_by('-avg_rating', '-years_experience')[:1]
        ):
            # Check if this counselor has any future availability slots
            has_slots = Availability.objects.filter(
                counselor=counselor,
                date__gte=localdate(),
                is_vacation=False
            ).exists()

            counselors_data.append({
                'id': counselor.id,
                'name': counselor.full_name,
                'specializations': counselor.get_specializations_list(),
                'experience': counselor.years_experience or 0,
                'other_specializations': getattr(counselor, 'other_specializations', ''),
                'has_slots': has_slots,
            })

    return cleaned_response, counselors_data


@login_required
def ai_companion(request):
    # Render chat UI on GET
    if request.method != "POST":
        return render(request, "ai_companion/chat.html")

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    session_id = data.get("session_id")
    user_input = data.get("message")
    clear_chat = data.get("clear_chat", False)

    if not session_id:
        return JsonResponse({"error": "Missing session_id"}, status=400)

    # Ensure conversation exists
    conversation, _ = Conversation.objects.get_or_create(
        session_id=session_id,
        defaults={"user": request.user, "is_active": True}
    )
    conversation.user = request.user
    conversation.is_active = True
    conversation.save()

    # CLEAR CHAT FIRST
    if clear_chat:
        conversation.messages.all().delete()
        return JsonResponse({"status": "chat_cleared"})

    # Handle saving slot notifications (from frontend polling)
    if data.get("action") == "save_notification":
        notification_text = data.get("notification_text")
        if notification_text:
            Message.objects.create(conversation=conversation, sender="ai", content=notification_text)
            return JsonResponse({"status": "saved"})
        return JsonResponse({"error": "No text provided"}, status=400)
        
    # Handle saving instantaneous quick actions (bypasses LLM)
    if data.get("action") == "save_qa":
        user_text = data.get("user_text")
        ai_text = data.get("ai_text")
        if user_text and ai_text:
            Message.objects.create(conversation=conversation, sender="user", content=user_text)
            Message.objects.create(conversation=conversation, sender="ai", content=ai_text)
            return JsonResponse({"status": "saved"})
        return JsonResponse({"error": "Missing QA text"}, status=400)

    # Make sure user_input exists
    if not user_input:
        return JsonResponse({"error": "Missing message"}, status=400)

    # Track first chatbot use (only first time ever)
    total_user_messages = Message.objects.filter(
        conversation__user=request.user, sender='user'
    ).count()
    if total_user_messages == 0:
        try:
            RecentActivity.objects.create(
                activity_type='first_chatbot_use',
                user=request.user,
                description=f'{request.user.full_name} used MindEase AI for the first time'
            )
        except Exception:
            pass

    # Save user message
    Message.objects.create(conversation=conversation, sender="user", content=user_input)

    # Build history
    history = build_message_history(conversation)

    # Inject live counselor context so the AI knows about real counselors
    counselor_ctx = get_counselor_context()
    if counselor_ctx:
        history.insert(1, {"role": "system", "content": counselor_ctx})

    # Call AI API
    ai_response = call_groq_api(history)

    # Fallback
    if not ai_response or len(ai_response.strip()) < 10:
        ai_response = create_simple_fallback()

    # Get counselors dynamically using NLP evaluation
    cleaned_response, counselors_data = get_counselor_suggestions(user_input, ai_response, counselor_ctx)

    # If counselor card will be shown, generate a natural transition sentence
    if counselors_data:
        transition = generate_counselor_transition(cleaned_response, counselors_data)
        if transition:
            cleaned_response = cleaned_response.rstrip() + "\n\n" + transition

    # Save AI response (cleaned version without the tag)
    ai_content_to_save = cleaned_response
    if counselors_data:
        counselors_json = json.dumps(counselors_data)
        ai_content_to_save += f"\n<!-- COUNSELORS_DATA: {counselors_json} -->"

    Message.objects.create(conversation=conversation, sender="ai", content=ai_content_to_save)

    return JsonResponse({
        "response": cleaned_response,
        "counselors": counselors_data
    })


@login_required(login_url="/accounts/form/?action=login")
def chat_history(request):
    from django.utils.timezone import localdate
    from core.models import Availability
    
    session_id = request.GET.get('session_id')
    conversation = Conversation.objects.filter(session_id=session_id).first()
    if conversation:
        messages_out = []
        messages = conversation.messages.order_by('timestamp')
        for msg in messages:
            content = msg.content
            counselors = []
            import re
            match = re.search(r'<!-- COUNSELORS_DATA:\s*(\[.*?\])\s*-->', content)
            if match:
                try:
                    counselors = json.loads(match.group(1))
                    content = content[:match.start()].strip()
                    
                    # Real-time check for historical cards so we don't restart poller unnecessarily
                    for c in counselors:
                        has_slots = Availability.objects.filter(
                            counselor_id=c['id'],
                            date__gte=localdate(),
                            is_vacation=False
                        ).exists()
                        c['has_slots'] = has_slots
                except Exception:
                    pass
            messages_out.append({
                'sender': msg.sender,
                'content': content,
                'counselors': counselors
            })
        return JsonResponse({'messages': messages_out})
    return JsonResponse({'messages': []})
