/*
📌 NOTES FOR TEAM — PLEASE READ

This file (admin_panel/static/admin_panel/js/custom_select.js) is the "control interface" for custom-styled dropdowns in the MindEase admin panel.  
Think of it as the mechanism that transforms ordinary <select> elements into interactive, user-friendly dropdowns for our platform.

🔹 What this file does:
- Hides the native select elements while keeping them functional.
- Creates custom dropdown containers with toggle buttons and option lists.
- Updates the UI and the original <select> value when an option is selected.
- Ensures dropdowns remain fully visible within the viewport.
- Automatically applies to targeted fields like Gender, Role, and Emergency Contact Relationship.
- Observes the DOM for dynamically added content to apply custom dropdowns automatically.

🔹 What you should NOT do:
- Don’t rename "admin_panel" back to "accounts" → it may break static file references.
- Don’t remove or drastically modify the event listeners — they handle selection, toggling, and visibility.
- Don’t remove the MutationObserver — it ensures the dropdowns work for dynamically rendered elements.

🔹 How you should FEEL about this file:
This is a key part of our admin UX.  
Handle it with care: if something breaks here, dropdowns may stop functioning or display incorrectly.  
Treat it as the interface that guides users smoothly through selections in MindEase. ❤️
*/

document.addEventListener('DOMContentLoaded', function() {
    // Function to create custom dropdown
    function createCustomDropdown(selectElement) {
        // Skip if already customized or not a select element
        if (selectElement.classList.contains('customized') || selectElement.tagName !== 'SELECT') {
            return;
        }
        
        // Create dropdown container
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'custom-select-container';
        
        // Create toggle button
        const toggleButton = document.createElement('div');
        toggleButton.className = 'custom-select-toggle';
        toggleButton.innerHTML = `
            <span class="selected-text">${selectElement.options[selectElement.selectedIndex]?.text || 'Select an option'}</span>
            <span class="dropdown-icon">▼</span>
        `;
        
        // Create options container
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-select-options';
        
        // Add options
        Array.from(selectElement.options).forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'custom-select-option';
            optionElement.textContent = option.text;
            optionElement.dataset.value = option.value;
            
            if (option.selected) {
                optionElement.classList.add('selected');
            }
            
            optionElement.addEventListener('click', function() {
                // Update select value
                selectElement.value = option.value;
                
                // Update selected text
                toggleButton.querySelector('.selected-text').textContent = option.text;
                
                // Update selected option visually
                optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                optionElement.classList.add('selected');
                
                // Close dropdown
                optionsContainer.classList.remove('open');
                toggleButton.classList.remove('open');
                
                // Trigger change event
                selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            optionsContainer.appendChild(optionElement);
        });
        
        // Toggle dropdown on click
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpening = !optionsContainer.classList.contains('open');
            
            // Close all other open dropdowns first
            document.querySelectorAll('.custom-select-options.open').forEach(dropdown => {
                if (dropdown !== optionsContainer) {
                    dropdown.classList.remove('open');
                    dropdown.previousElementSibling.classList.remove('open');
                }
            });
            
            // Toggle this dropdown
            optionsContainer.classList.toggle('open');
            toggleButton.classList.toggle('open');
            
            // If we're opening the dropdown, ensure it's visible
            if (isOpening) {
                setTimeout(() => {
                    ensureDropdownVisible(optionsContainer);
                }, 10);
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!dropdownContainer.contains(e.target)) {
                optionsContainer.classList.remove('open');
                toggleButton.classList.remove('open');
            }
        });
        
        // Function to ensure dropdown is fully visible
        function ensureDropdownVisible(dropdown) {
            const rect = dropdown.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // If dropdown is going off the bottom of the screen
            if (rect.bottom > viewportHeight) {
                const overflow = rect.bottom - viewportHeight;
                dropdown.style.maxHeight = `calc(300px - ${overflow + 10}px)`;
            }
        }
        
        // Hide original select but keep it functional
        selectElement.style.display = 'none';
        selectElement.classList.add('customized');
        
        // Assemble the custom dropdown
        dropdownContainer.appendChild(toggleButton);
        dropdownContainer.appendChild(optionsContainer);
        
        // Insert after the original select
        selectElement.parentNode.insertBefore(dropdownContainer, selectElement.nextSibling);
    }
    
    // Apply to specific dropdowns (Gender, Role, Emergency Contact Relationship)
    function initCustomDropdowns() {
        // Find all select elements that might be our targets
        const allSelects = document.querySelectorAll('select');
        
        allSelects.forEach(select => {
            // Check if this is one of our target dropdowns
            const selectName = select.name.toLowerCase();
            const selectId = select.id.toLowerCase();
            
            if (selectName.includes('gender') || selectId.includes('gender') ||
                selectName.includes('role') || selectId.includes('role') ||
                selectName.includes('relationship') || selectId.includes('relationship')) {
                createCustomDropdown(select);
            }
        });
    }
    
    // Initialize when DOM is loaded
    initCustomDropdowns();
    
    // Also initialize when new content is added (for Django admin dynamic content)
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                initCustomDropdowns();
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});