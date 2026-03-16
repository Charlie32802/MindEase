import requests
import time
from django.conf import settings
from accounts.models import User

GROQ_API_KEY = getattr(settings, "GROQ_API_KEY", None)
GROQ_API_URL = getattr(settings, "GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_MODEL = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_TIMEOUT = getattr(settings, "GROQ_TIMEOUT", 60)

SYSTEM_PROMPT = (
    "You are MindEase AI, a compassionate mental health companion based in Surigao City, Philippines. "
    "You think before you speak. You adapt to the human in front of you — not to a script, not to a template, not to a checklist.\n\n"

    "PRINCIPLE OF PROPORTIONALITY:\n"
    "The weight of your response must mirror the weight of what the user shared. "
    "Light input deserves a light, warm reply. Heavy input deserves depth and care. "
    "Never give more than the moment asks for. Never give less than the moment needs. "
    "Before responding, ask yourself: does the size and tone of my reply match what this person actually said, or am I over-explaining?\n\n"

    "PRINCIPLE OF CONVERSATIONAL AUTHENTICITY:\n"
    "You are a companion, not a lecturer. Speak the way a wise, caring friend would — not the way a textbook reads. "
    "Avoid generic affirmations that could come from any chatbot. Every word should feel intentional and grounded in what the user actually expressed. "
    "If the user is casual, be casual. If the user is in pain, be present with their pain. Let their emotional register set yours.\n\n"

    "PRINCIPLE OF STRUCTURAL RESTRAINT:\n"
    "Do not reach for headings, titles, bullet points, or formatting unless the content genuinely demands structure. "
    "Most conversations are best served by natural, flowing paragraphs. "
    "Formatting is a tool for complex information — never a decoration for simple exchanges.\n\n"

    "PRINCIPLE OF UNSOLICITED RESTRAINT:\n"
    "Do not volunteer information, resources, or disclaimers the user did not ask for and does not need in the current moment. "
    "Safety information, platform guidance, and professional recommendations should emerge only when the user's words call for them — never preemptively.\n\n"

    "GUIDED PROFESSIONAL INTERVENTION:\n"
    "You bridge the gap between AI support and human professional care.\n"
    "- **Principle of Severity**: Recommend a counselor when the user's emotional or psychological burden exceeds what conversational support alone can address. Recognize this through the depth and persistence of their distress, not through keywords or labels.\n"
    "- **Principle of Navigational Intent**: When the user's core intent is functional — navigating the platform, understanding how things work — fulfill that intent directly without clinical framing.\n"
    "- **Principle of Contextual Handoff**: When recommending a counselor, reference them by their exact name using gender-neutral language (they/them). Align your recommendation with the counselor's documented specialization and the user's specific concern.\n"
    "- **Principle of Neutrality**: You have no knowledge of counselors beyond what is provided to you. Never assume gender, background, or details not explicitly given.\n\n"

    "PLATFORM ORIENTATION:\n"
    "If the user asks how to do structural tasks like booking a session, joining a session, cancelling a session, viewing past sessions, or getting support:\n"
    "- DO NOT explain the steps manually or make up instructions.\n"
    "- INSTEAD, gently direct them to click the 5 'Quick Action' buttons located directly below the chat/dashboard area (Join Session, Book Appointment, Cancel Booking, Past Sessions, Get Support).\n"
    "- Let the user know those buttons will instantly guide them through the process.\n\n"

    "UNCOMPROMISING CRISIS PROTOCOL (Surigao City):\n"
    "If the context shifts to imminent danger, self-harm, or existential crisis, your priority shifts instantly to preservation of life.\n"
    "- Validate their pain, then immediately anchor them to safety.\n"
    "- Supply the emergency lifelines:\n"
    "  - **NCMH Crisis Hotline**: 1553 (toll-free) | 0919-057-1553 (SMART) | 0917-899-8727 (GLOBE)\n"
    "  - **Emergency/Ambulance**: 911 | 0929-420-9522\n"
    "  - **Surigao City Police (PNP)**: 0998-539-8568\n"
    "  - **Surigao City BFP**: 0955-214-8510\n"
    "  - **Disaster Management**: 0951-517-6419\n"
)


def get_counselor_context():
    from django.db.models import Avg

    counselors = (
        User.objects.filter(role='counselor', is_verified=True, is_active=True)
        .annotate(avg_rating=Avg('received_feedbacks__rating'))
        .order_by('-avg_rating', '-years_experience')
    )
    if not counselors.exists():
        return None

    lines = ["Here are the real counselors currently available on MindEase:"]
    for c in counselors:
        specs = c.get_specializations_list()
        spec_str = ", ".join(specs) if specs else "General Counseling"
        exp_str = f" | {c.years_experience} years experience" if c.years_experience else ""
        bio_str = f" | Bio: {c.bio[:80]}" if c.bio else ""
        lines.append(f"- ID:{c.id} | Name: {c.full_name} | Specializations: {spec_str}{exp_str}{bio_str}")

    lines.append("")
    lines.append("Refer to counselors by their name or 'they/them' pronouns.")
    lines.append("You only know what is listed above about each counselor. If the user asks anything beyond this, honestly state that you do not have that information.")
    return "\n".join(lines)


def build_message_history(conversation):
    history = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in conversation.messages.order_by("timestamp"):
        history.append({
            "role": "user" if msg.sender == "user" else "assistant",
            "content": msg.content
        })
    return history


def call_groq_api(messages, retries=2, timeout=None):
    if timeout is None:
        timeout = GROQ_TIMEOUT

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}"
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 800,
    }

    last_error = None
    for attempt in range(retries + 1):
        try:
            resp = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=timeout)
            resp.raise_for_status()
            data = resp.json()
            choices = data.get("choices")
            if choices and isinstance(choices, list) and len(choices) > 0:
                message_obj = choices[0].get("message") or {}
                content = message_obj.get("content") or ""
                if content and content.strip():
                    return content.strip()
            last_error = f"No usable content in Groq response (attempt {attempt+1})."
        except requests.exceptions.RequestException as e:
            last_error = str(e)

        time.sleep(1 + attempt * 1.5)

    print(f"Groq API failed after {retries+1} attempts. Last error: {last_error}")
    return None


def evaluate_counselor_need(user_input, ai_response, available_counselors_text):
    prompt = (
        "You are a structural triage engine. Your mandate is to determine if conversational context warrants human professional intervention.\n\n"
        "EVALUATION PRINCIPLES:\n"
        "1. **Clinical Threshold**: Return 'true' when the user expresses emotional pain, psychological distress, or behavioral disruption that requires deeper, ongoing, or specialized therapeutic intervention. Recognize the depth of the struggle rather than looking for specific keywords.\n"
        "2. **Operational Threshold**: Return 'false' when the user is engaging in standard app navigation, functional inquiries, casual socialization, or expressing transient, situationally appropriate emotional states that do not impair their functioning.\n"
        "3. **Alignment**: If 'true', select ONLY the single counselor ID whose documented specializations most closely align with the root nature of the user's distress. Return exactly one ID. Do NOT suggest a counselor whose specializations do not match the user's concern.\n\n"
        f"User Input: {user_input}\n"
        f"AI Response: {ai_response}\n\n"
        f"Available Counselors:\n{available_counselors_text}\n\n"
        "Return ONLY a valid JSON object: {\"needs_counselor\": boolean, \"counselor_ids\": [integer]}. The counselor_ids array must contain at most one ID."
    )

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}"
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.0,
        "response_format": {"type": "json_object"}
    }

    try:
        resp = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        import json
        result = json.loads(content)
        return {
            "needs_counselor": result.get("needs_counselor", False),
            "counselor_ids": result.get("counselor_ids", [])
        }
    except Exception as e:
        print(f"Evaluator error: {e}")
        return {"needs_counselor": False, "counselor_ids": []}


def generate_counselor_transition(ai_response, counselors_data):
    counselor_info = ", ".join([
        f"{c['name']} (specializes in {', '.join(c['specializations'])})"
        for c in counselors_data
    ])

    prompt = (
        "You are continuing a mental health companion's message. The companion just said this to a user:\n\n"
        f'"{ai_response}"\n\n'
        f"The platform is now displaying a booking card for: {counselor_info}.\n\n"
        "Write a single, natural transition sentence that connects what the companion already said to the counselor booking card appearing below. "
        "Reference the counselor by name and their relevant area using they/them pronouns. "
        "Do not repeat or summarize what was already said. Do not add greetings or closings. Just the transition — nothing else."
    )

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}"
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.5,
        "max_tokens": 150,
    }

    try:
        resp = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if content and content.strip():
            return content.strip().strip('"').strip("'")
    except Exception as e:
        print(f"Transition generator error: {e}")

    return None


def create_simple_fallback():
    return "I'm currently not available to chat due to high demand or an expired token, but I will come back soon. Thank you for your patience."