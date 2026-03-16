// admin_panel/static/admin_panel/js/list_of_users.js
document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.querySelector('.admin-dashboard-wrapper');
    const sidebar = document.querySelector('.admin-custom-sidebar');

    const updateLayout = () => {
        if (!wrapper || !sidebar) return;
        if (sidebar.classList.contains('collapsed')) {
            wrapper.classList.add('sidebar-collapsed');
        } else {
            wrapper.classList.remove('sidebar-collapsed');
        }
    };

    // Initial load
    updateLayout();

    // Listen to sidebar toggle if exists
    const toggle = document.querySelector('.sidebar-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            setTimeout(updateLayout, 10); // Give sidebar class time to toggle
        });
    }

    // Search and Filter functionality
    const searchField = document.getElementById('searchField'); // This is now the hidden input
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const filterSummary = document.getElementById('filterSummary');
    const userTable = document.getElementById('userTable');
    const userTableBody = document.getElementById('userTableBody');
    const noResultsMessage = document.getElementById('noResultsMessage');
    
    let allRows = Array.from(userTableBody.querySelectorAll('tr:not(#noUsersRow)'));
    let filteredRows = [...allRows];

    // REMOVED: searchField.addEventListener('change') - handled by custom dropdown

    // Perform search when typing
    searchInput.addEventListener('input', () => {
        performSearch();
    });

    // REMOVED: clearSearchBtn.addEventListener('click') - handled by custom dropdown's clearSearchDropdown()

    function performSearch() {
        const field = searchField.value; // This now gets value from hidden input
        const searchTerm = searchInput.value.toLowerCase().trim();

        if (!field || !searchTerm) {
            showAllUsers();
            return;
        }

        // Filter rows based on search criteria
        filteredRows = allRows.filter(row => {
            const cell = row.querySelector(`td[data-field="${field}"]`);
            if (!cell) return false;
            
            const cellText = cell.textContent.toLowerCase().trim();
            return cellText.includes(searchTerm);
        });

        displayFilteredResults();
    }

    function showAllUsers() {
        // Show all rows
        allRows.forEach(row => {
            row.style.display = '';
        });
        
        noResultsMessage.style.display = 'none';
        userTable.style.display = '';
        
        updateFilterSummary(allRows.length, allRows.length);
    }

    function displayFilteredResults() {
        // Hide all rows first
        allRows.forEach(row => {
            row.style.display = 'none';
        });

        if (filteredRows.length === 0) {
            // Show no results message
            noResultsMessage.style.display = 'block';
            userTable.style.display = 'none';
        } else {
            // Show filtered rows
            filteredRows.forEach(row => {
                row.style.display = '';
            });
            noResultsMessage.style.display = 'none';
            userTable.style.display = '';
        }

        updateFilterSummary(filteredRows.length, allRows.length);
    }

    function updateFilterSummary(showing, total) {
        if (showing === total) {
            filterSummary.textContent = `Showing all ${total} users`;
        } else {
            filterSummary.textContent = `Showing ${showing} of ${total} users`;
        }
    }

    // Make functions globally available for custom search dropdown
    window.showAllUsers = showAllUsers;
    window.performSearch = performSearch;

    // Initial summary
    updateFilterSummary(allRows.length, allRows.length);
});