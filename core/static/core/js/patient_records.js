// Patient Records JS
// Handles search filtering and modal interactions for the patient records page

// Sample data: Replace with dynamic data from backend (e.g., via fetch API)
const sampleNotes = {
  1: ["Session 2023-08-01 — discussed coping strategies.", "Session 2023-07-25 — mood improved after exercises."],
  2: ["Session 2023-08-05 — explored therapy options.", "Session 2023-07-30 — positive progress noted."],
  3: ["Session 2023-08-03 — addressed relationship concerns.", "Session 2023-07-28 — homework assigned."]
};

// Function: Debounces function calls to improve performance
function debounce(fn, wait = 200) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Function: Filters patient cards based on search term
function filterPatients(term) {
  const query = term.trim().toLowerCase();
  const cards = document.querySelectorAll('.me-card');
  cards.forEach(card => {
    const name = (card.getAttribute('data-name') || card.querySelector('.me-name')?.textContent || '').toLowerCase();
    card.style.display = name.includes(query) ? '' : 'none';
  });
}

// Function: Opens the modal with provided content and manages accessibility
function openModal(contentElement) {
  const modal = document.getElementById('me-modal');
  const modalContent = document.getElementById('me-modal-content');
  if (!modal || !modalContent) {
    console.error("Modal elements not found.");
    return;
  }
  
  modalContent.innerHTML = ''; // Clear previous content
  modalContent.appendChild(contentElement); // Append safe content
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  
  // Focus management: Trap focus in modal
  const focusableElements = modal.querySelectorAll('button, input, select, textarea');
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  if (firstFocusable) firstFocusable.focus();
  
  // Keyboard support
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  };
  modal.addEventListener('keydown', handleKeyDown);
  modal._keyHandler = handleKeyDown; // Store for removal
}

// Function: Closes the modal and restores page state
function closeModal() {
  const modal = document.getElementById('me-modal');
  if (!modal) return;
  
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  
  // Remove keyboard handler
  if (modal._keyHandler) {
    modal.removeEventListener('keydown', modal._keyHandler);
    delete modal._keyHandler;
  }
  
  // Return focus to triggering element if possible
  if (modal._triggerElement) {
    modal._triggerElement.focus();
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('patientSearch');
  const list = document.getElementById('patientList');
  const modal = document.getElementById('me-modal');
  const modalClose = document.querySelector('.me-modal-close');
  
  // Attach search with debouncing
  if (searchInput) {
    searchInput.addEventListener('input', debounce(e => filterPatients(e.target.value), 150));
  }
  
  // Modal close handlers
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', (ev) => { if (ev.target === modal) closeModal(); });
  
  // Event delegation for view notes
  if (list) {
    list.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.view-notes');
      if (!btn) return;
      
      const li = btn.closest('.me-card');
      const name = li.querySelector('.me-name')?.textContent || 'Unknown';
      const id = btn.dataset.id;
      
      // Create safe modal content
      const content = document.createElement('div');
      content.innerHTML = `<h2>Notes — ${name}</h2><p><em>(Demo — replace with real notes)</em></p>`;
      
      const notesList = document.createElement('ul');
      (sampleNotes[id] || []).forEach(note => {
        const li = document.createElement('li');
        li.textContent = note;
        notesList.appendChild(li);
      });
      content.appendChild(notesList);
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn btn-outline';
      closeBtn.textContent = 'Close';
      closeBtn.addEventListener('click', closeModal);
      content.appendChild(closeBtn);
      
      modal._triggerElement = btn; // Store for focus return
      openModal(content);
    });
  }
  
  // Event delegation for schedule
  if (list) {
    list.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.schedule-btn');
      if (!btn) return;
      
      const li = btn.closest('.me-card');
      const name = li.querySelector('.me-name')?.textContent || 'Unknown';
      
      // Create safe modal content
      const content = document.createElement('div');
      content.innerHTML = `<h2>Schedule Session — ${name}</h2><p><em>(Demo) Pick a date/time.</em></p>`;
      
      const label = document.createElement('label');
      label.textContent = 'Choose date';
      label.style.display = 'block';
      label.style.fontWeight = '600';
      label.style.marginBottom = '6px';
      
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.style.padding = '8px';
      dateInput.style.borderRadius = '6px';
      dateInput.style.border = '1px solid #e6eef6';
      
      content.appendChild(label);
      content.appendChild(dateInput);
      
      const btnContainer = document.createElement('div');
      btnContainer.style.marginTop = '12px';
      btnContainer.style.textAlign = 'right';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-outline';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', closeModal);
      
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn-gradient';
      confirmBtn.textContent = 'Confirm';
      confirmBtn.style.marginLeft = '8px';
      confirmBtn.addEventListener('click', () => {
        alert('Session scheduled (demo).');
        closeModal();
      });
      
      btnContainer.appendChild(cancelBtn);
      btnContainer.appendChild(confirmBtn);
      content.appendChild(btnContainer);
      
      modal._triggerElement = btn; // Store for focus return
      openModal(content);
    });
  }
});
