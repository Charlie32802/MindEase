document.querySelectorAll('.join-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        alert('Redirecting to your session...');
    });
});

document.querySelector('.schedule-btn')?.addEventListener('click', () => {
    alert('Redirecting to schedule a new session...');
});


