// admin_panel/static/admin_panel/js/admin_site_pagination.js

class ActivityPagination {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.container = document.querySelector('.recent-activity');
        this.init();
    }

    init() {
        // Updated selector: activity-module (was .module) to avoid Django admin CSS interference
        const moduleContainer = document.querySelector('.recent-activity .activity-module') || document.querySelector('.recent-activity');
        const hasPagination = moduleContainer?.dataset.hasPagination === 'true';
        this.totalPages = moduleContainer?.dataset.totalPages || 1;

        if (hasPagination) {
            this.createPaginationControls();
            this.attachEventListeners();
        }
    }

    createPaginationControls() {
        const paginationHTML = `
            <div class="activity-pagination">
                <button class="pagination-btn prev-btn" data-action="prev" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Previous
                </button>
                <span class="page-info">
                    <span class="current-page">1</span> / <span class="total-pages">${this.totalPages}</span>
                </span>
                <button class="pagination-btn next-btn" data-action="next">
                    Next
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        `;

        if (this.container) {
            this.container.insertAdjacentHTML('beforeend', paginationHTML);
        }
    }

    attachEventListeners() {
        const prevBtn = document.querySelector('.pagination-btn.prev-btn');
        const nextBtn = document.querySelector('.pagination-btn.next-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigatePage('prev'));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigatePage('next'));
        }
    }

    async navigatePage(direction) {
        if (this.isLoading) return;

        const newPage = direction === 'next' ? this.currentPage + 1 : this.currentPage - 1;

        if (newPage < 1) return;

        await this.loadPage(newPage);
    }

    async loadPage(pageNumber) {
        this.isLoading = true;
        this.showLoadingState();

        try {
            const response = await fetch(`/admin/recent-activities/?page=${pageNumber}`);

            if (!response.ok) {
                throw new Error('Failed to fetch activities');
            }

            const data = await response.json();
            await this.updateActivities(data);
            this.updatePaginationState(data);
            this.currentPage = pageNumber;

        } catch (error) {
            console.error('Error loading activities:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
        }
    }

    showLoadingState() {
        const activitiesContainer = document.querySelector('.recent-activity');
        if (!activitiesContainer) return;

        const activityItems = activitiesContainer.querySelectorAll('.activity-item');
        activityItems.forEach(item => {
            item.style.opacity = '0.5';
            item.style.transform = 'scale(0.98)';
        });

        this.togglePaginationButtons(true);
    }

    showErrorState() {
        const activitiesContainer = document.querySelector('.recent-activity');
        if (!activitiesContainer) return;

        const errorHTML = `
            <div class="activity-error">
                <div class="activity-icon" style="background: rgba(245, 101, 101, 0.2); color: #f56565;"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="activity-content">
                    <p>Failed to load activities. Please try again.</p>
                    <div class="activity-time">Error occurred</div>
                </div>
            </div>
        `;

        const existingActivities = activitiesContainer.querySelectorAll('.activity-item');
        if (existingActivities.length > 0) {
            existingActivities[0].outerHTML = errorHTML;
            for (let i = 1; i < existingActivities.length; i++) {
                existingActivities[i].remove();
            }
        }

        this.togglePaginationButtons(false);
    }

    async updateActivities(data) {
        const activitiesContainer = document.querySelector('.recent-activity');
        if (!activitiesContainer) return;

        const existingActivities = activitiesContainer.querySelectorAll('.activity-item');

        await this.fadeOutElements(existingActivities);

        existingActivities.forEach(item => item.remove());

        const newActivitiesHTML = data.activities.map(activity => `
            <div class="activity-item" style="opacity: 0; transform: translateY(20px);">
                <div class="activity-icon" style="background: ${activity.bg_color}; color: ${activity.text_color};">
                    ${activity.icon}
                </div>
                <div class="activity-content">
                    <p>${activity.description}</p>
                    <div class="activity-time">${activity.time_since}</div>
                </div>
            </div>
        `).join('');

        const h2Element = activitiesContainer.querySelector('h2');

        activitiesContainer.querySelectorAll('.activity-item').forEach(item => item.remove());

        if (h2Element) {
            h2Element.insertAdjacentHTML('afterend', newActivitiesHTML);
        }

        const newActivities = activitiesContainer.querySelectorAll('.activity-item');
        await this.fadeInElements(newActivities);
    }

    fadeOutElements(elements) {
        return new Promise(resolve => {
            if (!elements.length) {
                resolve();
                return;
            }

            elements.forEach((element, index) => {
                setTimeout(() => {
                    element.style.transition = 'all 0.3s ease';
                    element.style.opacity = '0';
                    element.style.transform = 'translateY(-10px) scale(0.95)';

                    if (index === elements.length - 1) {
                        setTimeout(resolve, 300);
                    }
                }, index * 50);
            });
        });
    }

    fadeInElements(elements) {
        return new Promise(resolve => {
            if (!elements.length) {
                resolve();
                return;
            }

            elements.forEach((element, index) => {
                setTimeout(() => {
                    element.style.transition = 'all 0.4s ease';
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0) scale(1)';

                    if (index === elements.length - 1) {
                        setTimeout(resolve, 400);
                    }
                }, index * 100 + 200);
            });
        });
    }

    updatePaginationState(data) {
        const prevBtn = document.querySelector('.pagination-btn.prev-btn');
        const nextBtn = document.querySelector('.pagination-btn.next-btn');
        const currentPageSpan = document.querySelector('.current-page');
        const totalPagesSpan = document.querySelector('.total-pages');

        if (prevBtn) prevBtn.disabled = !data.has_previous;
        if (nextBtn) nextBtn.disabled = !data.has_next;
        if (currentPageSpan) currentPageSpan.textContent = data.current_page;
        if (totalPagesSpan) totalPagesSpan.textContent = data.total_pages;

        this.togglePaginationButtons(false);
    }

    togglePaginationButtons(disabled) {
        const buttons = document.querySelectorAll('.activity-pagination .pagination-btn');
        buttons.forEach(btn => {
            btn.style.opacity = disabled ? '0.6' : '1';
            btn.style.pointerEvents = disabled ? 'none' : 'auto';
        });
    }
}

class SystemFeedbackPagination {
    constructor() {
        this.currentPage = 1;
        this.currentType = 'system';
        this.isLoading = false;
        this.container = document.querySelector('.system-feedback');
        this.init();
    }

    init() {
        // Updated selector: feedback-module (was .module) to avoid Django admin CSS interference
        const moduleContainer = document.querySelector('.system-feedback .feedback-module') || document.querySelector('.system-feedback');
        const hasPagination = moduleContainer?.dataset.fbHasPagination === 'true';
        this.totalPages = moduleContainer?.dataset.fbTotalPages || 1;

        if (hasPagination) {
            this.createPaginationControls();
            this.attachEventListeners();
        }

        // Custom dropdown toggle & selection listeners
        const typeSelect = document.getElementById('feedbackTypeSelect');
        if (typeSelect) {
            const selectedEl = typeSelect.querySelector('.custom-select-selected');
            const optionsEl = typeSelect.querySelector('.custom-select-options');

            // Toggle dropdown open/close on click
            if (selectedEl) {
                selectedEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    typeSelect.classList.toggle('open');
                });
            }

            // Handle option clicks
            if (optionsEl) {
                optionsEl.querySelectorAll('.custom-select-option').forEach(option => {
                    option.addEventListener('click', (e) => {
                        e.stopPropagation();

                        // Update selected styling
                        optionsEl.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
                        option.classList.add('selected');

                        // Update displayed text
                        if (selectedEl) {
                            selectedEl.textContent = option.textContent;
                        }

                        // Close dropdown
                        typeSelect.classList.remove('open');

                        // Load the selected feedback type
                        this.currentType = option.dataset.value;
                        this.currentPage = 1;
                        this.loadPage(1);
                    });
                });
            }

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                typeSelect.classList.remove('open');
            });
        }
    }

    createPaginationControls() {
        const paginationHTML = `
            <div class="feedback-pagination">
                <button class="pagination-btn fb-prev-btn" data-action="prev" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Previous
                </button>
                <span class="page-info">
                    <span class="fb-current-page">1</span> / <span class="fb-total-pages">${this.totalPages}</span>
                </span>
                <button class="pagination-btn fb-next-btn" data-action="next">
                    Next
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        `;

        if (this.container) {
            this.container.insertAdjacentHTML('beforeend', paginationHTML);
        }
    }

    attachEventListeners() {
        const prevBtn = document.querySelector('.pagination-btn.fb-prev-btn');
        const nextBtn = document.querySelector('.pagination-btn.fb-next-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigatePage('prev'));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigatePage('next'));
        }
    }

    async navigatePage(direction) {
        if (this.isLoading) return;
        const newPage = direction === 'next' ? this.currentPage + 1 : this.currentPage - 1;
        if (newPage < 1) return;
        await this.loadPage(newPage);
    }

    async loadPage(pageNumber) {
        this.isLoading = true;
        this.showLoadingState();

        try {
            const response = await fetch(`/admin-panel/recent-system-feedback/?page=${pageNumber}&type=${this.currentType}`);

            if (!response.ok) {
                throw new Error('Failed to fetch feedback');
            }

            const data = await response.json();
            await this.updateFeedbacks(data);
            this.updatePaginationState(data);
            this.currentPage = pageNumber;

        } catch (error) {
            console.error('Error loading feedbacks:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
        }
    }

    showLoadingState() {
        const itemsContainer = document.getElementById('feedbackItemsContainer');
        if (!itemsContainer) return;

        const fbItems = itemsContainer.querySelectorAll('.activity-item');
        fbItems.forEach(item => {
            item.style.opacity = '0.5';
            item.style.transform = 'scale(0.98)';
        });

        this.togglePaginationButtons(true);
    }

    showErrorState() {
        const itemsContainer = document.getElementById('feedbackItemsContainer');
        if (!itemsContainer) return;

        itemsContainer.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon" style="background: rgba(245, 101, 101, 0.2); color: #f56565;"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="activity-content">
                    <p>Failed to load feedbacks. Please try again.</p>
                    <div class="activity-time">Error occurred</div>
                </div>
            </div>
        `;

        this.togglePaginationButtons(false);
    }

    async updateFeedbacks(data) {
        const itemsContainer = document.getElementById('feedbackItemsContainer');
        if (!itemsContainer) return;

        const existingFeedbacks = itemsContainer.querySelectorAll('.activity-item');
        await this.fadeOutElements(existingFeedbacks);

        if (data.feedbacks.length === 0) {
            const emptyType = this.currentType === 'counselor' ? 'counselor' : 'system';
            itemsContainer.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon" style="background: rgba(102, 126, 234, 0.2); color: #667eea;"><i class="fas fa-comment-slash"></i></div>
                    <div class="activity-content">
                        <p>No ${emptyType} feedback available yet.</p>
                        <div class="activity-time"></div>
                    </div>
                </div>
            `;
            return;
        }

        const newFeedbacksHTML = data.feedbacks.map(fb => {
            const isCounselor = fb.type === 'counselor';
            const iconBg = isCounselor ? 'rgba(96, 165, 250, 0.2)' : 'rgba(245, 158, 11, 0.2)';
            const iconColor = isCounselor ? '#60a5fa' : '#f59e0b';
            const icon = isCounselor ? 'fa-user-md' : 'fa-comment';
            const extra = fb.extra ? ` <span style="color:rgba(210,225,255,0.5);font-size:12px;">${fb.extra}</span>` : '';
            const stars = isCounselor && fb.rating ? ' ⭐'.repeat(fb.rating) : '';

            return `
            <div class="activity-item" style="opacity: 0; transform: translateY(20px);">
                <div class="activity-icon" style="background: ${iconBg}; color: ${iconColor};">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="activity-content">
                    <p><strong>${fb.name}</strong>${extra}: ${fb.message}${stars}</p>
                    <div class="activity-time">${fb.time_since}</div>
                </div>
            </div>`;
        }).join('');

        itemsContainer.innerHTML = newFeedbacksHTML;

        const newFeedbacks = itemsContainer.querySelectorAll('.activity-item');
        await this.fadeInElements(newFeedbacks);
    }

    fadeOutElements(elements) {
        return new Promise(resolve => {
            if (!elements.length) { resolve(); return; }
            elements.forEach((element, index) => {
                setTimeout(() => {
                    element.style.transition = 'all 0.3s ease';
                    element.style.opacity = '0';
                    element.style.transform = 'translateY(-10px) scale(0.95)';
                    if (index === elements.length - 1) { setTimeout(resolve, 300); }
                }, index * 50);
            });
        });
    }

    fadeInElements(elements) {
        return new Promise(resolve => {
            if (!elements.length) { resolve(); return; }
            elements.forEach((element, index) => {
                setTimeout(() => {
                    element.style.transition = 'all 0.4s ease';
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0) scale(1)';
                    if (index === elements.length - 1) { setTimeout(resolve, 400); }
                }, index * 100 + 200);
            });
        });
    }

    updatePaginationState(data) {
        const prevBtn = document.querySelector('.pagination-btn.fb-prev-btn');
        const nextBtn = document.querySelector('.pagination-btn.fb-next-btn');
        const currentPageSpan = document.querySelector('.fb-current-page');
        const totalPagesSpan = document.querySelector('.fb-total-pages');

        if (prevBtn) prevBtn.disabled = !data.has_previous;
        if (nextBtn) nextBtn.disabled = !data.has_next;
        if (currentPageSpan) currentPageSpan.textContent = data.current_page;
        if (totalPagesSpan) totalPagesSpan.textContent = data.total_pages;

        this.togglePaginationButtons(false);
    }

    togglePaginationButtons(disabled) {
        const buttons = document.querySelectorAll('.feedback-pagination .pagination-btn');
        buttons.forEach(btn => {
            btn.style.opacity = disabled ? '0.6' : '1';
            btn.style.pointerEvents = disabled ? 'none' : 'auto';
        });
    }
}

// Initialize pagination when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    window.activityPagination = new ActivityPagination();
    window.systemFeedbackPagination = new SystemFeedbackPagination();
});

// Auto-refresh activities every 30 seconds
setInterval(async function () {
    const actPag = window.activityPagination;
    if (actPag && !actPag.isLoading) {
        await actPag.loadPage(actPag.currentPage);
    }
}, 30000);