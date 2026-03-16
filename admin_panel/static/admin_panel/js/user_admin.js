document.addEventListener('DOMContentLoaded', function() {
    const roleField = document.querySelector('select[name="role"]');
    
    // Track original positions of checkbox fields
    const originalCheckboxPositions = new Map();
    
    function updateCheckboxRequirements() {
        const role = roleField ? roleField.value : 'user';
        
        // Define which checkboxes should be shown and required for each role
        const checkboxConfig = {
            'user': {
                'accepted_privacy_policy': { required: true, show: true },
                'is_active': { required: false, show: true },
                'is_verified': { required: false, show: false },
                'is_staff': { required: false, show: false },
                'is_superuser': { required: false, show: false }
            },
            'counselor': {
                'accepted_privacy_policy': { required: true, show: true },
                'is_verified': { required: false, show: true },
                'is_active': { required: false, show: true },
                'is_staff': { required: false, show: false },
                'is_superuser': { required: false, show: false }
            },
            'admin': {
                'accepted_privacy_policy': { required: false, show: false },
                'is_verified': { required: false, show: false },
                'is_active': { required: false, show: true },
                'is_staff': { required: true, show: true },
                'is_superuser': { required: true, show: true }
            }
        };
        
        const config = checkboxConfig[role] || checkboxConfig['user'];
        
        Object.entries(config).forEach(([name, settings]) => {
            const checkbox = document.querySelector(`input[name="${name}"]`);
            const fieldRow = document.querySelector(`.field-${name}`);
            
            if (checkbox && fieldRow) {
                // Store original position if not already stored
                if (!originalCheckboxPositions.has(name)) {
                    originalCheckboxPositions.set(name, {
                        parent: fieldRow.parentNode,
                        nextSibling: fieldRow.nextSibling
                    });
                }
                
                // Show/hide based on role
                if (settings.show) {
                    fieldRow.style.display = 'block';
                    
                    // For counselor role, move checkboxes after degree_certificate field
                    if (role === 'counselor' && ['is_verified', 'is_active', 'accepted_privacy_policy'].includes(name)) {
                        const degreeCertificateField = document.querySelector('.field-degree_certificate');
                        if (degreeCertificateField) {
                            // Create a container for counselor checkboxes if it doesn't exist
                            let checkboxContainer = document.querySelector('.counselor-checkbox-container');
                            if (!checkboxContainer) {
                                checkboxContainer = document.createElement('div');
                                checkboxContainer.className = 'counselor-checkbox-container';
                                // Insert after degree certificate field
                                degreeCertificateField.parentNode.insertBefore(checkboxContainer, degreeCertificateField.nextSibling);
                            }
                            
                            // Only move if not already in the container
                            if (!checkboxContainer.contains(fieldRow)) {
                                checkboxContainer.appendChild(fieldRow);
                            }
                        }
                    } else {
                        // Return to original position if not counselor role
                        const originalPosition = originalCheckboxPositions.get(name);
                        if (originalPosition && !originalPosition.parent.contains(fieldRow)) {
                            if (originalPosition.nextSibling) {
                                originalPosition.parent.insertBefore(fieldRow, originalPosition.nextSibling);
                            } else {
                                originalPosition.parent.appendChild(fieldRow);
                            }
                        }
                    }
                } else {
                    fieldRow.style.display = 'none';
                }
            }
        });
        
        // Clean up empty checkbox container when not in counselor role
        if (role !== 'counselor') {
            const checkboxContainer = document.querySelector('.counselor-checkbox-container');
            if (checkboxContainer && checkboxContainer.children.length === 0) {
                checkboxContainer.remove();
            }
        }
    }
    
    // --- [REST OF THE CODE REMAINS THE SAME] ---
    // --- Specialization dropdown creator (no "Other Mild Concerns" logic) ---
    function createSpecializationDropdown() {
        // [Keep all the existing specialization dropdown code unchanged]
        // Try to find an existing select (or other field) named 'specializations'
        let specializationsField = document.querySelector('select[name="specializations"], input[name="specializations"], textarea[name="specializations"]');
        if (!specializationsField) return;

        // If there's already a hidden native select we created earlier, use that
        let nativeSelect = document.querySelector('select[name="specializations"].customized');
        if (!nativeSelect) {
            // If the existing element is a <select>, use it; otherwise create a hidden select multiple
            if (specializationsField.tagName === 'SELECT') {
                nativeSelect = specializationsField;
                nativeSelect.multiple = true; // allow multiple specializations
            } else {
                nativeSelect = document.createElement('select');
                nativeSelect.name = 'specializations';
                nativeSelect.multiple = true;
                // insert the select after the original field (keep original hidden if it's present)
                specializationsField.parentNode.insertBefore(nativeSelect, specializationsField.nextSibling);
                specializationsField.style.display = 'none';
            }
        }

        // Avoid double-creation
        if (nativeSelect.classList.contains('specializations-dropdown-initialized')) return;
        nativeSelect.classList.add('customized', 'specializations-dropdown-initialized');

        // Options list (matches your snippet)
        const specializationOptions = [
            'Anxiety & Stress',
            'Depression & Mood',
            'Relationship Issues',
            'Trauma & PTSD',
            'Grief & Loss',
            'Self-Esteem',
            'Life Transitions',
            'Work Stress',
            'Financial Stress',
            'Academic Pressure',
            'Parenting',
            'Anger Management',
            'Mindfulness'
        ];

        // Populate the native select with options if missing
        specializationOptions.forEach(opt => {
            if (!Array.from(nativeSelect.options).some(o => o.value === opt)) {
                nativeSelect.add(new Option(opt, opt));
            }
        });

        // Create the custom dropdown using the same classes as your custom_select.js for consistent styling
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'custom-select-container specialization-select';

        const toggleButton = document.createElement('div');
        toggleButton.className = 'custom-select-toggle';
        toggleButton.innerHTML = `
            <span class="selected-text">Select Specialization</span>
            <span class="dropdown-icon">▼</span>
        `;

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-select-options';

        // Create option rows (checkbox + label) — include value attribute for consistency
        specializationOptions.forEach(option => {
            const safeId = `spec_${option.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
            const optionElement = document.createElement('div');
            optionElement.className = 'custom-select-option specialization-option';
            optionElement.innerHTML = `
                <input type="checkbox" id="${safeId}" class="spec-checkbox" value="${option}" data-value="${option}">
                <label for="${safeId}" class="spec-label">${option}</label>
            `;

            // If native select already had this option selected, check the box
            const matchingOpt = Array.from(nativeSelect.options).find(o => o.value === option);
            if (matchingOpt && matchingOpt.selected) {
                const cb = optionElement.querySelector('input.spec-checkbox');
                if (cb) cb.checked = true;
            }

            // Checkbox change handler - update native select
            const checkbox = optionElement.querySelector('input.spec-checkbox');
            checkbox.addEventListener('change', function() {
                const val = this.value;
                updateOriginalSelect(nativeSelect, val, this.checked);
                updateSelectedText(toggleButton);
                // Fire change for any listeners
                nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Make whole row clickable — but DO NOT double-toggle when label/input is clicked.
            // Let native label behavior handle label clicks; only toggle programmatically when
            // user clicks outside the label/input (e.g., whitespace in the option).
            optionElement.addEventListener('click', function(e) {
                // If click originated on the input or inside its label, do nothing — native behavior will toggle it.
                if (e.target.tagName === 'INPUT' || e.target.closest('label')) return;

                const cb = this.querySelector('input.spec-checkbox');
                if (!cb) return;
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
            });

            optionsContainer.appendChild(optionElement);
        });

        // Assemble and insert into DOM
        dropdownContainer.appendChild(toggleButton);
        dropdownContainer.appendChild(optionsContainer);
        nativeSelect.parentNode.insertBefore(dropdownContainer, nativeSelect.nextSibling);

        // Hide native select (we already use it for form submission)
        nativeSelect.style.display = 'none';

        // Toggle dropdown on click
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpening = !optionsContainer.classList.contains('open');

            // Close all other open custom selects
            document.querySelectorAll('.custom-select-options.open').forEach(dropdown => {
                if (dropdown !== optionsContainer) {
                    dropdown.classList.remove('open');
                    if (dropdown.previousElementSibling) dropdown.previousElementSibling.classList.remove('open');
                }
            });

            optionsContainer.classList.toggle('open', isOpening);
            toggleButton.classList.toggle('open', isOpening);

            // Try to ensure it's visible if near bottom (simple measure)
            if (isOpening) {
                setTimeout(() => {
                    const rect = optionsContainer.getBoundingClientRect();
                    const over = rect.bottom - window.innerHeight;
                    if (over > 0) {
                        optionsContainer.style.maxHeight = `calc(300px - ${over + 10}px)`;
                    } else {
                        optionsContainer.style.maxHeight = '';
                    }
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

        // Update the toggle text initially
        updateSelectedText(toggleButton);
    }
    // --- End of specialization dropdown creator ---

    // Helper function to update selected text (counts selections and pluralizes)
    function updateSelectedText(toggleButton) {
        // Count checked specialization inputs
        const checkedInputs = Array.from(document.querySelectorAll('.specialization-option input:checked, .spec-checkbox:checked'));
        const count = checkedInputs.length;

        // Find toggle text element
        let toggleTextEl = null;
        if (toggleButton && toggleButton.querySelector) {
            toggleTextEl = toggleButton.querySelector('.selected-text');
        }
        if (!toggleTextEl) toggleTextEl = document.getElementById('specialization-text') || document.querySelector('.custom-select-toggle .selected-text');

        // Decide text
        let text = '';
        if (count === 0) {
            text = 'Select Specialization';
        } else {
            text = `${count} Specialization${count !== 1 ? 's' : ''} Selected`;
        }

        // Update UI
        if (toggleTextEl) {
            toggleTextEl.textContent = text;
        } else {
            document.querySelectorAll('.custom-select-toggle .selected-text, .specialization-toggle .selected-text').forEach(el => {
                el.textContent = text;
            });
            const legacy = document.getElementById('specialization-text');
            if (legacy) legacy.textContent = text;
        }
    }
    
    // Helper function to update original select element (find or create option)
    function updateOriginalSelect(selectElement, value, isSelected) {
    // Get all selected values
    const selectedValues = Array.from(document.querySelectorAll('.specialization-option input:checked, .spec-checkbox:checked'))
        .map(input => input.value);
    
    // Convert to JSON string
    const jsonValue = JSON.stringify(selectedValues);
    
    // Find or create a hidden input for JSON data
    let jsonInput = document.querySelector('input[name="specializations_json"]');
    if (!jsonInput) {
        jsonInput = document.createElement('input');
        jsonInput.type = 'hidden';
        jsonInput.name = 'specializations';
        selectElement.parentNode.appendChild(jsonInput);
    }
    
    jsonInput.value = jsonValue;
    
    // Also update the native select for any Django validation that might use it
    // Clear all options first
    while (selectElement.options.length > 0) {
        selectElement.remove(0);
    }
    
    // Add the selected values as options
    selectedValues.forEach(val => {
        const option = new Option(val, val);
        option.selected = true;
        selectElement.add(option);
    });
    
    // Trigger change event
    selectElement.dispatchEvent(new Event('change', { bubbles: true }));
}
    
    if (roleField) {
        // Function to toggle fields based on role
        function toggleFieldsBasedOnRole() {
            const role = roleField.value;
            
            // Fields to show/hide based on role
            const userFields = ['age', 'gender', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'];
            const counselorFields = ['specializations', 'other_specializations', 'institution_name', 'institution_email', 'license_number', 'years_experience', 'bio', 'professional_id', 'degree_certificate'];
            
            // Hide all fields first
            userFields.forEach(field => {
                const fieldRow = document.querySelector(`.field-${field}`);
                if (fieldRow) fieldRow.style.display = 'none';
            });
            
            counselorFields.forEach(field => {
                const fieldRow = document.querySelector(`.field-${field}`);
                if (fieldRow) fieldRow.style.display = 'none';
            });
            
            // Show appropriate fields based on role
            if (role === 'user') {
                userFields.forEach(field => {
                    const fieldRow = document.querySelector(`.field-${field}`);
                    if (fieldRow) fieldRow.style.display = 'block';
                });
            } else if (role === 'counselor') {
                counselorFields.forEach(field => {
                    const fieldRow = document.querySelector(`.field-${field}`);
                    if (fieldRow) fieldRow.style.display = 'block';
                });
                
                // Create specialization dropdown for counselors (slight delay to allow Django DOM render)
                setTimeout(createSpecializationDropdown, 100);
            }
            
            // Update checkbox requirements and visibility
            updateCheckboxRequirements();
        }
        
        // Initial toggle - run immediately
        toggleFieldsBasedOnRole();
        
        // Add event listener for role change
        roleField.addEventListener('change', toggleFieldsBasedOnRole);
    } else {
        // If no role field found (edit form), still update checkbox requirements
        updateCheckboxRequirements();
        
        // Check if we're on a counselor form and create specialization dropdown
        const specializationsField = document.querySelector('select[name="specializations"]');
        if (specializationsField) {
            createSpecializationDropdown();
        }
    }
});