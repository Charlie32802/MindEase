// admin_panel/static/admin_panel/js/custom_search.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize custom search dropdown
    initializeCustomSearchDropdown();
    
    // Make search functions globally available
    window.clearSearchDropdown = clearSearchDropdown;
    window.selectSearchField = selectSearchField;
});

function initializeCustomSearchDropdown() {
    const dropdown = document.getElementById('searchFieldDropdown');
    if (!dropdown) return;
    
    const hiddenInput = dropdown.querySelector('#searchField');
    const textSpan = dropdown.querySelector('#searchFieldText');
    const options = dropdown.querySelector('.search-dropdown-options');
    const toggle = dropdown.querySelector('.search-dropdown-toggle');
    
    // Set initial text
    textSpan.textContent = 'Select field to search...';
    
    // Add click event to toggle dropdown
    if (toggle) {
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSearchDropdown();
        });
    }
    
    // Add click events to options
    const optionElements = dropdown.querySelectorAll('.search-dropdown-option');
    optionElements.forEach(option => {
        option.addEventListener('click', function() {
            const fieldValue = this.getAttribute('data-value');
            const fieldText = this.textContent.trim();
            selectSearchField(fieldValue, fieldText);
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target)) {
            closeSearchDropdown();
        }
    });
}

function toggleSearchDropdown() {
    const dropdown = document.getElementById('searchFieldDropdown');
    const options = dropdown.querySelector('.search-dropdown-options');
    const toggle = dropdown.querySelector('.search-dropdown-toggle');
    
    // If dropdown is already open, close it
    if (options.classList.contains('open')) {
        closeSearchDropdown();
        return;
    }
    
    // Close all other dropdowns first
    closeAllDropdowns();
    
    // Open current dropdown
    options.classList.add('open');
    toggle.classList.add('open');
}

function closeSearchDropdown() {
    const dropdown = document.getElementById('searchFieldDropdown');
    const options = dropdown.querySelector('.search-dropdown-options');
    const toggle = dropdown.querySelector('.search-dropdown-toggle');
    
    options.classList.remove('open');
    toggle.classList.remove('open');
}

function closeAllDropdowns() {
    // Close any other open dropdowns if needed
    document.querySelectorAll('.search-dropdown-options.open').forEach(options => {
        options.classList.remove('open');
    });
    document.querySelectorAll('.search-dropdown-toggle.open').forEach(toggle => {
        toggle.classList.remove('open');
    });
}

function selectSearchField(fieldValue, fieldText) {
    const dropdown = document.getElementById('searchFieldDropdown');
    const hiddenInput = dropdown.querySelector('#searchField');
    const textSpan = dropdown.querySelector('#searchFieldText');
    
    // Update selected value
    hiddenInput.value = fieldValue;
    textSpan.textContent = fieldText;
    
    // Update selected style
    dropdown.querySelectorAll('.search-dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    if (fieldValue) {
        const selectedOption = dropdown.querySelector(`.search-dropdown-option[data-value="${fieldValue}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
    }
    
    // Close dropdown
    closeSearchDropdown();
    
    // Enable/disable search input based on field selection
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const hasField = fieldValue !== '';
    
    if (searchInput) searchInput.disabled = !hasField;
    if (clearSearchBtn) clearSearchBtn.disabled = !hasField;
    
    if (!hasField) {
        if (searchInput) searchInput.value = '';
        // Call appropriate function based on page
        if (typeof window.showAllUsers !== 'undefined') window.showAllUsers();
        if (typeof window.showAllCounselors !== 'undefined') window.showAllCounselors();
    } else {
        if (searchInput) searchInput.focus();
    }
}

// Function to clear search (to be called from your existing JS)
function clearSearchDropdown() {
    selectSearchField('', 'Select field to search...');
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    // Call appropriate function based on page
    if (typeof window.showAllUsers !== 'undefined') window.showAllUsers();
    if (typeof window.showAllCounselors !== 'undefined') window.showAllCounselors();
}