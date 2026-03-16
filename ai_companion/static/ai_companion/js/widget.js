(function () {
    let chatOpen = false;
    let sessionId = localStorage.getItem('ai_session_id') || generateSessionId();
    let isTyping = false;
    let isFullscreen = false;
    let activePollingIntervals = [];  // Track slot-check polling intervals
    let notificationQueue = [];       // Queue to handle sequential notifications
    let isProcessingQueue = false;

    function generateSessionId() {
        const id = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('ai_session_id', id);
        return id;
    }


    // -------------------------
    // Clear Chat
    // -------------------------
    window.openClearChatModal = async function () {
        if (confirm("Are you sure you want to clear the conversation history?")) {
            try {
                const response = await fetch('/ai-companion/chat/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        clear_chat: true,
                        message: "CLEAR"
                    })
                });
                const data = await response.json();
                if (data.status === 'chat_cleared') {
                    const messagesContainer = document.getElementById('chatMessages');
                    messagesContainer.innerHTML = '';
                    localStorage.removeItem('ai_last_counselors_' + sessionId);
                    insertWelcomeMessage();
                }
            } catch (err) {
                console.error('Error clearing chat:', err);
                alert("Failed to clear chat.");
            }
        }
    };

    // -------------------------
    // Chat toggle & fullscreen
    // -------------------------
    window.toggleAIChat = function () {
        const container = document.getElementById('aiChatContainer');
        chatOpen = !chatOpen;
        container.classList.toggle('active', chatOpen);

        if (chatOpen) {
            const messagesContainer = document.getElementById('chatMessages');
            document.getElementById('chatInput').focus();
            loadChatHistory().then(insertWelcomeMessage);
            hideNotificationDot();
            if (isFullscreen) document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    };

    window.toggleFullscreen = function () {
        const container = document.getElementById('aiChatContainer');
        isFullscreen = !isFullscreen;
        container.classList.toggle('fullscreen', isFullscreen);
        document.querySelector('.fullscreen-btn').innerHTML = isFullscreen ? '↗' : '⛶';
        if (chatOpen) {
            document.body.style.overflow = isFullscreen ? 'hidden' : '';
        }
    };

    // -------------------------
    // Welcome message
    // -------------------------
    function insertWelcomeMessage() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer || messagesContainer.children.length > 0) return;

        const userName = window.AI_USER_NAME || 'there';
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = `
            <div class="ai-avatar"><i class="fas fa-brain"></i></div>
            <div class="message-content">
                <strong><i class="fas fa-hand-sparkles"></i> Hi ${userName}!</strong><br>
                Welcome to MindEase AI Companion. I'm here to help you navigate the platform, answer questions, and provide support 24/7. How can I assist you today?
            </div>
        `;
        messagesContainer.appendChild(welcomeDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // -------------------------
    // Load chat history
    // -------------------------
    async function loadChatHistory() {
        try {
            const res = await fetch(`/ai-companion/history/?session_id=${sessionId}`);
            const data = await res.json();
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.innerHTML = '';
            if (data.messages && data.messages.length > 0) {
                data.messages.forEach(msg => {
                    addMessage(msg.content, msg.sender, true, () => {
                        if (msg.counselors && msg.counselors.length > 0) {
                            renderCounselorCards(msg.counselors);
                        }
                    });
                });
            }
        } catch (err) {
            console.error('Error loading history:', err);
        }
    }

    // -------------------------
    // Send message
    // -------------------------
    window.sendMessage = async function () {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message || isTyping) return;

        input.value = '';
        addMessage(message, 'user');
        
        if (!handleQuickActionIntent(message)) {
            await getAIResponse(message);
        }
    };

    window.sendQuickMessage = async function (message) {
        if (isTyping) return;
        addMessage(message, 'user');
        
        if (!handleQuickActionIntent(message)) {
            await getAIResponse(message);
        }
    };
    
    // -------------------------
    // Intent Routing (Zero-token scripts)
    // -------------------------
    function handleQuickActionIntent(message) {
        // Lowercase for easier matching
        const msg = message.toLowerCase();
        
        const intents = [
            {
                // Matches: join session, join call, join video, how to join, etc.
                pattern: /(join.*(session|call|video|appointment|meeting))|(how.*to.*join)/i,
                response: "To join a session, a notification will appear in the middle of your screen that will show you when your counselor has joined. If there are issues and it hasn't automatically directed you to the video call, you can just go to your 'Dashboard' and find 'Today's Appointments' where it will show the name of the counselor you've booked and a 'Join Session' button."
            },
            {
                // Matches: book appointment, book session, schedule session, how to book, etc.
                pattern: /(book.*(appointment|session|counselor))|(schedule.*(appointment|session|counselor))|(how.*to.*(book|schedule))/i,
                response: "To book an appointment, go to your 'Dashboard' and find the 'Quick Settings' container just below 'My Upcoming Appointments'. There you will see 4 buttons: 'Chat With AI', 'Book Session', 'Past Sessions', and 'Get Support'. Click 'Book Session' to be directed to the counselor filter page. You will see lists of available counselors with their background, specializations, ratings, and best feedback. Click 'Book Session' on a counselor's profile, select your time slots, and you are booked!"
            },
            {
                // Matches: cancel booking, cancel session, cancel appointment, how to cancel, etc.
                pattern: /(cancel.*(booking|session|appointment|my))|(how.*to.*cancel)/i,
                response: "To cancel a session that you've booked, simply go to your 'Dashboard' and look at the 'Today's Appointments' container (if the session is today) or 'My Upcoming Appointments' container (if it is later). You will see your counselor there with a 'Cancel' button. Click cancel and a notification will appear asking you to confirm the cancellation."
            },
            {
                // Matches: past sessions, history, previous sessions, see my past, etc.
                pattern: /(past.*(sessions|appointments))|(previous.*(sessions|appointments))|(view.*history)|(see.*past)|(where.*can.*i.*see)/i,
                response: "To see past sessions with your counselors, go to your 'Dashboard' and look at the 'Quick Settings' container just below 'My Upcoming Appointments'. Click the 'Past Sessions' button there to be directed to a page where you can see the history of all sessions you've had with your counselors."
            },
            {
                // Matches: contact support, get support, talk to support, help with system, etc.
                pattern: /(contact.*support)|(get.*support)|(talk.*to.*support)|(system.*(issue|problem))/i,
                response: "To contact support, go to your 'Dashboard' and find the 'Quick Settings' container just below 'My Upcoming Appointments'. Click the 'Get Support' button and it will lead you to a page where you can send us a message about our system or any concerns at all. Note that your name is automatically filled in, but you can remove it since providing your name for feedback is optional."
            }
        ];
        
        // Find if any intent matches the user message
        for (const intent of intents) {
            if (intent.pattern.test(msg)) {
                triggerInstantResponse(message, intent.response);
                return true; // Match found
            }
        }
        
        return false; // No match found
    }
    
    function triggerInstantResponse(userText, aiResponse) {
        isTyping = true;
        showTypingIndicator();
        
        // Save to DB in background so history persists
        fetch('/ai-companion/chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                session_id: sessionId,
                action: 'save_qa',
                user_text: userText,
                ai_text: aiResponse
            })
        }).catch(err => console.error("Failed to save quick action:", err));

        // Type it out on screen
        setTimeout(() => {
            hideTypingIndicator();
            addMessage(aiResponse, 'ai', false, () => {
                isTyping = false;
            });
        }, 600); // Slight delay so it feels natural
    }



    // -------------------------
    // Fetch AI response with typing indicator
    // -------------------------
    async function getAIResponse(message) {
        showTypingIndicator();
        isTyping = true;

        try {
            const response = await fetch('/ai-companion/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ message, session_id: sessionId })
            });
            const data = await response.json();
            hideTypingIndicator();

            if (data.response) {
                // Render counselor cards AFTER typewriter animation finishes
                const pendingCounselors = (data.counselors && data.counselors.length > 0) ? data.counselors : null;
                addMessage(data.response, 'ai', false, () => {
                    if (pendingCounselors) {
                        renderCounselorCards(pendingCounselors);
                        localStorage.setItem('ai_last_counselors_' + sessionId, JSON.stringify(pendingCounselors));
                    }
                });
            } else {
                addMessage("Oops, I couldn't generate a response. Please try again.", 'ai');
            }
        } catch (err) {
            hideTypingIndicator();
            addMessage("Error connecting to AI. Please try again.", 'ai');
            console.error(err);
        } finally {
            isTyping = false;
        }
    }

    // -------------------------
    // Counselor suggestion cards
    // -------------------------
    function renderCounselorCards(counselors) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer || !counselors || counselors.length === 0) return;

        const cardsDiv = document.createElement('div');
        cardsDiv.className = 'counselor-suggestions';

        counselors.forEach(c => {
            const card = document.createElement('div');
            card.className = 'counselor-suggestion-card';
            card.dataset.counselorId = c.id;

            const initial = c.name ? c.name.charAt(0).toUpperCase() : '?';
            const specs = (c.specializations || []).map(s => {
                if (s === 'Other Mild Concerns' && c.other_specializations) {
                    const safeText = c.other_specializations.replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, " ");
                    return `<span class="spec-tag clickable-tag" onclick="window._openAIOtherConcernsModal('${safeText}')" title="Click to read full description">${s}</span>`;
                }
                return `<span class="spec-tag">${s}</span>`;
            }).join('');
            const safeName = c.name.replace(/'/g, "\\'");

            const hasSlots = c.has_slots !== false;  // default true for backward compat

            const buttonHTML = hasSlots
                ? `<button class="book-chat-btn" onclick="bookFromChat(${c.id}, '${safeName}')">
                       <i class="fa-solid fa-calendar-check"></i> Book Session
                   </button>`
                : `<div class="no-slots-placeholder" data-counselor-id="${c.id}" data-counselor-name="${safeName}">
                       <i class="fa-solid fa-clock"></i> No available slots yet
                   </div>`;

            card.innerHTML = `
                <div class="counselor-card-header">
                    <div class="counselor-avatar-circle">${initial}</div>
                    <div class="counselor-info">
                        <div class="counselor-name">${c.name}</div>
                        ${c.experience ? `<div class="counselor-exp"><i class="fa-solid fa-briefcase"></i> ${c.experience} yrs experience</div>` : ''}
                    </div>
                </div>
                ${specs ? `<div class="counselor-specs">${specs}</div>` : ''}
                ${buttonHTML}
            `;

            cardsDiv.appendChild(card);

            // Start polling if no slots
            if (!hasSlots) {
                startSlotPolling(c.id, safeName);
            }
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'message ai';
        wrapper.appendChild(cardsDiv);
        
        messagesContainer.appendChild(wrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // -------------------------
    // Book session from chat
    // -------------------------
    window.bookFromChat = async function (counselorId, counselorName) {
        try {
            // Fetch available slots
            const res = await fetch(`/core/api/availability/counselor/${counselorId}/`);
            const data = await res.json();

            if (!data.slots || data.slots.length === 0) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'No Available Slots',
                        text: `${counselorName} doesn't have any available slots right now. Please check back later.`,
                        icon: 'info',
                        confirmButtonColor: '#2b5876'
                    });
                } else {
                    alert(`${counselorName} doesn't have any available slots right now.`);
                }
                return;
            }

            // Build slot options for SweetAlert
            const slotOptions = data.slots.map(s => {
                const remaining = s.total_slots - s.booked_slots;
                const slotDate = new Date(s.date);
                const today = new Date();
                const diffDays = Math.ceil((slotDate - today) / (1000 * 60 * 60 * 24));
                
                let dateLabel = s.weekday;
                if (diffDays > 7) {
                    const options = { month: 'short', day: 'numeric', year: 'numeric' };
                    dateLabel = `${s.weekday}, ${slotDate.toLocaleDateString('en-US', options)}`;
                }

                return `<option value="${s.id}" data-date="${s.date}" data-end="${s.end_time}" ${remaining <= 0 ? 'disabled' : ''}>
                            ${dateLabel} ${s.start_time} - ${s.end_time} (${remaining} left)
                        </option>`;
            }).join('');

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: `Book with ${counselorName}`,
                    html: `<select id="swal-slot" class="swal2-input">${slotOptions}</select>`,
                    confirmButtonText: '<i class="fa-solid fa-calendar-check"></i> Book',
                    showCancelButton: true,
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#2b5876',
                    focusConfirm: false,
                    preConfirm: () => {
                        const sel = Swal.getPopup().querySelector('#swal-slot');
                        const slotId = sel.value;
                        if (!slotId) { Swal.showValidationMessage('Please select a slot'); return false; }

                        // Client-side deadline check
                        const opt = sel.options[sel.selectedIndex];
                        const slotDateStr = opt.dataset.date;   // "YYYY-MM-DD"
                        const slotEnd  = opt.dataset.end;       // "HH:MM AM/PM"
                        const now = new Date();
                        const todayStr = now.getFullYear() + '-'
                        + String(now.getMonth() + 1).padStart(2, '0') + '-'
                        + String(now.getDate()).padStart(2, '0');

                        if (slotDateStr === todayStr && slotEnd) {
                        // Parse "HH:MM AM/PM" into 24-hr minutes
                            const parts = slotEnd.match(/(\d+):(\d+)\s*(AM|PM)/i);
                            if (parts) {
                                let h = parseInt(parts[1], 10);
                                const m = parseInt(parts[2], 10);
                                const ampm = parts[3].toUpperCase();
                                if (ampm === 'PM' && h !== 12) h += 12;
                                if (ampm === 'AM' && h === 12) h = 0;
                                const endMins = h * 60 + m;
                                const nowMins = now.getHours() * 60 + now.getMinutes();
                                if (nowMins >= endMins) {
                                    Swal.showValidationMessage('This time slot is no longer available. The booking window has passed.');
                                    return false;
                                }
                            }
                        }

                        return { slot_id: slotId };
                    }
                }).then(async result => {
                    if (result.isConfirmed) {
                        // Book the session
                        const formData = new FormData();
                        formData.append('slot_id', result.value.slot_id);

                        const bookRes = await fetch(`/core/book/${counselorId}/`, {
                            method: 'POST',
                            headers: {
                                'X-CSRFToken': getCookie('csrftoken')
                            },
                            body: formData
                        });
                        const bookData = await bookRes.json();

                        if (bookData.success) {
                            Swal.fire('Booked!', 'Your session has been scheduled.', 'success').then(() => {
                                // If user is on the dashboard, dynamically update the appointments lists without a full refresh
                                if (window.location.pathname === '/core/user-dashboard/') {
                                    fetch('/core/user-dashboard/')
                                        .then(res => res.text())
                                        .then(html => {
                                            const doc = new DOMParser().parseFromString(html, 'text/html');
                                            const newCards = doc.querySelectorAll('.left-section .card');
                                            const oldCards = document.querySelectorAll('.left-section .card');
                                            if (oldCards.length >= 2 && newCards.length >= 2) {
                                                oldCards[0].innerHTML = newCards[0].innerHTML; // Today's Appointments
                                                oldCards[1].innerHTML = newCards[1].innerHTML; // Upcoming Appointments
                                            }
                                        })
                                        .catch(err => console.error('Failed to dynamically update dashboard DOM:', err));
                                }
                            });
                        } else {
                            Swal.fire({
                                title: 'Booking Failed',
                                text: bookData.error || 'Something went wrong. Please try again.',
                                icon: 'error',
                                confirmButtonColor: '#2b5876'
                            });
                        }
                    }
                });
            }
        } catch (err) {
            console.error('Booking error:', err);
            if (typeof Swal !== 'undefined') {
                Swal.fire('Error', 'Could not load available slots. Please try again.', 'error');
            } else {
                alert('Could not load available slots.');
            }
        }
    };

    // -------------------------
    // AI Modals
    // -------------------------
    window._openAIOtherConcernsModal = function (text) {
        let overlay = document.getElementById('aiOtherConcernsModalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'aiOtherConcernsModalOverlay';
            overlay.className = 'ai-modal-overlay';
            overlay.innerHTML = `
                <div class="ai-modal-box">
                    <div class="ai-modal-header">
                        <h3>Other Mild Concerns</h3>
                        <button class="ai-modal-close" onclick="document.getElementById('aiOtherConcernsModalOverlay').classList.remove('show')">&times;</button>
                    </div>
                    <div class="ai-modal-body">
                        <p id="aiOtherConcernsModalBody" style="color:var(--text-primary); line-height:1.6; word-wrap:break-word; overflow-wrap:break-word;"></p>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Close on click outside
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('show');
                }
            });
        }
        
        document.getElementById('aiOtherConcernsModalBody').textContent = text;
        
        // Use timeout to allow DOM parsing before adding the class for the CSS transition
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);
    };

    // -------------------------
    // Messages helper
    // -------------------------
    function addMessage(content, sender, isHistory = false, onComplete = null) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const welcomeMsg = messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg && sender === 'user') welcomeMsg.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        const formattedContent = formatMessage(content);

        // Check if this is a slot notification (loaded from DB history)
        const isNotification = sender === 'ai' && content.includes("has an available slot on") && content.includes("You can now book a session with them!");
        const bubbleClass = isNotification ? 'message-bubble slot-notification-bubble' : 'message-bubble';
        const iconHTML = isNotification ? '<i class="fa-solid fa-calendar-check" style="color: #2b5876; margin-right: 6px;"></i> ' : '';

        if (sender === 'ai' && !isHistory && !isNotification) {
            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = bubbleClass;
            messageDiv.appendChild(bubbleDiv);
            messagesContainer.appendChild(messageDiv);

            typeWriterHTML(bubbleDiv, iconHTML + formattedContent, timestamp, 15, onComplete);
        } else {
            messageDiv.innerHTML = `
                <div class="${bubbleClass}">
                    ${iconHTML}${formattedContent}
                    <div class="message-time">${timestamp}</div>
                </div>
            `;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            if (onComplete) onComplete();
        }
    }

    function typeWriterHTML(element, htmlContent, timestamp, speed, onComplete = null) {
        let i = 0;
        let isTag = false;
        let isEntity = false;
        let text = "";

        function type() {
            if (i < htmlContent.length) {
                let char = htmlContent.charAt(i);
                text += char;
                if (char === '<') isTag = true;
                if (char === '>') isTag = false;
                if (!isTag && char === '&') isEntity = true;
                if (isEntity && char === ';') isEntity = false;

                i++;
                if (isTag || isEntity) {
                    type();
                } else {
                    element.innerHTML = text;
                    const messagesContainer = document.getElementById('chatMessages');
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    setTimeout(type, speed);
                }
            } else {
                element.innerHTML = text + `<div class="message-time">${timestamp}</div>`;
                const messagesContainer = document.getElementById('chatMessages');
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                if (onComplete) onComplete();
            }
        }
        type();
    }

    function formatMessage(content) {
        if (typeof marked !== 'undefined') {
            // Configure marked to use breaks for newlines
            marked.setOptions({
                breaks: true,
                gfm: true
            });
            // marked.parse returns HTML string
            return marked.parse(content);
        } else {
            // Fallback if marked fails to load
            return content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/• /g, '<br>• ')
                .replace(/^\d+\.\s+/gm, '<br>$&')
                .replace(/\n/g, '<br>');
        }
    }

    // -------------------------
    // Typing indicator
    // -------------------------
    function showTypingIndicator() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `<div class="typing-indicator active"><span></span><span></span><span></span></div>`;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    // -------------------------
    // Utility functions
    // -------------------------
    function hideNotificationDot() {
        const dot = document.querySelector('.notification-dot');
        if (dot) dot.style.display = 'none';
        localStorage.removeItem('ai_has_unread');
    }

    function showNotificationDot() {
        const dot = document.querySelector('.notification-dot');
        if (dot) dot.style.display = 'block';
        localStorage.setItem('ai_has_unread', 'true');
    }

    // -------------------------
    // Slot Polling (for no-slots counselor cards)
    // -------------------------
    async function processNotificationQueue() {
        if (isProcessingQueue || notificationQueue.length === 0) return;
        isProcessingQueue = true;

        const { counselorId, counselorName, dateStr, timeStr } = notificationQueue.shift();

        // 1. Swap ALL placeholders → Book Session buttons for this counselor
        const placeholders = document.querySelectorAll(`.no-slots-placeholder[data-counselor-id="${counselorId}"]`);
        placeholders.forEach(placeholder => {
            const btn = document.createElement('button');
            btn.className = 'book-chat-btn';
            btn.onclick = () => bookFromChat(counselorId, counselorName);
            btn.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Book Session';
            btn.style.animation = 'fadeIn 0.3s ease';
            placeholder.replaceWith(btn);
        });

        // 2. Inject chat message formatting
        const rawText = `**${counselorName}** has an available slot on **${dateStr}** at **${timeStr}**. You can now book a session with them!`;
        const htmlContent = `
            <div class="message-bubble slot-notification-bubble">
                <i class="fa-solid fa-calendar-check" style="color: #2b5876; margin-right: 6px;"></i>
                <strong>${counselorName}</strong> has an available slot on <strong>${dateStr}</strong> at <strong>${timeStr}</strong>. You can now book a session with them!
            </div>
        `;

        // 3. Save to database for persistence
        try {
            await fetch('/ai-companion/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    action: 'save_notification',
                    notification_text: rawText
                })
            });
        } catch (err) {
            console.error('Failed to save notification:', err);
        }

        // 4. Show on UI with typing animation delay
        showTypingIndicator();
        
        setTimeout(() => {
            hideTypingIndicator();
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer) {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'message ai ephemeral-slot-msg';
                const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                msgDiv.innerHTML = htmlContent + `<div class="message-time">${timestamp}</div>`;
                messagesContainer.appendChild(msgDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }

            if (!chatOpen) showNotificationDot();

            // Process next in queue after a short delay
            setTimeout(() => {
                isProcessingQueue = false;
                processNotificationQueue();
            }, 1000);
            
        }, 1500); // 1.5s simulated typing time before showing message
    }

    function startSlotPolling(counselorId, counselorName) {
        // Don't start duplicate polling for same counselor
        if (activePollingIntervals.find(p => p.id === counselorId)) return;

        const intervalId = setInterval(async () => {
            try {
                const res = await fetch(`/core/api/availability/counselor/${counselorId}/`);
                const data = await res.json();

                if (data.slots && data.slots.length > 0) {
                    // Slot found! Stop polling
                    clearInterval(intervalId);
                    activePollingIntervals = activePollingIntervals.filter(p => p.id !== counselorId);

                    // Get first available slot info
                    const slot = data.slots[0];
                    const slotDate = new Date(slot.date);
                    const dateStr = slotDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
                    const timeStr = `${slot.start_time} - ${slot.end_time}`;

                    // Queue the notification to prevent simultaneous messages
                    notificationQueue.push({ counselorId, counselorName, dateStr, timeStr });
                    processNotificationQueue();
                }
            } catch (err) {
                console.error('Slot polling error:', err);
            }
        }, 30000);  // Poll every 30 seconds

        activePollingIntervals.push({ id: counselorId, interval: intervalId });
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            document.cookie.split(';').forEach(cookie => {
                cookie = cookie.trim();
                if (cookie.startsWith(name + '=')) {
                    cookieValue = decodeURIComponent(cookie.slice(name.length + 1));
                }
            });
        }
        return cookieValue;
    }

    // -------------------------
    // Handle Enter Key
    // -------------------------
    window.handleKeyPress = function (event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        insertWelcomeMessage();
        if (localStorage.getItem('ai_has_unread') === 'true') {
            showNotificationDot();
        }
    });
})();
