import React, { useState, useEffect } from 'react';
import { apiService, type NewsItem } from '../services/api';
import { RefreshCw } from 'lucide-react';

export const MarketNews: React.FC = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [newUpdate, setNewUpdate] = useState<boolean>(false);

  // Mock news data to use if API fails
  const mockNews: NewsItem[] = [
    {
      title: 'Sensex jumps 650 points, Nifty above 22,300 as markets rebound',
      timeAgo: '20 minutes ago',
      category: 'Market Update',
      categoryColor: 'green',
      link: 'https://www.moneycontrol.com/news/business/markets/stock-market-today-live-updates-11'
    },
    {
      title: 'RBI keeps repo rate unchanged at 6.5%, maintains stance on withdrawal of accommodation',
      timeAgo: '1 hour ago',
      category: 'Economic Policy',
      categoryColor: 'blue',
      link: 'https://www.livemint.com/economy/rbi-monetary-policy-repo-rate-unchanged'
    },
    {
      title: 'IT stocks gain on positive Q4 results; TCS, Infosys lead rally',
      timeAgo: '3 hours ago',
      category: 'Sector News',
      categoryColor: 'purple',
      link: 'https://economictimes.indiatimes.com/markets/stocks/it-stocks-rally'
    },
    {
      title: 'Gold prices hit new record high amid global economic uncertainty',
      timeAgo: '5 hours ago',
      category: 'Commodities',
      categoryColor: 'yellow',
      link: 'https://www.business-standard.com/finance/news/gold-prices-hit-new-record'
    },
    {
      title: 'FII flows into Indian equities highest in 6 months, shows data',
      timeAgo: '8 hours ago',
      category: 'Foreign Investment',
      categoryColor: 'indigo',
      link: 'https://www.financialexpress.com/market/fii-dii-data-foreign-investors'
    }
  ];

  const fetchNews = async () => {
    try {
      setRefreshing(true);
      const news = await apiService.getMarketNews(5);
      
      // If API returns empty array, use mock data
      const newsData = news.length > 0 ? news : mockNews;
      
      // Check if we have new news items
      if (newsItems.length > 0) {
        const hasNewNews = newsData.some(item => 
          !newsItems.find(existing => 
            existing.title === item.title && existing.timeAgo === item.timeAgo
          )
        );
        
        if (hasNewNews) {
          setNewUpdate(true);
          // Auto-hide the indicator after 3 seconds
          setTimeout(() => setNewUpdate(false), 3000);
        }
      }
      
      setNewsItems(newsData);
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error('Error fetching news:', error);
      setNewsItems(mockNews); // Use mock data on error
      setError('Using sample news data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNews();
    
    // Auto-refresh news every 30 seconds
    const intervalId = setInterval(() => {
      fetchNews();
    }, 30 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Format time since last update
  const getTimeSinceUpdate = (): string => {
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec} sec ago`;
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  };

  // Handle manual refresh
  const handleRefresh = () => {
    if (!refreshing) {
      fetchNews();
    }
  };

  if (loading && newsItems.length === 0) {
    return (
      <div className="glassmorphic-card p-6 border-glass animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="mb-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`glassmorphic-card p-6 border-glass ${newUpdate ? 'border-green-300 border-2 animate-pulse' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-shadow-sm">
          Latest Market News
          {newUpdate && (
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
              New!
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-red-100 bg-opacity-50 backdrop-blur-sm text-red-600 px-2 py-1 rounded-full animate-pulse">Live</span>
          <button 
            onClick={handleRefresh} 
            className={`text-gray-500 hover:text-indigo-600 transition-all duration-300 ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
            title="Refresh news"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      {error ? (
        <div className="text-center text-yellow-500 py-1 mb-2 text-xs">
          {error}
        </div>
      ) : null}
      
      <div className="space-y-4">
        {newsItems.map((item, index) => (
          <a 
            key={`${item.title}-${index}`}
            href={item.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`block border-l-4 border-${item.categoryColor}-500 glassmorphic-light pl-4 py-2 rounded-r-md hover:translate-x-1 transition-all duration-300 backdrop-blur-sm hover:backdrop-blur-md ${index === 0 && newUpdate ? 'bg-green-50 bg-opacity-20' : ''}`}
          >
            <p className="text-sm font-medium text-shadow-sm">{item.title}</p>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">{item.timeAgo}</span>
              <span className={`text-xs text-${item.categoryColor}-600 bg-${item.categoryColor}-50 bg-opacity-30 px-2 rounded-full`}>{item.category}</span>
            </div>
          </a>
        ))}
        <a 
          href="https://www.moneycontrol.com/news/business/markets/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block text-sm text-indigo-600 hover:text-indigo-800 text-center mt-2 hover:underline transition-all duration-200"
        >
          View all news →
        </a>
      </div>
      
      <div className="text-xs text-gray-500 mt-4 text-right">
        Last updated: {getTimeSinceUpdate()}
      </div>
    </div>
  );
}; 