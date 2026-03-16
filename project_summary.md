# MindEase - Project Summary

MindEase is an integrated digital mental health platform developed specifically for young adults in Surigao City. Built on a **hybrid care model**, it seamlessly combines a non-clinical AI Companion (for initial symptom triage and psychoeducation) with secure Professional Teleconsultation Services.

To ensure genuine accessibility, the project employs a **dual-tier operational model**: it remains entirely cost-free for individual users to eliminate financial barriers, while designed for institutional licensing (e.g., educational organizations) to sustain server and AI hosting costs.

## 1. App Structure
- **`accounts`**: Manages the custom `User` model (via `AbstractBaseUser`), authentication (login/registration with email verification), and profile data. Handles the distinction between three main roles: User, Counselor, and Admin.
- **`core`**: The heart of the platform. Manages dashboards, counselor availability (including vacation mode), appointment booking with race-condition-safe locking, patient records, counselor feedback/ratings, profile view tracking, and live video sessions (via Agora RTC).
- **`ai_companion`**: Provides a 24/7 AI chatbot powered by **Groq's LLaMA 3.3 70B Versatile** model. Features include a 3-pass NLP pipeline (main response → semantic counselor-need evaluator → contextual transition generator), principle-based prompt engineering, dynamic injection of live counselor data, and a zero-token local regex intent router for instant UI guidance.
- **`admin_panel`**: A comprehensive custom `AdminSite` dashboard for administrators to verify counselors, manage users, track site-wide activities, manage wellness tips (full CRUD), view system and counselor feedback, and browse a Philippines news feed (NewsAPI / RSS / GNews fallback chain with 15-minute caching).
- **`email_notifications`**: Handles outbound HTML emails (counselor approval/rejection notifications, user email verification activation links) via Gmail SMTP.

## 2. User Flows
### User (Patient) Flow
1. **Onboarding**: Registers, receives a verification email with an activation link, and activates their account before first login.
2. **Dashboard**: Accesses the User Dashboard to view today's appointments, upcoming sessions, and admin-curated wellness tips.
3. **AI Support & Discovery**: Chats with the MindEase AI widget. If the user shares a problem, the AI's 3-pass pipeline evaluates severity, dynamically selects the best-matching verified counselor, generates a natural transition sentence, and renders a "Book Session" card directly in the chat.
4. **Manual Booking**: Can also browse the "Find a Counselor" page (lazy-loaded with pagination) to filter by name or specialization, view ratings/reviews/profile views, pick an available time slot via the SweetAlert2 slot picker, and book — with both client-side and server-side booking deadline enforcement.
5. **Session**: When the scheduled time arrives and the counselor starts the session, the user receives a real-time WebSocket notification and joins the Agora video call directly from the in-app session page — no external app or login required. During the session, both parties can exchange text messages and emoji reactions via an in-session WebSocket chat.
6. **Post-Session**: After the counselor ends the session, the user is prompted to submit feedback with an optional 1–5 star rating and a required text message.

### Counselor Flow
1. **Onboarding**: Registers and uploads professional credentials (license, degree, institution details, specializations, bio). Redirected to a "Registration Pending" page.
2. **Verification**: Waits for an Admin to verify their account. Receives an approval or rejection email notification.
3. **Availability**: Logs in and uses the "Manage Availability" page to set specific dates, time slots, and slot capacities. Can copy last week's schedule, clear the current week, or set vacation mode (date ranges that block bookings and display on counselor cards).
4. **Management**: Uses the Counselor Dashboard to view today's appointments, this week's schedule, weekly stats (patients, sessions, average rating), and recent feedback. Can generate a clipboard-ready weekly report.
5. **Session**: Clicks "Start Session" to create an Agora RTC channel (named `mindease{appointment_id}`), which sends a real-time WebSocket notification to the patient. Enters the in-app session page with access to the patient's past clinical notes and an in-session text/emoji chat. Ends the session by writing counselor notes; session duration is automatically computed from the patient's join timestamp.

### Admin Flow
1. **Dashboard Overview**: Logs into the custom Admin Panel to see high-level metrics (total users, counselors, pending counselors, admins) and paginated recent activities.
2. **Verification**: Reviews pending counselor applications, examines their uploaded credentials, and approves or rejects them — triggering an automatic email notification to the counselor.
3. **User & Counselor Management**: Views and manages user/counselor lists with the ability to add, edit, or deactivate accounts.
4. **Wellness Tips**: Creates, edits, and deletes wellness tips that appear on user dashboards.
5. **Feedback Monitoring**: Reviews both system feedback (anonymous support messages) and counselor feedback (user-submitted session reviews with ratings) via paginated tab views.
6. **Activity Tracking**: Monitors all platform activities (registrations, logins, email verifications, bookings, cancellations, first chatbot uses, feedback submissions) through a paginated recent activity feed.
7. **News Feed**: Browses a Philippines news feed aggregated from NewsAPI, RSS feeds (PhilStar, Rappler, CNN Philippines), and GNews — with automatic 15-minute caching.

## 3. Technical Highlights
- **Backend Stack**: Django (Python) running on **Daphne (ASGI)**. Utilizes Django Channels with a **Redis Channel Layer** for real-time WebSocket notifications (session started, appointment booked/cancelled, availability removed) across multiple parallel workers.
- **Database**: **MySQL** (`mindease_db`) with `utf8mb4` charset and strict transaction mode.
- **Concurrency & Data Integrity**: Implements robust database locking (`transaction.atomic` and `select_for_update()`) to eliminate race conditions, specifically during high-contention events like multi-user slot booking. Includes both client-side (JavaScript time-check) and server-side (slot end-time comparison) booking deadline enforcement.
- **Frontend Stack**: Vanilla HTML/CSS/JS. Uses `marked.js` for rendering Markdown from the AI, and `SweetAlert2` for interactive modals (like the chat-integrated slot picker with real-time slot capacity display).
- **AI Integration & 3-Pass NLP Pipeline**: Custom principle-based prompt engineering with the **Groq API** (**LLaMA 3.3 70B Versatile**). The system uses three sequential API calls per user message: **(1)** the main conversational response with dynamically injected live counselor data, **(2)** a secondary semantic triage evaluator (`temperature=0.0`, JSON response format) that determines if the user's distress level warrants human intervention and selects the single best-matching counselor, and **(3)** a transition sentence generator that naturally bridges the AI's response to the rendered counselor booking card.
- **Zero-Token NLP Intent Routing**: `widget.js` features a local regex intent engine that intercepts common navigational queries (e.g., "How do I book?") and Quick Action button clicks. It types out pre-written UI guides instantly and asynchronously saves the interaction to the database, completely bypassing the 70B LLM to conserve API tokens and reduce latency.
- **Dynamic Asynchronous Polling**: Implements a highly optimized 30-second frontend polling mechanism to check for newly opened counselor slots without requiring page reloads. Results are pushed to a sequential notification queue that generates persistent, reload-safe chat bubbles and universally updates all relevant UI counselor cards from "No available slots" to active "Book Session" buttons.
- **Persistent UX State**: Utilizes `localStorage` combined with database history regeneration to maintain critical UX states, such as unread notification badges (pulsing red dots) and last-recommended counselor data, across full page reloads — ensuring users never miss when a recommended counselor becomes available.
- **Video Calling**: Uses **Agora RTC** for secure, in-app video calls. Tokens are generated server-side using a custom HMAC-SHA256 `AccessToken` builder (`core/agora_token.py`) with publisher privileges (join channel, publish audio/video/data streams). Channels are named `mindease{appointment_id}` and tokens expire after 1 hour.
- **In-Session Communication**: Beyond video, each active session has a dedicated **WebSocket channel** (`SessionChatConsumer`) enabling real-time text messaging and emoji reactions between counselor and patient during the video call.
- **Email System**: Gmail SMTP (SSL, port 465) for transactional emails including user account activation links, counselor approval notifications, and counselor rejection notifications — all using HTML email templates.
- **Counselor Feedback & Analytics**: A complete review system where patients submit post-session feedback with optional 1–5 star ratings. Per-counselor analytics include aggregated average ratings, total review counts, daily-unique profile view tracking (SHA-256 hashed), and featured "best review" display on counselor cards.

## 4. Scope, Limitations & Methodology
- **Methodology**: Systematically developed using an iterative approach that synthesizes **Design Thinking** (for user-centeredness), **Lean Startup** (for MVP validation), and **Agile Scrum** (for adaptive development).
- **Platform Scope**: The system is exclusively a web-based application (no mobile app version) and currently supports English-language interactions.
- **Target Demographic**: Designed for young adults experiencing generalized stress, anxiety, and mild depression. It is strictly for non-severe cases, featuring a mandatory human-led referral protocol for complex or high-risk issues.
- **In-Session Clinical Context**: Features automated patient record retrieval, rendering past clinical notes directly on the counselor's screen during active video sessions.
- **System Feedback**: Users can submit anonymous support messages via the "Get Support" page, which are tracked and reviewed by administrators in the custom admin panel.
