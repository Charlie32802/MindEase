// MindEase Dashboard JS
// Handles animations and interactions for the counselor dashboard

// Function: Animates progress bars on page load
// Listens for DOM content to be fully loaded before running
document.addEventListener("DOMContentLoaded", () => {
  // Check if user prefers reduced motion (for accessibility)
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
  // Select all progress bar fill elements
  const bars = document.querySelectorAll(".progress-fill");
  
  // Loop through each progress bar and animate it
  bars.forEach((bar, index) => {
    // Get the target progress value from the data attribute
    const target = parseFloat(bar.getAttribute("data-progress"));
    
    // Validate: Ensure target is a number between 0 and 100
    if (isNaN(target) || target < 0 || target > 100) {
      console.warn("Invalid data-progress value:", target, "for element:", bar);
      return; // Skip invalid bars
    }
    
    // Set initial width to 0% for animation start
    bar.style.width = "0%";
    
    // Skip animation if user prefers reduced motion
    if (prefersReducedMotion) {
      bar.style.width = target + "%"; // Set directly without animation
      return;
    }
    
    // Animate to target width after a slight delay (staggered for visual effect)
    setTimeout(() => {
      // Add a CSS class to trigger smooth transition (requires CSS: .progress-fill { transition: width 1s ease; })
      bar.classList.add("animate");
      bar.style.width = target + "%";
    }, 200 + (index * 100)); // Stagger by 100ms per bar
  });
});

// Global function to add a new appointment card dynamically
window.addAppointmentCard = function(data) {
  const localDate = new Date();
  const localDateString = localDate.getFullYear() + '-' + String(localDate.getMonth() + 1).padStart(2, '0') + '-' + String(localDate.getDate()).padStart(2, '0');
  const isToday = (data.date === localDateString);
  
  // Calculate current week end (Sunday)
  const dayOfWeek = localDate.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(localDate);
  sunday.setDate(localDate.getDate() + daysUntilSunday);
  const weekEndStr = sunday.getFullYear() + '-' + String(sunday.getMonth() + 1).padStart(2, '0') + '-' + String(sunday.getDate()).padStart(2, '0');
  
  const isThisWeek = (data.date <= weekEndStr);

  const containerId = isToday ? 'today-appointments-list' : 'upcoming-appointments-list';
  const container = document.getElementById(containerId);
  const noMsgId = isToday ? 'no-today-msg' : 'no-upcoming-msg';
  const noMsg = document.getElementById(noMsgId);

  if (noMsg) {
    noMsg.remove();
  }

  // Build the card HTML
  const avatarLetter = data.patient_name ? data.patient_name.charAt(0).toUpperCase() : '?';
  const formattedDate = new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeDisplay = isToday ? data.time + ' – Counseling' : formattedDate + ' – ' + data.time;
  const prefix = isToday ? 'today' : 'upcoming';

  let sessionHtml = `
    <div class="session" id="counselor-session-${prefix}-${data.appointment_id}" style="animation: fadeUp 0.3s ease forwards;">
      <div class="avatar">${avatarLetter}</div>
      <div class="details">
        <p class="name">${data.patient_name}</p>
        <p class="info">${timeDisplay}</p>
      </div>`;

  if (isToday) {
    sessionHtml += `
      <span class="status upcoming">Pending</span>
      <button class="join-btn" onclick="startSession('${data.appointment_id}')">Start Session</button>
    </div>`;
  } else {
    sessionHtml += `
      <span class="tag">Counseling</span>
    </div>`;
  }

  if (container) {
    container.insertAdjacentHTML('beforeend', sessionHtml);
  }

  // Handle This Week's Schedule container
  if (isThisWeek) {
    const weekContainer = document.getElementById('this-week-schedule-list');
    const noWeekMsg = document.getElementById('no-week-msg');
    
    if (noWeekMsg) {
      noWeekMsg.remove();
    }

    let weekHtml = `
      <div class="session" id="counselor-session-week-${data.appointment_id}" style="animation: fadeUp 0.3s ease forwards;">
        <div class="avatar">${avatarLetter}</div>
        <div class="details">
          <p class="name">${data.patient_name}</p>
          <p class="info">${formattedDate} – ${data.time}</p>
        </div>
        <span class="tag">Pending</span>
      </div>`;
      
    if (weekContainer) {
      weekContainer.insertAdjacentHTML('beforeend', weekHtml);
    }
  }
};

window.removeAppointmentCard = function(appointmentId) {
  const prefixes = ['today', 'upcoming', 'week'];
  prefixes.forEach(prefix => {
    const card = document.getElementById(`counselor-session-${prefix}-${appointmentId}`);
    if (card) {
      const parentContainer = card.parentElement;
      card.remove();

      // Check if container is empty to display no message
      if (parentContainer && parentContainer.querySelectorAll('.session').length === 0) {
        if (parentContainer.id === 'today-appointments-list') {
          parentContainer.innerHTML = '<p id="no-today-msg">No appointments today.</p>';
        } else if (parentContainer.id === 'upcoming-appointments-list') {
          parentContainer.innerHTML = '<p id="no-upcoming-msg">No upcoming appointments.</p>';
        } else if (parentContainer.id === 'this-week-schedule-list') {
          parentContainer.innerHTML = '<p id="no-week-msg">No schedule this week.</p>';
        }
      }
    }
  });
};

