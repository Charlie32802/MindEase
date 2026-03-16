document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.admin-form-container form');
    if (!form) return;

    // Add custom header
    const header = document.createElement('div');
    header.className = 'form-header';
    header.innerHTML = `<h1><span class="header-icon">👥</span> Add New User</h1>`;
    form.insertBefore(header, form.firstChild);

    // Move error messages below fields
    const errorLists = form.querySelectorAll('ul.errorlist');
    errorLists.forEach(el => {
        const container = el.closest('.form-row');
        if (container) container.appendChild(el);
    });

    // Hide checkboxes initially
    const roleField = document.querySelector('select[name="role"]');
    if (roleField) {
        const checkboxFields = ['accepted_privacy_policy','is_verified','is_active','is_staff','is_superuser'];
        checkboxFields.forEach(f => {
            const row = document.querySelector(`.field-${f}`);
            if (row) row.style.display = 'none';
        });
        roleField.dispatchEvent(new Event('change'));
    }

    // Disable HTML5 validation
    form.addEventListener('submit', () => {
        form.querySelectorAll('[required]').forEach(input => input.removeAttribute('required'));
    });
    
    // Adjust form container when sidebar is toggled
    function adjustFormContainer() {
        const sidebar = document.querySelector('.admin-custom-sidebar');
        const formContainer = document.querySelector('.custom-admin-add-user');
        
        if (sidebar && formContainer) {
            if (sidebar.classList.contains('collapsed')) {
                formContainer.style.marginLeft = '0';
            } else {
                formContainer.style.marginLeft = '280px';
            }
        }
    }
    
    // Initial adjustment
    adjustFormContainer();
    
    // Observe sidebar changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                adjustFormContainer();
            }
        });
    });
    
    const sidebar = document.querySelector('.admin-custom-sidebar');
    if (sidebar) {
        observer.observe(sidebar, { attributes: true });
    }
});