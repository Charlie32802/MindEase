// Define URLs using Django template syntax
const loginUrl = "{% url 'form' %}?action=login";
const registerUrl = "{% url 'form' %}?action=register";

// Navigation functions
function goToLogin(button) {
    window.location.href = button.dataset.url;
}

function goToRegister(button) {
    window.location.href = button.dataset.url;
}

// Modal functionality
const modalData = {
    ai: {
        icon: '<i class="fa-solid fa-robot"></i>',
        title: "Dynamic AI Companion",
        description: "Your personalized mental health assistant powered by Groq's LLaMA 3.3 70B Versatile model. Uses a 3-pass NLP pipeline — conversational response, semantic counselor-need evaluation, and contextual transition generation — all built on principle-based empathetic architecture.",
        features: [
            "3-pass AI pipeline: main response → severity evaluator → counselor transition generator",
            "Zero-token regex intent router for instant navigation guidance without API calls",
            "Dynamic injection of live counselor data for real-time, personalized recommendations",
            "Automated crisis detection with Surigao City emergency hotline dispatch"
        ]
    },
    counselor: {
        icon: '<i class="fa-solid fa-user-doctor"></i>',
        title: "Verified Counselors",
        description: "We employ a strict, admin-led verification protocol. You will only connect with legitimate mental health professionals who have passed our credential scrutiny.",
        features: [
            "100% Admin-verified professional credentials and licenses",
            "Secure, in-app video consultations powered by Agora RTC with server-generated tokens",
            "In-session WebSocket chat with text messaging and emoji reactions",
            "Automated patient history rendered on the counselor's screen during live sessions"
        ]
    },
    scheduel: {
        icon: '<i class="fa-solid fa-calendar-check"></i>',
        title: "Automated Scheduling",
        description: "A seamless, race-condition-safe booking system with dual-layer deadline enforcement designed to ensure you never miss an opportunity to connect with a recommended professional.",
        features: [
            "Real-time, asynchronous 30-second slot availability polling with sequential notification queue",
            "Client-side and server-side booking deadline enforcement to prevent expired-slot bookings",
            "Frictionless 'Book Session' buttons embedded directly inside the AI chat via SweetAlert2",
            "Counselor vacation mode that blocks bookings and displays on counselor cards"
        ]
    },
    tips: {
        icon: '<i class="fa-solid fa-leaf"></i>',
        title: "Wellness Tips",
        description: "Immediate access to wellness strategies curated by administrators through the custom admin panel, delivered right to your dashboard to proactively improve your lifestyle.",
        features: [
            "Admin-managed wellness tips with full CRUD via the custom admin panel",
            "Actionable advice for daily living, stress management, and anxiety relief",
            "Curated specifically for young adults navigating mental health challenges"
        ]
    }
};

function openModal(type) {
    const modal = document.getElementById('featureModal');
    const data = modalData[type];

    document.getElementById('modalIcon').innerHTML = data.icon;
    document.getElementById('modalTitle').textContent = data.title;
    document.getElementById('modalDescription').textContent = data.description;

    const featuresList = document.getElementById('modalFeatures');
    featuresList.innerHTML = '';
    data.features.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        featuresList.appendChild(li);
    });

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('featureModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Enhanced interactivity
document.addEventListener('DOMContentLoaded', function () {
    // Navbar scroll effect
    let lastScroll = 0;
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > lastScroll && currentScroll > 100) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }

        if (currentScroll > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.15)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.1)';
        }

        lastScroll = currentScroll;
    });

    // Parallax effect for floating shapes
    window.addEventListener('mousemove', (e) => {
        const shapes = document.querySelectorAll('.floating-shape');
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;

        shapes.forEach((shape, index) => {
            const speed = (index + 1) * 0.5;
            shape.style.transform += ` translate(${x * speed * 0.01}px, ${y * speed * 0.01}px)`;
        });
    });

    // Button click animations
    document.querySelectorAll('.cta-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                        position: absolute;
                        width: ${size}px;
                        height: ${size}px;
                        left: ${x}px;
                        top: ${y}px;
                        background: rgba(255, 255, 255, 0.3);
                        border-radius: 50%;
                        transform: scale(0);
                        animation: ripple 0.6s ease-out;
                        pointer-events: none;
                    `;

            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Add ripple animation
    const style = document.createElement('style');
    style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
    document.head.appendChild(style);
});