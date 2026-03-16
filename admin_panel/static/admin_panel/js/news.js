// admin_panel/static/admin_panel/js/news.js

// Global variables
let newsData = [];
let currentNewsIndex = 0;
let newsInterval;

// Fetch news from Django API endpoint
async function fetchPhilippinesNews() {
    try {
        const response = await fetch('/admin-panel/api/news/', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch news');
        }
        
        const data = await response.json();
        
        if (data.success && data.articles && data.articles.length > 0) {
            newsData = data.articles;
            displayNews();
            startNewsCarousel();
        } else {
            throw new Error(data.error || 'No news articles found');
        }
        
    } catch (error) {
        console.error('Error fetching news:', error);
        showNewsError();
    }
}

// Display current news item
function displayNews() {
    const newsCarousel = document.querySelector('.news-carousel');
    const newsDots = document.querySelector('.news-dots');
    
    if (newsData.length === 0) {
        showNewsError();
        return;
    }
    
    const currentNews = newsData[currentNewsIndex];
    const publishedDate = new Date(currentNews.publishedAt).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    newsCarousel.innerHTML = `
        <div class="news-item active">
            <div class="news-image-container">
                <img src="${currentNews.urlToImage}" alt="News Image" onerror="this.src='https://via.placeholder.com/300x200?text=News'">
                <div class="news-overlay">
                    <span class="news-source">${currentNews.source.name}</span>
                </div>
            </div>
            <div class="news-content">
                <h4 class="news-title">${currentNews.title}</h4>
                <p class="news-description">${currentNews.description}</p>
                <div class="news-meta">
                    <span class="news-date">${publishedDate}</span>
                    <a href="${currentNews.url}" target="_blank" class="read-more">Read More →</a>
                </div>
            </div>
        </div>
    `;
    
    // Update dots navigation
    newsDots.innerHTML = newsData.map((_, index) => 
        `<span class="dot ${index === currentNewsIndex ? 'active' : ''}" onclick="goToNews(${index})"></span>`
    ).join('');
}

// Navigation functions
function changeNews(direction) {
    currentNewsIndex += direction;
    if (currentNewsIndex >= newsData.length) currentNewsIndex = 0;
    if (currentNewsIndex < 0) currentNewsIndex = newsData.length - 1;
    displayNews();
}

function goToNews(index) {
    currentNewsIndex = index;
    displayNews();
}

// Start auto-carousel
function startNewsCarousel() {
    if (newsInterval) clearInterval(newsInterval);
    
    newsInterval = setInterval(() => {
        changeNews(1);
    }, 10000); // 10 seconds
}

// Show error state
function showNewsError() {
    const newsCarousel = document.querySelector('.news-carousel');
    newsCarousel.innerHTML = `
        <div class="news-error">
            <div class="error-icon">📰</div>
            <p>Unable to load news</p>
            <button onclick="fetchPhilippinesNews()" class="retry-btn">Retry</button>
        </div>
    `;
}

// Initialize news when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for pause on hover
    const newsCarousel = document.querySelector('.news-carousel');
    if (newsCarousel) {
        newsCarousel.addEventListener('mouseenter', () => {
            if (newsInterval) clearInterval(newsInterval);
        });

        newsCarousel.addEventListener('mouseleave', () => {
            startNewsCarousel();
        });
    }
    
    // Fetch news
    fetchPhilippinesNews();
});

// Make functions available globally for onclick attributes
window.changeNews = changeNews;
window.goToNews = goToNews;
window.fetchPhilippinesNews = fetchPhilippinesNews;