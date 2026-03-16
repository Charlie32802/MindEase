/* ── Counselor Filter Page JS ── */
/* Lazy loading, dynamic reviews/ratings, profile view tracking, modals */

(function () {
  let currentPage = 1;
  let isLoading = false;
  let hasMore = true;
  let searchTimeout = null;
  const trackedViews = new Set();

  /* ── Helper: get CSRF token ── */
  function getCsrf() {
    const c = document.cookie.match(/csrftoken=([^;]+)/);
    return c ? c[1] : '';
  }

  /* ── Render stars ── */
  function renderStars(rating, size) {
    size = size || 13;
    let html = '';
    const r = rating || 0;
    for (let i = 1; i <= 5; i++) {
      if (i <= r) {
        html += `<i class="fa-solid fa-star" style="color:var(--amber);font-size:${size}px;"></i>`;
      } else {
        html += `<i class="fa-regular fa-star" style="color:var(--text-muted);font-size:${size}px;"></i>`;
      }
    }
    return html;
  }

  /* ── Build a counselor card ── */
  function buildCard(c, idx) {
    const stars = renderStars(c.avg_rating);
    const ratingText = c.avg_rating > 0 ? c.avg_rating : 'N/A';

    const specsHtml = c.specializations.length
      ? c.specializations.map(s => {
          if (s === 'Other Mild Concerns' && c.other_specializations) {
            const safeText = c.other_specializations.replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, " ");
            return `<span class="tag clickable-tag" onclick="window._openOtherConcernsModal('${safeText}')" title="Click to read full description">${s}</span>`;
          }
          return `<span class="tag">${s}</span>`;
        }).join('')
      : '<span style="font-size:13px;color:var(--text-muted);">No specializations listed</span>';

    let featuredHtml = '';
    if (c.best_review) {
      const msgPreview = c.best_review.message.length > 80
        ? c.best_review.message.substring(0, 80) + '...'
        : c.best_review.message;
      featuredHtml = `
        <div class="featured-review" data-review-id="${c.best_review.id}" onclick="window._openFeaturedModal(${c.best_review.id})">
          <div class="featured-stars">${renderStars(c.best_review.rating, 11)}</div>
          <p class="featured-msg">${msgPreview}</p>
          <span class="featured-date">${c.best_review.created_at}</span>
        </div>`;
    }

    let vacationHtml = '';
    if (c.vacation_dates && c.vacation_dates.length > 0) {
      const dates = c.vacation_dates.join(', ');
      vacationHtml = `<p class="busy-dates" style="color:var(--amber); font-size:12.5px; margin-top:2px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-umbrella-beach"></i> Busy on: ${dates}</p>`;
    }

    return `
    <article class="counselor-card" data-counselor-id="${c.id}"
      style="animation-delay: ${0.08 + idx * 0.05}s;">
      <div class="counselor-left">
        <div class="avatar">${c.initial}</div>
        <div class="info">
          <h3>${c.full_name}</h3>
          <p class="location"><i class="fa-solid fa-map"></i> ${c.institution}</p>
          ${vacationHtml}
          <p class="rating">
            ${stars}
            <span style="margin-left:4px;">${ratingText}</span>
            <span class="reviews-link" onclick="window._openReviewsModal(${c.id}, '${c.full_name.replace(/'/g, "\\'")}')">
              (${c.review_count} review${c.review_count !== 1 ? 's' : ''})
            </span>
          </p>
          <p class="stat-views"><i class="fa-solid fa-eye"></i> ${c.profile_views} profile view${c.profile_views !== 1 ? 's' : ''}</p>
          <p class="bio">${c.bio}</p>
          <div class="specialization-tags">${specsHtml}</div>
          <div class="buttons" style="margin-top:16px;">
            <a href="javascript:void(0);" class="btn-primary book-btn" data-id="${c.id}">
              <i class="fa-solid fa-calendar-days"></i> Book Session
            </a>
          </div>
        </div>
      </div>
      ${featuredHtml}
      <span class="verified">${c.verified}</span>
    </article>`;
  }

  /* ── Fetch counselors page ── */
  async function loadCounselors(reset) {
    if (isLoading) return;
    if (!hasMore && !reset) return;

    if (reset) {
      currentPage = 1;
      hasMore = true;
      document.getElementById('counselorList').innerHTML = '';
    }

    isLoading = true;
    document.getElementById('lazyLoader').style.display = 'flex';
    document.getElementById('emptyState').style.display = 'none';

    const search = document.getElementById('search').value.trim();
    const spec = document.getElementById('specialization').value;
    const url = `/core/api/counselors/?page=${currentPage}&per_page=6&search=${encodeURIComponent(search)}&specialization=${encodeURIComponent(spec)}`;

    try {
      const resp = await fetch(url);
      const data = await resp.json();

      const list = document.getElementById('counselorList');
      data.counselors.forEach((c, i) => {
        list.insertAdjacentHTML('beforeend', buildCard(c, i));
      });

      hasMore = data.has_more;
      currentPage++;

      if (data.total === 0 && currentPage === 2) {
        document.getElementById('emptyState').style.display = 'block';
      }

      // Attach booking handlers for new cards
      attachBookingHandlers();

      // Setup IntersectionObserver for profile views
      setupViewTracking();

    } catch (err) {
      console.error('Failed to load counselors:', err);
    }

    isLoading = false;
    document.getElementById('lazyLoader').style.display = 'none';
  }

  /* ── Infinite scroll ── */
  function setupInfiniteScroll() {
    const sentinel = document.getElementById('lazyLoader');
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        loadCounselors(false);
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
  }

  /* ── Filter debounce ── */
  function onFilterChange() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadCounselors(true), 350);
  }

  document.getElementById('search').addEventListener('input', onFilterChange);

  /* ── Custom Dropdown Logic ── */
  window.toggleDropdown = function() {
    document.getElementById('specMenu').classList.toggle('show');
  };

  document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('specDropdown');
    if (dropdown && !dropdown.contains(e.target)) {
      document.getElementById('specMenu').classList.remove('show');
    }
  });

  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', function() {
      document.getElementById('dropdownText').textContent = this.textContent;
      
      document.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      
      document.getElementById('specialization').value = this.dataset.value;
      document.getElementById('specMenu').classList.remove('show');
      
      loadCounselors(true);
    });
  });

  /* ── Profile view tracking via IntersectionObserver (once per counselor per day) ── */
  function setupViewTracking() {
    const cards = document.querySelectorAll('.counselor-card[data-counselor-id]');
    const viewObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.dataset.counselorId;
          if (!trackedViews.has(id)) {
            trackedViews.add(id);
            fetch(`/core/api/counselor/${id}/track-view/`, {
              method: 'POST',
              headers: { 'X-CSRFToken': getCsrf() },
            }).catch(() => { });
          }
        }
      });
    }, { threshold: 0.5 });

    cards.forEach(card => {
      if (!card.dataset.viewTracked) {
        card.dataset.viewTracked = '1';
        viewObserver.observe(card);
      }
    });
  }

  /* ── Booking (reuse existing pattern) ── */
  async function fetchSlots(counselorId) {
    try {
      const res = await fetch(`/core/api/availability/counselor/${counselorId}/`);
      const data = await res.json();
      return data.slots || [];
    } catch (err) {
      console.error("Could not fetch slots", err);
      return [];
    }
  }

  function attachBookingHandlers() {
    document.querySelectorAll('.book-btn:not([data-bound])').forEach(btn => {
      btn.setAttribute('data-bound', '1');
      btn.addEventListener('click', async function () {
        const counselorId = this.dataset.id;
        const slots = await fetchSlots(counselorId);

        if (slots.length === 0) {
          Swal.fire('No slots available', 'This counselor currently has no available time slots.', 'info');
          return;
        }

        const slotOptions = slots.map(s => {
          const remaining = s.total_slots - s.booked_slots;
          const slotDate = new Date(s.date);
          const today = new Date();
          const diffDays = Math.ceil((slotDate - today) / (1000 * 60 * 60 * 24));
          
          let dateLabel = s.weekday;
          if (diffDays > 7) {
              const options = { month: 'short', day: 'numeric', year: 'numeric' };
              dateLabel = `${s.weekday}, ${slotDate.toLocaleDateString('en-US', options)}`;
          }

          return `<option value="${s.id}" data-date="${s.date}" data-end="${s.end_time}" ${remaining <= 0 ? 'disabled' : ''}>
                    ${dateLabel} ${s.start_time} - ${s.end_time} (${remaining} left)
                  </option>`;
        }).join('');

        Swal.fire({
          title: 'Book a Session',
          html: `<select id="swal-slot" class="swal2-input">${slotOptions}</select>`,
          confirmButtonText: 'Book',
          showCancelButton: true,
          cancelButtonText: 'Cancel',
          focusConfirm: false,
          preConfirm: () => {
            const sel = Swal.getPopup().querySelector('#swal-slot');
            const slotId = sel.value;
            if (!slotId) { Swal.showValidationMessage('Please select a slot'); return false; }

            // Client-side deadline check
            const opt = sel.options[sel.selectedIndex];
            const slotDate = opt.dataset.date;   // "YYYY-MM-DD"
            const slotEnd  = opt.dataset.end;    // "HH:MM AM/PM"
            const now = new Date();
            const todayStr = now.getFullYear() + '-'
              + String(now.getMonth() + 1).padStart(2, '0') + '-'
              + String(now.getDate()).padStart(2, '0');

            if (slotDate === todayStr && slotEnd) {
              // Parse "HH:MM AM/PM" into 24-hr minutes
              const parts = slotEnd.match(/(\d+):(\d+)\s*(AM|PM)/i);
              if (parts) {
                let h = parseInt(parts[1], 10);
                const m = parseInt(parts[2], 10);
                const ampm = parts[3].toUpperCase();
                if (ampm === 'PM' && h !== 12) h += 12;
                if (ampm === 'AM' && h === 12) h = 0;
                const endMins = h * 60 + m;
                const nowMins = now.getHours() * 60 + now.getMinutes();
                if (nowMins >= endMins) {
                  Swal.showValidationMessage('This time slot is no longer available. The booking window has passed.');
                  return false;
                }
              }
            }

            return { slot_id: slotId };
          }
        }).then(result => {
          if (!result.isConfirmed) return;

          $.ajax({
            url: `/core/book/${counselorId}/`,
            type: 'POST',
            data: {
              'slot_id': result.value.slot_id,
              'csrfmiddlewaretoken': getCsrf()
            },
            success: function () {
              Swal.fire('Booked!', 'Your session has been scheduled.', 'success');
            },
            error: function (xhr) {
              const msg = xhr.responseJSON?.error || 'Something went wrong. Please try again.';
              Swal.fire('Error', msg, 'error');
            }
          });
        });
      });
    });
  }

  /* ── Reviews List Modal ── */
  window._openReviewsModal = async function (counselorId, counselorName) {
    document.getElementById('reviewsModalTitle').textContent = `Reviews for ${counselorName}`;
    document.getElementById('reviewsModalBody').innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';
    document.getElementById('reviewsModalOverlay').style.display = 'flex';

    try {
      const resp = await fetch(`/core/api/counselor/${counselorId}/reviews/`);
      const data = await resp.json();
      const body = document.getElementById('reviewsModalBody');

      if (data.reviews.length === 0) {
        body.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No reviews yet.</p>';
        return;
      }

      let html = '<div class="reviews-list">';
      data.reviews.forEach(r => {
        html += `
          <div class="review-item">
            <div class="review-header">
              <span class="review-user"><i class="fa-solid fa-user-secret"></i> ${r.user_label}</span>
              <span class="review-date">${r.created_at}</span>
            </div>
            <div class="review-stars">${renderStars(r.rating, 14)}</div>
            <p class="review-msg">${r.message}</p>
          </div>`;
      });
      html += '</div>';
      body.innerHTML = html;

    } catch (err) {
      document.getElementById('reviewsModalBody').innerHTML = '<p style="color:#f56565;">Failed to load reviews.</p>';
    }
  };

  document.getElementById('reviewsModalClose').addEventListener('click', () => {
    document.getElementById('reviewsModalOverlay').style.display = 'none';
  });
  document.getElementById('reviewsModalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('reviewsModalOverlay').style.display = 'none';
    }
  });

  /* ── Featured Review Modal ── */
  window._openFeaturedModal = async function (reviewId) {
    document.getElementById('featuredModalBody').innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';
    document.getElementById('featuredModalOverlay').style.display = 'flex';

    try {
      const resp = await fetch(`/core/api/review/${reviewId}/`);
      const data = await resp.json();

      document.getElementById('featuredModalBody').innerHTML = `
        <div class="featured-detail">
          <div class="featured-detail-stars">${renderStars(data.rating, 28)}</div>
          <p class="featured-detail-msg">${data.message}</p>
          <span class="featured-detail-date">${data.created_at}</span>
        </div>`;
    } catch (err) {
      document.getElementById('featuredModalBody').innerHTML = '<p style="color:#f56565;">Failed to load review.</p>';
    }
  };

  document.getElementById('featuredModalClose').addEventListener('click', () => {
    document.getElementById('featuredModalOverlay').style.display = 'none';
  });
  document.getElementById('featuredModalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('featuredModalOverlay').style.display = 'none';
    }
  });

  /* ── Other Mild Concerns Modal ── */
  window._openOtherConcernsModal = function (text) {
    document.getElementById('otherConcernsModalBody').textContent = text;
    document.getElementById('otherConcernsModalOverlay').style.display = 'flex';
  };

  document.getElementById('otherConcernsModalClose').addEventListener('click', () => {
    document.getElementById('otherConcernsModalOverlay').style.display = 'none';
  });
  document.getElementById('otherConcernsModalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('otherConcernsModalOverlay').style.display = 'none';
    }
  });

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', () => {
    loadCounselors(true);
    setupInfiniteScroll();
  });
})();
