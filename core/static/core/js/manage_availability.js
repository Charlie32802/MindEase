// ================================
// Manage Availability JS (FULL)
// ================================

// CSRF token
const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

// -------------------------------
// Fetch current slots from backend
// -------------------------------
async function fetchSlots() {
  const res = await fetch("/core/api/availability/");
  if (!res.ok) throw new Error("Network error");
  const data = await res.json();
  return data.slots;
}

// -------------------------------
// Render slots on the left panel
// -------------------------------
function renderSlots(slots) {
  const slotList = document.getElementById("timeSlotList");
  slotList.innerHTML = "";

  if (!slots || slots.length === 0) {
    slotList.innerHTML = `<p id="slotFallback">No slots available</p>`;
    return;
  }

  slots.forEach(slot => {
    const div = document.createElement("div");
    div.className = "time-slot";
    div.setAttribute("aria-label", `Slot ${slot.date}: ${slot.start_time} - ${slot.end_time}`);

    const leftDiv = document.createElement("div");
    leftDiv.className = "slot-left";
    leftDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <i class="fa-solid fa-calendar-day" style="color:var(--accent); width:16px; text-align:center;"></i>
        <strong>${slot.date}</strong>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <i class="fa-solid fa-clock" style="color:var(--teal); width:16px; text-align:center;"></i>
        <span>${slot.start_time} - ${slot.end_time}</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <i class="fa-solid fa-user-group" style="color:var(--amber); width:16px; text-align:center;"></i>
        <span>Slots: ${slot.booked_slots}/${slot.total_slots}</span>
      </div>
    `;

    const rightDiv = document.createElement("div");
    rightDiv.className = "slot-right";

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => deleteSlot(slot.id));

    rightDiv.appendChild(removeBtn);
    div.appendChild(leftDiv);
    div.appendChild(rightDiv);
    slotList.appendChild(div);
  });
}

// -------------------------------
// Delete Slot
// -------------------------------
async function deleteSlot(slotId) {
  const confirmResult = await Swal.fire({
    title: "Remove Slot?",
    icon: "warning",
    text: "Are you sure you want to delete this slot?",
    showCancelButton: true,
    confirmButtonText: "Remove"
  });

  if (!confirmResult.isConfirmed) return;

  try {
    const res = await fetch(`/core/api/availability/${slotId}/delete/`, {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken }
    });
    const data = await res.json();

    if (data.success) {
      Swal.fire("Removed!", "Slot deleted.", "success");
      refreshSlots();
    } else {
      Swal.fire("Error", data.message || "Could not remove slot.", "error");
    }
  } catch (err) {
    Swal.fire("Error", "Network error.", "error");
  }
}

// -------------------------------
// Generate time options
// -------------------------------
function generateTimeOptions() {
  const times = [];
  for (let hour = 8; hour <= 20; hour++) {
    ["00", "30"].forEach(min => {
      const ampm = hour < 12 ? "AM" : "PM";
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      times.push(`<option>${h12}:${min} ${ampm}</option>`);
    });
  }
  return times.join("");
}

// -------------------------------
// Add Slot (SweetAlert)
// -------------------------------
async function addSlot() {
  const { value: formValues } = await Swal.fire({
    title: "Add Availability",
    width: 420,
    html: `
      <div style="text-align:left; width:90%; margin:auto; display:flex; flex-direction:column; gap:10px;">
        
        <label>Date</label>
        <input type="date" id="swal-date" class="swal2-input">

        <label>Start Time</label>
        <select id="swal-start-time" class="swal2-input">
          ${generateTimeOptions()}
        </select>

        <label>End Time</label>
        <select id="swal-end-time" class="swal2-input">
          ${generateTimeOptions()}
        </select>

        <label>Total Slots</label>
        <input type="number" id="swal-total-slots" class="swal2-input" min="1" value="1">
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Add Slot",
    preConfirm: () => ({
      date: document.getElementById("swal-date").value,
      start_time: document.getElementById("swal-start-time").value,
      end_time: document.getElementById("swal-end-time").value,
      total_slots: document.getElementById("swal-total-slots").value
    })
  });

  if (!formValues) return;

  try {
    const res = await fetch("/core/api/availability/add/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken
      },
      body: JSON.stringify(formValues)
    });

    const data = await res.json();

    if (data.success) {
      Swal.fire("Success", "Availability added.", "success");
      refreshSlots();
    } else {
      Swal.fire("Error", data.message || "Could not add slot.", "error");
    }
  } catch (err) {
    Swal.fire("Error", "Network error.", "error");
  }
}

// -------------------------------
// Weekly Summary (updated)
// -------------------------------
function updateWeeklySummary(slots) {
  const weekdays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const summaryList = document.getElementById("weeklySummary");
  if (!summaryList) return;
  summaryList.innerHTML = "";

  weekdays.forEach(day => {
    // Sum total_slots for this weekday
    const daySlots = slots.filter(s => s.weekday === day);
    const totalSlots = daySlots.reduce((sum, slot) => sum + (slot.total_slots || 0), 0);

    const li = document.createElement("li");
    li.innerHTML = `${day} <span>${totalSlots} slot${totalSlots !== 1 ? "s" : ""}</span>`;
    summaryList.appendChild(li);
  });
}

// -------------------------------
// Vacations
// -------------------------------
async function fetchVacations() {
  try {
    const res = await fetch("/core/api/availability/vacations/");
    if (!res.ok) return [];
    const data = await res.json();
    return data.vacations || [];
  } catch (e) { return []; }
}

function renderVacations(vacations) {
  const vList = document.getElementById("vacationList");
  if (!vList) return;
  vList.innerHTML = "";
  if (!vacations || vacations.length === 0) {
    vList.innerHTML = '<p id="vacationFallback" style="font-size:13px;color:var(--text-muted);font-style:italic;">No vacations set.</p>';
    return;
  }
  vacations.forEach(v => {
    const div = document.createElement("div");
    div.className = "vacation-entry";
    div.innerHTML = `
      <div class="vacation-info">
        <i class="fa-solid fa-umbrella-beach"></i>
        <span><strong>${v.date}</strong> (${v.weekday})</span>
      </div>
      <button class="remove-btn" onclick="deleteVacation('${v.id}')">Remove</button>
    `;
    vList.appendChild(div);
  });
}

window.deleteVacation = async function(id) {
  const confirmResult = await Swal.fire({
    title: "Remove Vacation?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Remove"
  });
  if (!confirmResult.isConfirmed) return;
  try {
    const res = await fetch(`/core/api/availability/vacation/${id}/delete/`, {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken }
    });
    const data = await res.json();
    if (data.success) {
      Swal.fire("Removed!", "Vacation deleted.", "success");
      refreshSlots();
    } else {
      Swal.fire("Error", data.message || "Error", "error");
    }
  } catch(e) { console.error(e); }
}

// -------------------------------
// Refresh all data
// -------------------------------
async function refreshSlots() {
  const slots = await fetchSlots();
  renderSlots(slots);
  updateWeeklySummary(slots);
  
  const vacations = await fetchVacations();
  renderVacations(vacations);
}

// -------------------------------
// Quick Settings
// -------------------------------
function setupQuickSettings() {
  const copyBtn = document.getElementById("copyLastWeekBtn");
  const clearBtn = document.getElementById("clearScheduleBtn");
  const vacationBtn = document.getElementById("vacationModeBtn");

  // Copy Last Week
  copyBtn?.addEventListener("click", async () => {
    const confirmResult = await Swal.fire({
      title: "Copy Last Week?",
      text: "This will copy a summary of last week's sessions to your clipboard.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Copy"
    });

    if (!confirmResult.isConfirmed) return;

    try {
      Swal.fire({
        title: "Generating Report...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const res = await fetch("/core/api/counselor/last-week-report/", {
        method: "GET",
      });
      const data = await res.json();

      let text = `Counselor ${data.counselor_name}'s Last Week Report\n`;
      text += `(${data.week_start} - ${data.week_end})\n\n`;

      if (data.completed === 0 && data.missed === 0 && data.total_patients === 0) {
        text = `Counselor ${data.counselor_name} has no patients and sessions missed or completed last week.`;
      } else {
        text += `Total Patients Accommodated: ${data.total_patients}\n`;
        text += `Sessions Completed: ${data.completed}\n`;
        text += `Sessions Missed (Pending/Cancelled): ${data.missed}\n`;
        if (data.patient_names.length > 0) {
          text += `Patients: ${data.patient_names.join(", ")}\n`;
        }
      }

      await navigator.clipboard.writeText(text);

      Swal.fire("Copied!", "Last week's report copied to clipboard.", "success");
    } catch (err) {
      Swal.fire("Error", "Could not generate report.", "error");
    }
  });

  // Clear Week
  clearBtn?.addEventListener("click", async () => {
    const confirmResult = await Swal.fire({
      title: 'Clear Schedule',
      text: 'What would you like to clear for this week?',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Clear Pending Appointments',
      denyButtonText: 'Clear Vacations & Slots',
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'var(--accent)',
      denyButtonColor: 'var(--amber)',
    });

    if (confirmResult.isConfirmed) {
      // Clear Appointments
      try {
        const res = await fetch('/core/api/counselor/clear-week-schedule/', {
          method: 'POST',
          headers: { 'X-CSRFToken': csrftoken }
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire('Cleared!', `${data.cancelled} appointment(s) cancelled.`, 'success')
            .then(() => refreshSlots());
        } else {
          Swal.fire('Error', 'Could not clear appointments.', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Network error.', 'error');
      }
    } else if (confirmResult.isDenied) {
      // Clear Availability & Vacations
      try {
        const res = await fetch('/core/api/availability/clear-week/', {
          method: 'POST',
          headers: { 'X-CSRFToken': csrftoken }
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire('Cleared!', 'All availability slots and vacations for the next 7 days have been removed.', 'success');
          refreshSlots();
        } else {
          Swal.fire('Error', data.message || 'Error clearing.', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Network error.', 'error');
      }
    }
  });

  // Vacation Mode
  vacationBtn?.addEventListener("click", async () => {
    const { value: range } = await Swal.fire({
      title: "Set Vacation Mode",
      html: `
        <label>Start Date:</label>
        <input type="date" id="vacationStart" class="swal2-input"><br>
        <label>End Date:</label>
        <input type="date" id="vacationEnd" class="swal2-input">
      `,
      showCancelButton: true,
      preConfirm: () => ({
        start: document.getElementById("vacationStart").value,
        end: document.getElementById("vacationEnd").value
      })
    });

    if (!range || !range.start || !range.end) {
      if (range && (!range.start || !range.end)) {
        Swal.fire("Error", "Select both dates.", "error");
      }
      return;
    }

    try {
      const res = await fetch("/core/api/availability/vacation-mode/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken
        },
        body: JSON.stringify(range)
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire("Vacation Set", `${data.days_set} vacation days scheduled.`, "success");
        refreshSlots();
      } else {
        Swal.fire("Error", data.message || "Failed to set vacation", "error");
      }
    } catch(err) {
      Swal.fire("Error", "Network error.", "error");
    }
  });
}

// -------------------------------
// Initialize
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addSlotBtn")?.addEventListener("click", addSlot);
  setupQuickSettings();
  refreshSlots();
});
