/* ── Feedback List JS (Search/Sort) ── */
document.addEventListener('DOMContentLoaded', function () {
    const table = document.getElementById('userTable');
    const tableBody = document.getElementById('userTableBody');
    const searchInput = document.getElementById('searchInput');
    const searchField = document.getElementById('searchField');
    const filterSummary = document.getElementById('filterSummary');
    const noResults = document.getElementById('noResultsMessage');
    const headers = table.querySelectorAll('thead th[data-field]');
    let sortDirection = {};

    /* ── Sorting ── */
    headers.forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const field = th.dataset.field;
            const dir = sortDirection[field] === 'asc' ? 'desc' : 'asc';
            sortDirection[field] = dir;

            const rows = Array.from(tableBody.querySelectorAll('tr'));
            rows.sort((a, b) => {
                const aVal = (a.querySelector(`td[data-field="${field}"]`)?.textContent || '').trim().toLowerCase();
                const bVal = (b.querySelector(`td[data-field="${field}"]`)?.textContent || '').trim().toLowerCase();

                if (!isNaN(aVal) && !isNaN(bVal)) {
                    return dir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
                }
                return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });
            rows.forEach(r => tableBody.appendChild(r));

            headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
            th.classList.add(dir === 'asc' ? 'sort-asc' : 'sort-desc');
        });
    });

    /* ── Searching ── */
    if (searchInput) {
        searchInput.addEventListener('input', filterTable);
    }

    function filterTable() {
        const field = searchField.value;
        const term = searchInput.value.trim().toLowerCase();
        const rows = tableBody.querySelectorAll('tr');
        let visible = 0;

        rows.forEach(row => {
            if (!field || !term) {
                row.style.display = '';
                visible++;
                return;
            }
            const cell = row.querySelector(`td[data-field="${field}"]`);
            const text = cell ? cell.textContent.toLowerCase() : '';
            if (text.includes(term)) {
                row.style.display = '';
                visible++;
            } else {
                row.style.display = 'none';
            }
        });

        if (noResults) {
            noResults.style.display = visible === 0 ? 'flex' : 'none';
        }
        if (table) {
            table.style.display = visible === 0 ? 'none' : '';
        }
        if (filterSummary) {
            filterSummary.textContent = term
                ? `Showing ${visible} result${visible !== 1 ? 's' : ''}`
                : 'Showing all feedback';
        }
    }
});
