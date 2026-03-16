// admin_panel/static/admin_panel/js/list_of_counselors.js
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
    updateLayout();
    const toggle = document.querySelector('.sidebar-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            setTimeout(updateLayout, 10);
        });
    }

    // Filtering functionality
    const searchField = document.getElementById('searchField'); // This is now the hidden input
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const filterSummary = document.getElementById('filterSummary');
    const counselorTable = document.getElementById('counselorTable');
    const counselorTableBody = document.getElementById('counselorTableBody');
    const noResultsMessage = document.getElementById('noResultsMessage');

    let allRows = Array.from(counselorTableBody.querySelectorAll('tr:not(#noCounselorsRow)'));
    let filteredRows = [...allRows];

    // REMOVED: searchField.addEventListener('change') - handled by custom dropdown

    searchInput.addEventListener('input', () => {
        performSearch();
    });

    // REMOVED: clearSearchBtn.addEventListener('click') - handled by custom dropdown's clearSearchDropdown()

    function performSearch() {
        const field = searchField.value; // This now gets value from hidden input
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (!field || !searchTerm) {
            showAllCounselors();
            return;
        }

        filteredRows = allRows.filter(row => {
            const cell = row.querySelector(`td[data-field="${field}"]`);
            if (!cell) return false;
            const cellText = cell.textContent.toLowerCase().trim();
            return cellText.includes(searchTerm);
        });

        displayFilteredResults();
    }

    function showAllCounselors() {
        allRows.forEach(row => row.style.display = '');
        noResultsMessage.style.display = 'none';
        counselorTable.style.display = '';
        updateFilterSummary(allRows.length, allRows.length);
    }

    function displayFilteredResults() {
        allRows.forEach(row => row.style.display = 'none');
        if (filteredRows.length === 0) {
            noResultsMessage.style.display = 'block';
            counselorTable.style.display = 'none';
        } else {
            filteredRows.forEach(row => row.style.display = '');
            noResultsMessage.style.display = 'none';
            counselorTable.style.display = '';
        }
        updateFilterSummary(filteredRows.length, allRows.length);
    }

    function updateFilterSummary(showing, total) {
        if (showing === total) {
            filterSummary.textContent = `Showing all ${total} counselors`;
        } else {
            filterSummary.textContent = `Showing ${showing} of ${total} counselors`;
        }
    }

    // Make functions globally available for custom search dropdown
    window.showAllCounselors = showAllCounselors;
    window.performSearch = performSearch;

    updateFilterSummary(allRows.length, allRows.length);
});