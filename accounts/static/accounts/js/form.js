// Tab switching functionality
function switchTab(tabType) {
    // Remove active class from all options and content
    document.querySelectorAll('.registration-option').forEach(option => option.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to clicked option and corresponding content
    event.currentTarget.classList.add('active');
    document.getElementById(tabType + '-tab').classList.add('active');

    // Animate the line position
    const line = document.getElementById('registrationLine');
    if (tabType === 'user') {
        line.style.width = '50%';
        line.style.left = '0%';
    } else {
        line.style.width = '50%';
        line.style.left = '50%';
    }
}

// Password visibility toggle
function togglePassword(button) {
    const input = button.previousElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = 'Hide';
    } else {
        input.type = 'password';
        button.textContent = 'Show';
    }
}

// Enhanced password validation with real-time checking
function validatePasswordFields(form) {
    const password1 = form.querySelector('input[name="password1"]');
    const password2 = form.querySelector('input[name="password2"]');

    if (!password1 || !password2) return;

    // Password strength validation
    const validatePasswordStrength = (password) => {
        const minLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);

        return {
            isValid: minLength && hasUpper && hasLower && hasNumber,
            minLength,
            hasUpper,
            hasLower,
            hasNumber
        };
    };

    // Real-time password validation
    const password1Error = password1.parentNode.querySelector('.error-message');
    const password2Error = password2.parentNode.querySelector('.error-message');

    password1.addEventListener('input', function () {
        const value = this.value;
        const validation = validatePasswordStrength(value);

        if (value.length === 0) {
            this.classList.remove('error');
            if (password1Error) password1Error.classList.remove('show');
        } else if (!validation.isValid) {
            this.classList.add('error');
            if (password1Error) {
                let errorText = 'Password must contain: ';
                const requirements = [];
                if (!validation.minLength) requirements.push('8+ characters');
                if (!validation.hasUpper) requirements.push('uppercase letter');
                if (!validation.hasLower) requirements.push('lowercase letter');
                if (!validation.hasNumber) requirements.push('number');

                password1Error.textContent = errorText + requirements.join(', ');
                password1Error.classList.add('show');
            }
        } else {
            this.classList.remove('error');
            if (password1Error) password1Error.classList.remove('show');
        }

        // Also check password confirmation when password1 changes
        if (password2.value.length > 0) {
            validatePasswordConfirmation();
        }
    });

    // Real-time password confirmation validation
    const validatePasswordConfirmation = () => {
        const password1Value = password1.value;
        const password2Value = password2.value;

        if (password2Value.length === 0) {
            password2.classList.remove('error');
            if (password2Error) password2Error.classList.remove('show');
        } else if (password1Value !== password2Value) {
            password2.classList.add('error');
            if (password2Error) {
                password2Error.textContent = 'Passwords do not match';
                password2Error.classList.add('show');
            }
        } else {
            password2.classList.remove('error');
            if (password2Error) password2Error.classList.remove('show');
        }
    };

    password2.addEventListener('input', validatePasswordConfirmation);
}

// Enhanced email validation
function validateEmail(input) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errorMsg = input.parentNode.querySelector('.error-message');

    const validate = () => {
        const value = input.value.trim();

        if (value.length === 0) {
            input.classList.remove('error');
            if (errorMsg) errorMsg.classList.remove('show');
        } else if (!emailRegex.test(value)) {
            input.classList.add('error');
            if (errorMsg) {
                errorMsg.textContent = 'Please enter a valid email address';
                errorMsg.classList.add('show');
            }
        } else {
            input.classList.remove('error');
            if (errorMsg) errorMsg.classList.remove('show');
        }
    };

    input.addEventListener('input', validate);
    input.addEventListener('blur', validate);
}

function validatePhone(input) {
    // PH mobile only: 09XXXXXXXXX or +639XXXXXXXXX
    const phoneRegex = /^(?:\+63|0)9\d{9}$/;
    const errorMsg = input.parentNode.querySelector('.error-message');

    const validate = () => {
        const value = input.value.replace(/\s+|[-()]/g, ''); // clean formatting

        if (value.length === 0) {
            input.classList.remove('error');
            if (errorMsg) errorMsg.classList.remove('show');
        } else if (!phoneRegex.test(value)) {
            input.classList.add('error');
            if (errorMsg) {
                errorMsg.textContent = 'Enter a valid PH number (09XXXXXXXXX or +639XXXXXXXXX)';
                errorMsg.classList.add('show');
            }
        } else {
            input.classList.remove('error');
            if (errorMsg) errorMsg.classList.remove('show');
        }
    };

    input.addEventListener('input', validate);
    input.addEventListener('blur', validate);
}

// Enhanced age validation
function validateAge(input) {
    const errorMsg = input.parentNode.querySelector('.error-message');

    const validate = () => {
        const value = parseInt(input.value);

        if (input.value.length === 0) {
            input.classList.remove('error');
            if (errorMsg) errorMsg.classList.remove('show');
        } else if (isNaN(value) || value < 13 || value > 120) {
            input.classList.add('error');
            if (errorMsg) {
                errorMsg.textContent = 'Please enter a valid age (13-120)';
                errorMsg.classList.add('show');
            }
        } else {
            input.classList.remove('error');
            if (errorMsg) errorMsg.classList.remove('show');
        }
    };

    input.addEventListener('input', validate);
    input.addEventListener('blur', validate);
}

// Enhanced name validation
function validateName(input) {
    const nameRegex = /^[a-zA-Z\s'-]{2,50}$/;
    const errorMsg = input.parentNode.querySelector('.error-message');

    const validate = () => {
        const value = input.value.trim();

        if (value.length === 0) {
            input.classList.remove('error');
            if (errorMsg) errorMsg.classList.remove('show');
        } else if (!nameRegex.test(value) || value.length < 2) {
            input.classList.add('error');
            if (errorMsg) {
                errorMsg.textContent = 'Please enter a valid name (2-50 characters, letters only)';
                errorMsg.classList.add('show');
            }
        } else {
            input.classList.remove('error');
            if (errorMsg) errorMsg.classList.remove('show');
        }
    };

    input.addEventListener('input', validate);
    input.addEventListener('blur', validate);
}

// File upload label update with enhanced validation
let currentZoom = 1;
let currentFileInputId = null;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let imagePosition = { x: 0, y: 0 };

function updateFileLabel(input, labelId) {
    const label = document.getElementById(labelId);
    const actionsId = input.id === 'professional_id' ? 'id-actions' : 'degree-actions';
    const actions = document.getElementById(actionsId);
    const fileNameDisplay = document.getElementById(input.id + '-file-name');
    const errorMsg = input.parentNode.querySelector('.error-message');

    if (input.files && input.files.length > 0) {
        const file = input.files[0];
        const fileName = file.name;

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            input.classList.add('error');
            if (errorMsg) {
                errorMsg.textContent = 'Please upload a PDF, JPG, or PNG file';
                errorMsg.classList.add('show');
            }
            input.value = ''; // Clear invalid file
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            input.classList.add('error');
            if (errorMsg) {
                errorMsg.textContent = 'File size must be less than 5MB';
                errorMsg.classList.add('show');
            }
            input.value = ''; // Clear oversized file
            return;
        }

        // File is valid
        input.classList.remove('error');
        if (errorMsg) errorMsg.classList.remove('show');

        label.innerHTML = `<i class="fa-solid fa-check"></i> ${fileName.substring(0, 20)}${fileName.length > 20 ? '...' : ''}`;
        label.classList.add('has-file');

        if (actions) actions.style.display = 'flex';
        if (fileNameDisplay) fileNameDisplay.textContent = fileName;
    } else {
        label.classList.remove('has-file');
        if (labelId === 'id-label') {
            label.innerHTML = '<i class="fa-solid fa-file-invoice"></i> Upload Professional ID or License';
        } else {
            label.innerHTML = '<i class="fa-solid fa-graduation-cap"></i> Upload Degree Certificate';
        }

        if (actions) actions.style.display = 'none';
        if (fileNameDisplay) fileNameDisplay.textContent = '';
    }
}

function clearFile(inputId, labelId, actionsId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    const actions = document.getElementById(actionsId);
    const fileNameDisplay = document.getElementById(inputId + '-file-name');
    const errorMsg = input.parentNode.querySelector('.error-message');

    input.value = '';
    input.classList.remove('error');
    if (errorMsg) errorMsg.classList.remove('show');

    label.classList.remove('has-file');
    if (labelId === 'id-label') {
        label.innerHTML = '<i class="fa-solid fa-file-invoice"></i> Upload Professional ID or License';
    } else {
        label.innerHTML = '<i class="fa-solid fa-graduation-cap"></i> Upload Degree Certificate';
    }

    if (actions) actions.style.display = 'none';
    if (fileNameDisplay) fileNameDisplay.textContent = '';
}

// File preview functionality (keeping existing code)
function previewFile(inputId) {
    const input = document.getElementById(inputId);
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const fileNameDisplay = document.getElementById(inputId + '-file-name');
    const fileName = fileNameDisplay ? fileNameDisplay.textContent : file.name;

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const previewModal = document.getElementById('previewModal');
            const previewImage = document.getElementById('previewImage');

            previewImage.src = e.target.result;
            previewImage.alt = fileName;

            currentZoom = 1;
            imagePosition = { x: 0, y: 0 };
            updateImageTransform();

            document.body.style.overflow = 'hidden';
            previewModal.classList.add('active');
            previewModal.scrollIntoView({ behavior: 'smooth', block: 'center' });

            currentFileInputId = inputId;
            setupDragListeners(previewImage);
        };
        reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, '_blank');
    } else {
        alert('File type not supported for preview');
    }
}

// Drag and zoom functionality (keeping existing code)
function setupDragListeners(image) {
    image.removeEventListener('mousedown', handleMouseDown);
    image.removeEventListener('mousemove', handleMouseMove);
    image.removeEventListener('mouseup', handleMouseUp);
    image.removeEventListener('mouseleave', handleMouseUp);

    image.addEventListener('mousedown', handleMouseDown);
    image.addEventListener('mousemove', handleMouseMove);
    image.addEventListener('mouseup', handleMouseUp);
    image.addEventListener('mouseleave', handleMouseUp);

    image.addEventListener('touchstart', handleTouchStart);
    image.addEventListener('touchmove', handleTouchMove);
    image.addEventListener('touchend', handleTouchEnd);
}

function handleMouseDown(e) {
    if (currentZoom > 1) {
        isDragging = true;
        dragStart.x = e.clientX - imagePosition.x;
        dragStart.y = e.clientY - imagePosition.y;
        e.target.style.cursor = 'grabbing';
        e.preventDefault();
    }
}

function handleMouseMove(e) {
    if (isDragging && currentZoom > 1) {
        imagePosition.x = e.clientX - dragStart.x;
        imagePosition.y = e.clientY - dragStart.y;
        updateImageTransform();
        e.preventDefault();
    } else if (currentZoom > 1) {
        e.target.style.cursor = 'grab';
    } else {
        e.target.style.cursor = 'default';
    }
}

function handleMouseUp(e) {
    if (isDragging) {
        isDragging = false;
        e.target.style.cursor = currentZoom > 1 ? 'grab' : 'default';
    }
}

function handleTouchStart(e) {
    if (currentZoom > 1 && e.touches.length === 1) {
        isDragging = true;
        const touch = e.touches[0];
        dragStart.x = touch.clientX - imagePosition.x;
        dragStart.y = touch.clientY - imagePosition.y;
        e.preventDefault();
    }
}

function handleTouchMove(e) {
    if (isDragging && currentZoom > 1 && e.touches.length === 1) {
        const touch = e.touches[0];
        imagePosition.x = touch.clientX - dragStart.x;
        imagePosition.y = touch.clientY - dragStart.y;
        updateImageTransform();
        e.preventDefault();
    }
}

function handleTouchEnd(e) {
    isDragging = false;
}

function updateImageTransform() {
    const previewImage = document.getElementById('previewImage');
    if (previewImage) {
        previewImage.style.transform = `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${currentZoom})`;
        previewImage.style.cursor = currentZoom > 1 ? 'grab' : 'default';
    }
}

function closePreview() {
    const previewModal = document.getElementById('previewModal');
    previewModal.classList.remove('active');
    document.body.style.overflow = '';
    isDragging = false;
    imagePosition = { x: 0, y: 0 };
    currentZoom = 1;
    currentFileInputId = null;
}

function zoomIn(e) {
    if (e) e.preventDefault();
    if (currentZoom < 3) {
        currentZoom += 0.1;
        updateImageTransform();
    }
}

function zoomOut(e) {
    if (e) e.preventDefault();
    if (currentZoom > 0.5) {
        currentZoom -= 0.1;
        if (currentZoom <= 1) {
            imagePosition = { x: 0, y: 0 };
        }
        updateImageTransform();
    }
}

function resetZoom(e) {
    if (e) e.preventDefault();
    currentZoom = 1;
    imagePosition = { x: 0, y: 0 };
    updateImageTransform();
}

// FIXED: Enhanced specialization validation
function toggleSpecializationOptions() {
    const options = document.getElementById('specializationOptions');
    const toggle = document.querySelector('.specialization-toggle');
    const icon = document.getElementById('specialization-icon');

    // Toggle the dropdown
    const isOpening = !options.classList.contains('open');
    options.classList.toggle('open');
    toggle.classList.toggle('open');

    if (options.classList.contains('open')) {
        icon.textContent = '▲';
        document.getElementById('specialization-error').classList.remove('show');
    } else {
        icon.textContent = '▼';
        validateSpecializations();
    }

    updateSelectedCount();
}

// FIXED: Update selected count function
function updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll('input[name="specializations"]:checked');
    let validCount = 0;

    selectedCheckboxes.forEach(checkbox => {
        if (checkbox.value === 'Other Mild Concerns') {
            // Only count "Other Mild Concerns" if there's text in the input field
            const otherInput = document.querySelector('input[name="other_concerns"]');
            if (otherInput && otherInput.value.trim()) {
                validCount++;
            }
        } else {
            validCount++;
        }
    });

    const toggleText = document.getElementById('specialization-text');
    if (toggleText) {
        if (validCount === 0) {
            toggleText.textContent = 'Select Specialization';
        } else {
            toggleText.textContent = `${validCount} Specialization${validCount !== 1 ? 's' : ''} Selected`;
        }
    }
}

// FIXED: Handle specialization option clicks properly
function setupSpecializationOptions() {
    const specializationOptions = document.getElementById('specializationOptions');
    if (!specializationOptions) return;

    // Remove any existing event listeners to prevent duplicates
    const options = specializationOptions.querySelectorAll('.specialization-option');
    options.forEach(option => {
        option.replaceWith(option.cloneNode(true));
    });

    // Add proper click handling
    const newOptions = specializationOptions.querySelectorAll('.specialization-option');
    newOptions.forEach(option => {
        const checkbox = option.querySelector('input[type="checkbox"]');
        const label = option.querySelector('label');

        // Handle click on the option div
        option.addEventListener('click', function (e) {
            // Don't handle the event if the click was directly on the checkbox
            if (e.target === checkbox || e.target === label) {
                return;
            }

            // Toggle the checkbox
            checkbox.checked = !checkbox.checked;

            // Trigger change event for the checkbox
            const event = new Event('change', { bubbles: true });
            checkbox.dispatchEvent(event);

            // Update the UI
            updateSelectedCount();
            validateSpecializations();
        });

        // Handle checkbox change
        checkbox.addEventListener('change', function () {
            updateSelectedCount();
            validateSpecializations();

            // Handle "Other Mild Concerns" specifically
            if (checkbox.value === 'Other Mild Concerns') {
                toggleOtherConcernsInput(checkbox);
            }
        });
    });
}

// FIXED: Validate specializations function
function validateSpecializations() {
    const selectedCheckboxes = document.querySelectorAll('input[name="specializations"]:checked');
    let hasSelection = false;
    let isValid = true;
    const errorMsg = document.getElementById('specialization-error');

    selectedCheckboxes.forEach(checkbox => {
        if (checkbox.value === 'Other Mild Concerns') {
            // Check if "Other Mild Concerns" has text input
            const otherInput = document.querySelector('input[name="other_concerns"]');
            if (otherInput && otherInput.value.trim()) {
                hasSelection = true;
            } else {
                isValid = false;
            }
        } else {
            hasSelection = true;
        }
    });

    if (!hasSelection) {
        if (errorMsg) {
            errorMsg.textContent = 'Please select at least one specialization';
            errorMsg.classList.add('show');
        }
        return false;
    } else if (!isValid) {
        if (errorMsg) {
            errorMsg.textContent = 'Please specify other concerns';
            errorMsg.classList.add('show');
        }
        return false;
    } else {
        if (errorMsg) errorMsg.classList.remove('show');
        return true;
    }
}

// FIXED: Toggle other concerns input function
function toggleOtherConcernsInput(checkbox) {
    const otherContainer = document.getElementById('other-concerns-input-container');
    const otherInput = otherContainer.querySelector('input[name="other_concerns"]');
    const errorMsg = otherContainer.querySelector('.error-message');

    if (checkbox.checked) {
        otherContainer.style.display = 'block';
        otherInput.setAttribute('required', 'required');

        // Add real-time validation for other concerns input
        otherInput.addEventListener('input', function () {
            if (this.value.trim()) {
                this.classList.remove('error');
                if (errorMsg) errorMsg.classList.remove('show');
            } else {
                this.classList.add('error');
                if (errorMsg) {
                    errorMsg.textContent = 'Please specify other concerns';
                    errorMsg.classList.add('show');
                }
            }
            // Call updateSelectedCount when typing in the field
            updateSelectedCount();
        });
    } else {
        otherContainer.style.display = 'none';
        otherInput.removeAttribute('required');
        otherInput.value = '';
        otherInput.classList.remove('error');
        if (errorMsg) errorMsg.classList.remove('show');
        // Update count when unchecking
        updateSelectedCount();
    }

    updateSelectedCount();
}

// Enhanced dropdown functionality
function toggleGenderOptions() {
    const options = document.getElementById('genderOptions');
    const toggle = document.querySelector('.gender-toggle');
    const icon = document.getElementById('gender-icon');

    if (toggle) {
        toggle.classList.add('user-interacted');
    }

    options.classList.toggle('open');
    toggle.classList.toggle('open');

    if (options.classList.contains('open')) {
        icon.textContent = '▲';
    } else {
        icon.textContent = '▼';

        const genderInput = document.getElementById('gender-input');
        const genderError = document.getElementById('gender-error');

        if (genderInput && !genderInput.value && toggle.classList.contains('user-interacted')) {
            if (genderError) genderError.classList.add('show');
        }
    }
}

function selectGender(value) {
    document.getElementById('gender-input').value = value;

    let displayText = '';
    switch (value) {
        case 'male':
            displayText = 'Male';
            break;
        case 'female':
            displayText = 'Female';
            break;
        case 'prefer_not_to_say':
            displayText = 'Prefer Not To Say';
            break;
    }
    document.getElementById('gender-text').textContent = displayText;

    document.querySelectorAll('.gender-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    toggleGenderOptions();

    const genderError = document.getElementById('gender-error');
    if (genderError) genderError.classList.remove('show');
}

function toggleRelationshipOptions() {
    const options = document.getElementById('relationshipOptions');
    const toggle = document.querySelector('.relationship-toggle');
    const icon = document.getElementById('relationship-icon');

    if (toggle) {
        toggle.classList.add('user-interacted');
    }

    options.classList.toggle('open');
    toggle.classList.toggle('open');

    if (options.classList.contains('open')) {
        icon.textContent = '▲';
    } else {
        icon.textContent = '▼';

        const relationshipInput = document.getElementById('relationship-input');
        const relationshipError = document.getElementById('relationship-error');

        if (relationshipInput && !relationshipInput.value && toggle.classList.contains('user-interacted')) {
            if (relationshipError) relationshipError.classList.add('show');
        }
    }
}

function selectRelationship(value) {
    document.getElementById('relationship-input').value = value;

    let displayText = '';
    switch (value) {
        case 'parent':
            displayText = 'Parent';
            break;
        case 'sibling':
            displayText = 'Sibling';
            break;
        case 'partner':
            displayText = 'Partner';
            break;
        case 'friend':
            displayText = 'Friend';
            break;
        case 'relative':
            displayText = 'Relative';
            break;
    }
    document.getElementById('relationship-text').textContent = displayText;

    document.querySelectorAll('.relationship-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    toggleRelationshipOptions();

    const relationshipError = document.getElementById('relationship-error');
    if (relationshipError) relationshipError.classList.remove('show');
}

// FIXED: Enhanced form validation
function validateForm(formId) {
    let isValid = true;
    const form = document.getElementById(formId);

    console.log('Validating form:', formId); // Debug log

    // Validate specializations for counselor form FIRST
    if (formId === 'counselorRegisterForm') {
        const specializationsValid = validateSpecializations();
        console.log('Specializations valid:', specializationsValid); // Debug log
        if (!specializationsValid) {
            isValid = false;
        }
    }

    // Basic validation for all required fields
    const requiredInputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    console.log('Required inputs found:', requiredInputs.length); // Debug log

    requiredInputs.forEach(input => {
        // Skip file inputs for validation (they're handled separately)
        if (input.type === 'file') return;

        const value = input.value ? input.value.trim() : '';
        if (!value) {
            console.log('Missing required field:', input.name); // Debug log
            input.classList.add('error');
            isValid = false;

            const errorMsg = input.parentNode.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.textContent = 'This field is required';
                errorMsg.classList.add('show');
            }
        } else {
            input.classList.remove('error');
            const errorMsg = input.parentNode.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.classList.remove('show');
            }
        }
    });

    // Validate password fields
    const password1 = form.querySelector('input[name="password1"]');
    const password2 = form.querySelector('input[name="password2"]');

    if (password1 && password2) {
        if (password1.value !== password2.value) {
            const errorMsg = password2.parentNode.querySelector('.error-message');
            password2.classList.add('error');
            if (errorMsg) {
                errorMsg.textContent = 'Passwords do not match';
                errorMsg.classList.add('show');
            }
            isValid = false;
        }
    }

    // Validate dropdowns (only for user form)
    if (formId === 'userRegisterForm') {
        const requiredDropdowns = ['gender-input', 'relationship-input'];
        requiredDropdowns.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input && !input.value) {
                const errorMsg = document.getElementById(inputId.replace('-input', '-error'));
                if (errorMsg) errorMsg.classList.add('show');
                isValid = false;
            }
        });
    }

    // Validate checkboxes (privacy policy)
    const requiredCheckboxes = form.querySelectorAll('input[type="checkbox"][required]');
    requiredCheckboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            const checkboxGroup = checkbox.closest('.checkbox-group');
            if (checkboxGroup) {
                checkboxGroup.classList.add('error');
            }
            isValid = false;
        } else {
            const checkboxGroup = checkbox.closest('.checkbox-group');
            if (checkboxGroup) {
                checkboxGroup.classList.remove('error');
            }
        }
    });

    console.log('Form validation result:', isValid); // Debug log
    return isValid;
}

// FIXED: Enhanced event listeners and initialization
document.addEventListener('DOMContentLoaded', function () {
    // Initialize password validation for all forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        validatePasswordFields(form);

        form.addEventListener('submit', function (e) {
            console.log('Form submit event triggered for:', this.id);

            const submitBtn = this.querySelector('.submit-btn');
            const formIsValid = validateForm(this.id);

            console.log('Form validation passed:', formIsValid);

            // Prevent submission if validation fails
            if (!formIsValid) {
                console.log('Form validation failed, preventing submission');
                e.preventDefault();

                // Reset button state
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }
                return false;
            }

            // Form is valid, add loading state
            if (submitBtn) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
            }

            console.log('Form validation passed, allowing submission');

            // GUARANTEE REMEMBER ME SAVE on successful validation
            if (this.id === 'loginForm') {
                const loginEmail = document.getElementById('loginEmail');
                const rememberMe = document.getElementById('rememberMeCheckbox');
                if (loginEmail && rememberMe) {
                    if (rememberMe.checked && loginEmail.value.trim()) {
                        localStorage.setItem('mindease_remember_email', loginEmail.value.trim());
                    } else {
                        localStorage.removeItem('mindease_remember_email');
                    }
                }
            }

            // Let the form submit naturally - don't prevent default for valid forms
            return true;
        });
    });

    // Initialize field-specific validation
    document.querySelectorAll('input[type="email"]').forEach(validateEmail);
    document.querySelectorAll('input[type="tel"]').forEach(validatePhone);
    document.querySelectorAll('input[type="number"][name="age"]').forEach(validateAge);
    document.querySelectorAll('input[name="full_name"], input[name="first_name"], input[name="last_name"], input[name="emergency_contact_name"]').forEach(validateName);

    // FIXED: Initialize specialization options
    setupSpecializationOptions();

    // FIXED: Initialize specialization validation with correct field name
    const otherInput = document.querySelector('input[name="other_concerns"]');
    if (otherInput) {
        otherInput.addEventListener('input', updateSelectedCount);
    }

    // Update count on page load
    updateSelectedCount();

    // Initialize textarea validation
    const bioInput = document.querySelector('textarea[name="bio"]');
    if (bioInput) {
        const bioError = bioInput.parentNode.querySelector('.error-message');

        bioInput.addEventListener('input', function () {
            if (this.value.trim()) {
                this.classList.remove('error');
                if (bioError) bioError.classList.remove('show');
            }
        });

        bioInput.addEventListener('blur', function () {
            if (!this.value.trim()) {
                this.classList.add('error');
                if (bioError) {
                    bioError.textContent = 'Please enter your professional bio';
                    bioError.classList.add('show');
                }
            }
        });
    }

    // ---- Remember Me: email persistence via localStorage ----
    initRememberMe();
});

function initRememberMe() {
    const emailInput = document.getElementById('loginEmail');
    const checkbox = document.getElementById('rememberMeCheckbox');
    const loginForm = document.getElementById('loginForm');
    if (!emailInput || !checkbox || !loginForm) return;

    const STORAGE_KEY = 'mindease_remember_email';

    // Helper: save or clear based on current state
    function syncRememberMe() {
        if (checkbox.checked && emailInput.value.trim()) {
            localStorage.setItem(STORAGE_KEY, emailInput.value.trim());
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    // On page load: restore saved email + check the box
    const savedEmail = localStorage.getItem(STORAGE_KEY);
    if (savedEmail) {
        emailInput.value = savedEmail;
        checkbox.checked = true;
    }

    // On checkbox change: save immediately when checked, clear when unchecked
    checkbox.addEventListener('change', function () {
        syncRememberMe();
    });

    // On Sign In button click: save BEFORE the form submit event fires
    const submitBtn = loginForm.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function () {
            syncRememberMe();
        });
    }

    // On form submit: save again for redundancy
    loginForm.addEventListener('submit', function () {
        syncRememberMe();
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', function (event) {
    // Close gender options when clicking outside
    const genderOptions = document.getElementById('genderOptions');
    const genderToggle = document.querySelector('.gender-toggle');

    if (genderOptions && genderOptions.classList.contains('open') &&
        !genderOptions.contains(event.target) &&
        !genderToggle.contains(event.target)) {

        genderOptions.classList.remove('open');
        genderToggle.classList.remove('open');
        document.getElementById('gender-icon').textContent = '▼';

        const genderInput = document.getElementById('gender-input');
        const genderError = document.getElementById('gender-error');

        if (genderInput && genderToggle.classList.contains('user-interacted') && !genderInput.value) {
            if (genderError) genderError.classList.add('show');
        }
    }

    // Close specialization options when clicking outside
    const specOptions = document.getElementById('specializationOptions');
    const specToggle = document.querySelector('.specialization-toggle');

    if (specOptions && specOptions.classList.contains('open') &&
        !specOptions.contains(event.target) &&
        !specToggle.contains(event.target)) {

        validateSpecializations();
        toggleSpecializationOptions();
    }

    // Close relationship options when clicking outside
    const relOptions = document.getElementById('relationshipOptions');
    const relToggle = document.querySelector('.relationship-toggle');

    if (relOptions && relOptions.classList.contains('open') &&
        !relOptions.contains(event.target) &&
        !relToggle.contains(event.target)) {

        relOptions.classList.remove('open');
        relToggle.classList.remove('open');
        document.getElementById('relationship-icon').textContent = '▼';

        const relationshipInput = document.getElementById('relationship-input');
        const relationshipError = document.getElementById('relationship-error');

        if (relationshipInput && relToggle.classList.contains('user-interacted') && !relationshipInput.value) {
            if (relationshipError) relationshipError.classList.add('show');
        }
    }
});

// Prevent Escape key from closing modal
document.addEventListener('keydown', function (e) {
    const previewModal = document.getElementById('previewModal');
    if (previewModal && previewModal.classList.contains('active') && e.key === 'Escape') {
        e.preventDefault();
    }
});

function resetFormLoadingState(formId) {
    const form = document.getElementById(formId);
    const submitBtn = form.querySelector('.submit-btn');
    const buttonText = submitBtn.querySelector('span');

    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;

    if (buttonText) {
        if (formId === 'userRegisterForm') {
            buttonText.textContent = 'Create User Account';
        } else if (formId === 'counselorRegisterForm') {
            buttonText.textContent = 'Submit Application for Review';
        } else {
            buttonText.textContent = 'Sign In';
        }
    }
}