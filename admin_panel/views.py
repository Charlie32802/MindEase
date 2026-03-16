import requests
from django.http import JsonResponse
from django.conf import settings
from django.views.decorators.http import require_http_methods
from django.contrib.admin.views.decorators import staff_member_required
import logging
from django.core.cache import cache
import re

logger = logging.getLogger(__name__)

@staff_member_required
@require_http_methods(["GET"])

def get_philippines_news(request):
    """
    Fetch Philippines news from various sources
    Requires staff member authentication
    """
    # Check cache first (cache for 15 minutes)
    cache_key = 'philippines_news'
    cached_news = cache.get(cache_key)
    
    if cached_news:
        return JsonResponse({'success': True, 'articles': cached_news})
    
    try:
        news_articles = []
        
        # Method 1: Try NewsAPI (requires API key in settings)
        if hasattr(settings, 'NEWS_API_KEY') and settings.NEWS_API_KEY:
            news_articles = fetch_from_newsapi()
        
        # Method 2: Fallback to RSS feeds if NewsAPI fails
        if not news_articles:
            news_articles = fetch_from_rss_feeds()
        
        # Method 3: Last fallback to GNews API (free tier)
        if not news_articles:
            news_articles = fetch_from_gnews()
        
        if news_articles:
            # Cache for 15 minutes
            cache.set(cache_key, news_articles, 60 * 15)
            return JsonResponse({'success': True, 'articles': news_articles})
        else:
            return JsonResponse({
                'success': False, 
                'error': 'No news articles found'
            })
            
    except Exception as e:
        logger.error(f"Error fetching news: {str(e)}")
        return JsonResponse({
            'success': False, 
            'error': 'Failed to fetch news'
        })

def fetch_from_newsapi():
    """Fetch news from NewsAPI.org"""
    try:
        api_key = getattr(settings, 'NEWS_API_KEY', '')
        if not api_key:
            return []
            
        url = "https://newsapi.org/v2/everything"
        params = {
            'q': 'Philippines',
            'language': 'en',
            'sortBy': 'publishedAt',
            'pageSize': 10,
            'apiKey': api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        articles = []
        
        for article in data.get('articles', []):
            if (article.get('title') and 
                article.get('description') and 
                '[Removed]' not in article.get('title', '')):
                
                articles.append({
                    'title': article['title'][:150],
                    'description': clean_description(article['description']),
                    'url': article['url'],
                    'urlToImage': article.get('urlToImage') or get_placeholder_image(),
                    'publishedAt': article['publishedAt'],
                    'source': {'name': article['source']['name']}
                })
        
        return articles[:8]  # Limit to 8 articles
        
    except Exception as e:
        logger.error(f"NewsAPI fetch error: {str(e)}")
        return []

def fetch_from_rss_feeds():
    """Fetch news from RSS feeds using RSS2JSON service"""
    try:
        rss_feeds = [
            'https://www.philstar.com/rss/headlines',
            'https://www.rappler.com/rss/nation',
            'https://cnnphilippines.com/cnn-rss.xml'
        ]
        
        all_articles = []
        
        for feed_url in rss_feeds:
            try:
                rss2json_url = "https://api.rss2json.com/v1/api.json"
                params = {
                    'rss_url': feed_url,
                    'count': 5,
                    'api_key': getattr(settings, 'RSS2JSON_API_KEY', '')
                }
                
                response = requests.get(rss2json_url, params=params, timeout=10)
                response.raise_for_status()
                
                data = response.json()
                
                for item in data.get('items', []):
                    if item.get('title') and item.get('description'):
                        all_articles.append({
                            'title': item['title'][:150],
                            'description': clean_description(item['description']),
                            'url': item['link'],
                            'urlToImage': extract_image_from_content(item.get('content', '')) or get_placeholder_image(),
                            'publishedAt': item['pubDate'],
                            'source': {'name': extract_source_name(feed_url)}
                        })
                        
            except Exception as e:
                logger.error(f"RSS feed error for {feed_url}: {str(e)}")
                continue
        
        # Sort by published date and return latest
        all_articles.sort(key=lambda x: x['publishedAt'], reverse=True)
        return all_articles[:8]
        
    except Exception as e:
        logger.error(f"RSS feeds fetch error: {str(e)}")
        return []

def fetch_from_gnews():
    """Fetch news from GNews API (free tier)"""
    try:
        url = "https://gnews.io/api/v4/search"
        params = {
            'q': 'Philippines',
            'lang': 'en',
            'country': 'ph',
            'max': 8,
            'apikey': getattr(settings, 'GNEWS_API_KEY', '')
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        articles = []
        
        for article in data.get('articles', []):
            if article.get('title') and article.get('description'):
                articles.append({
                    'title': article['title'][:150],
                    'description': clean_description(article['description']),
                    'url': article['url'],
                    'urlToImage': article.get('image') or get_placeholder_image(),
                    'publishedAt': article['publishedAt'],
                    'source': {'name': article['source']['name']}
                })
        
        return articles
        
    except Exception as e:
        logger.error(f"GNews fetch error: {str(e)}")
        return []

def clean_description(description):
    """Clean and truncate description"""
    # Remove HTML tags
    clean_desc = re.sub(r'<[^>]*>', '', str(description))
    # Truncate to 150 characters
    if len(clean_desc) > 150:
        clean_desc = clean_desc[:147] + '...'
    return clean_desc

def extract_image_from_content(content):
    """Extract image URL from content"""
    img_pattern = r'<img[^>]+src=["\']([^"\']+)["\']'
    match = re.search(img_pattern, str(content))
    return match.group(1) if match else None

def extract_source_name(feed_url):
    """Extract source name from RSS feed URL"""
    if 'philstar' in feed_url:
        return 'Philippine Star'
    elif 'rappler' in feed_url:
        return 'Rappler'
    elif 'cnn' in feed_url:
        return 'CNN Philippines'
    else:
        return 'Philippine News'

def get_placeholder_image():
    """Return placeholder image URL"""
    return 'https://via.placeholder.com/300x200/667eea/ffffff?text=Philippines+News'