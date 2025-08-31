import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, Plus, Check, TrendingUp } from 'lucide-react';
import { IndexCard } from './components/IndexCard';
import { PerformanceChart } from './components/PerformanceChart';
import { StatsCard } from './components/StatsCard';
import { BreakdownTable } from './components/BreakdownTable';
import { SectorBreakdown } from './components/SectorBreakdown';
import { MarketNews } from './components/MarketNews';
import { RollingReturnsPage } from './pages/RollingReturnsPage';
import { IndexComparison } from './pages/IndexComparison';
import { ProfilePage } from './pages/ProfilePage';
import { apiService } from './services/api';

// Define interfaces for our data structure
interface IndexDetails {
  prevClose: string;
  open: string;
  dayHigh: string;
  dayLow: string;
  yearlyHigh: string;
  yearlyLow: string;
  weeklyChange: string;
  monthlyChange: string;
}

interface IndexInfo {
  symbol: string;
  value: string;
  percentage: string;
  change: number;
  details: IndexDetails;
}

interface IndexDataType {
  [key: string]: IndexInfo;
}

// Define the CSS for animations
const animationStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-out;
}

@keyframes shimmer {
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
  25% { box-shadow: 0 0 10px 3px rgba(255, 255, 255, 0.2); }
  50% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
  75% { box-shadow: 0 0 10px 3px rgba(255, 255, 255, 0.2); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}

.animate-shimmer {
  animation: shimmer 8s infinite;
}
`;

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'data' | 'comparison' | 'profile'>('dashboard');

  // Fallback index data
  const fallbackIndexData: IndexDataType = {
    'NIFTY 50': {
      symbol: 'NIFTY',
      value: '22,147.50',
      percentage: '35.20%',
      change: 1.2,
      details: {
        prevClose: '21,828.30',
        open: '21,950.75',
        dayHigh: '22,215.80',
        dayLow: '21,900.10',
        yearlyHigh: '22,775.70',
        yearlyLow: '19,254.30',
        weeklyChange: '+1.45%',
        monthlyChange: '+3.28%'
      }
    },
    'Bank NIFTY': {
      symbol: 'BANKNIFTY',
      value: '46,592.75',
      percentage: '25.15%',
      change: -0.5,
      details: {
        prevClose: '46,825.10',
        open: '46,750.25',
        dayHigh: '46,992.80',
        dayLow: '46,325.40',
        yearlyHigh: '48,852.50',
        yearlyLow: '42,315.70',
        weeklyChange: '-0.38%',
        monthlyChange: '+1.74%'
      }
    },
    'NIFTY IT': {
      symbol: 'NIFTYIT',
      value: '33,845.60',
      percentage: '15.33%',
      change: 2.1,
      details: {
        prevClose: '33,245.20',
        open: '33,320.75',
        dayHigh: '33,900.40',
        dayLow: '33,200.10',
        yearlyHigh: '34,512.80',
        yearlyLow: '28,280.30',
        weeklyChange: '+2.35%',
        monthlyChange: '+5.42%'
      }
    },
    'NIFTY Auto': {
      symbol: 'NIFTYAUTO',
      value: '18,956.30',
      percentage: '12.45%',
      change: 0.8,
      details: {
        prevClose: '18,825.40',
        open: '18,850.25',
        dayHigh: '19,020.10',
        dayLow: '18,810.30',
        yearlyHigh: '19,650.70',
        yearlyLow: '16,952.30',
        weeklyChange: '+0.98%',
        monthlyChange: '+2.12%'
      }
    },
    'NIFTY Pharma': {
      symbol: 'NIFTYPHARMA',
      value: '15,678.90',
      percentage: '6.87%',
      change: -0.3,
      details: {
        prevClose: '15,720.50',
        open: '15,715.25',
        dayHigh: '15,780.40',
        dayLow: '15,620.10',
        yearlyHigh: '16,230.70',
        yearlyLow: '14,280.50',
        weeklyChange: '-0.28%',
        monthlyChange: '+1.05%'
      }
    },
    'NIFTY FMCG': {
      symbol: 'NIFTYFMCG',
      value: '52,345.80',
      percentage: '5.00%',
      change: 0.4,
      details: {
        prevClose: '52,215.30',
        open: '52,250.75',
        dayHigh: '52,420.10',
        dayLow: '52,150.40',
        yearlyHigh: '53,780.60',
        yearlyLow: '48,210.30',
        weeklyChange: '+0.42%',
        monthlyChange: '+1.18%'
      }
    }
  };

  // Fallback market sentiment
  const fallbackSentiment = {
    avgChange: '1.2',
    topPerformer: {
      name: 'NIFTY IT',
      change: '2.1%'
    },
    marketSentiment: 'Moderately Bullish',
    sentimentLevel: 4,
    recentTrend: 'Upward'
  };

  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [timePeriod, setTimePeriod] = useState<30 | 60 | 90>(30);
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null);
  const [liveIndexData, setLiveIndexData] = useState<IndexDataType>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [marketSentiment, setMarketSentiment] = useState<any>(fallbackSentiment);
  const [selectedIndexTimeSeries, setSelectedIndexTimeSeries] = useState<any[]>([]);
  const timeDropdownRef = useRef<HTMLDivElement>(null);
  const [inceptionDates, setInceptionDates] = useState<Record<string, string>>({});

  // Fetch real-time market data
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoading(true);
        const response = await apiService.getMarketIndices();
        const data = response.indices;
        const sentiment = response.sentiment;

        const updatedIndexData: IndexDataType = {};
        
        data.forEach((index: any) => {
          const name = index.name;
          const changeValue = parseFloat(index.change.replace('%', ''));
          
          updatedIndexData[name] = {
            symbol: index.symbol,
            value: index.value,
            percentage: index.allocation,
            change: changeValue,
            details: index.details || fallbackIndexData[name]?.details
          };
        });
        
        setLiveIndexData(updatedIndexData);
        setMarketSentiment(sentiment || fallbackSentiment);
      } catch (error) {
        console.error('Failed to fetch market indices for allocation cards:', error);
        // Fallback to default data if API fails
        setLiveIndexData(fallbackIndexData);
        setMarketSentiment(fallbackSentiment);
      } finally {
        setLoading(false);
      }
    };

    const fetchData = async () => {
      try {
        fetchMarketData();
        
        // Fetch inception dates for all indices
        const dates = await apiService.getInceptionDates();
        setInceptionDates(dates);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
    
    // Refresh data every 5 minutes
    const intervalId = setInterval(fetchData, 300000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const handleIndexCardClick = (name: string) => {
    if (selectedIndex === name) {
      setSelectedIndex(null); // Deselect if already selected
      // Reset to portfolio chart when deselecting
      setSelectedIndexTimeSeries([]);
    } else {
      setSelectedIndex(name); // Select the new card
      // Generate time series data for the selected index
      generateIndexTimeSeries(name);
    }
  };

  // Use either live data or fallback
  const indexData = Object.keys(liveIndexData).length > 0 ? liveIndexData : fallbackIndexData;

  // Calculate portfolio value and change from allocation data
  const calculatePortfolioValue = () => {
    let totalValue = 0;
    let previousTotalValue = 0;
    
    // Calculate current value from percentages and values
    Object.entries(indexData).forEach(([name, data]) => {
      const value = parseFloat(data.value.replace(/,/g, ''));
      const percentage = parseFloat(data.percentage) / 100;
      const allocation = value * percentage;
      totalValue += allocation;
      
      // Calculate previous value based on change percentage
      const prevValue = value / (1 + (data.change / 100));
      const prevAllocation = prevValue * percentage;
      previousTotalValue += prevAllocation;
    });
    
    // Calculate change
    const change = totalValue - previousTotalValue;
    const changePercentage = (change / previousTotalValue) * 100;
    
    return {
      totalValue: totalValue.toFixed(2),
      change: change.toFixed(2),
      changePercentage: changePercentage.toFixed(2)
    };
  };
  
  // Generate historical portfolio data based on the allocation
  const generatePortfolioTimeSeries = () => {
    const data = [];
    const currentValue = parseFloat(calculatePortfolioValue().totalValue);
    
    // Generate dates going back from today based on the selected time period
    const today = new Date();
    
    // Map out a value for each day with small variations based on the indexes' performance
    for (let i = timePeriod; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      // Format date as "yyyy-MM-dd" (ISO format)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Use a simple function to generate historical values with some randomness
      // but following the trend of the overall change
      let factor = 0;
      Object.entries(indexData).forEach(([name, data]) => {
        const percentage = parseFloat(data.percentage) / 100;
        factor += data.change * percentage;
      });
      
      // Create a scaling factor with some randomness
      const dayProgress = (timePeriod - i) / timePeriod;
      const randomFactor = 0.92 + (Math.random() * 0.16); // Between 0.92 and 1.08
      const scalingFactor = 1 + ((factor / 100) * dayProgress * randomFactor);
      
      // Calculate the simulated value for this date
      const baseValue = currentValue / scalingFactor;
      const value = Math.round(baseValue * 100) / 100;
      
      data.push({ date: dateStr, value });
    }
    
    return data;
  };

  // Generate historical index data for a specific index
  const generateIndexTimeSeries = (indexName: string) => {
    const data = [];
    const indexInfo = indexData[indexName];
    if (!indexInfo) return;
    
    const currentValue = parseFloat(indexInfo.value.replace(/,/g, ''));
    const indexChange = indexInfo.change;
    
    // Generate dates going back from today based on the selected time period
    const today = new Date();
    
    // Map out a value for each day with variations based on the index performance
    for (let i = timePeriod; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      // Format date as "yyyy-MM-dd" (ISO format)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Create a scaling factor with some randomness
      const dayProgress = (timePeriod - i) / timePeriod;
      const randomFactor = 0.92 + (Math.random() * 0.16); // Between 0.92 and 1.08
      const scalingFactor = 1 + ((indexChange / 100) * dayProgress * randomFactor);
      
      // Calculate the simulated value for this date
      const baseValue = currentValue / scalingFactor;
      const value = Math.round(baseValue * 100) / 100;
      
      data.push({ date: dateStr, value });
    }
    
    setSelectedIndexTimeSeries(data);
  };

  // Get portfolio data
  const portfolioData = calculatePortfolioValue();
  const portfolioTimeSeries = generatePortfolioTimeSeries();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setIsTimeDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen glass-gradient-bg">
      {/* Add animation styles */}
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      
      {/* Navigation */}
      <nav className="border-b glassmorphic-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="h-8 w-8 mr-3 flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-blue-500 to-green-400">
                  <img 
                    src="https://media.licdn.com/dms/image/v2/C510BAQGdntjcMCCqFA/company-logo_200_200/company-logo_200_200/0/1630621298716/circle_wealth_advisors_logo?e=2147483647&v=beta&t=pEg6_Yyii3QNmM-vLx0SKFOvf2GWd9Jq1r74TBHgleo" 
                    alt="Circle Wealth Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <h1 
                  className="text-xl font-bold cursor-pointer text-gray-800"
                  onClick={() => setCurrentPage('dashboard')}
                >
                  Circle Wealth
                </h1>
              </div>
              <div className="ml-10 flex space-x-4">
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    currentPage === 'dashboard'
                      ? 'border-b-2 border-indigo-500 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentPage('data')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    currentPage === 'data'
                      ? 'border-b-2 border-indigo-500 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Data
                </button>
                <button
                  onClick={() => setCurrentPage('comparison')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    currentPage === 'comparison'
                      ? 'border-b-2 border-indigo-500 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Rolling Returns
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Bell size={20} className="text-gray-600" />
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setCurrentPage('profile')}>
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  N
                </div>
                <span className="text-sm font-medium">Saurabh</span>
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {currentPage === 'dashboard' ? (
        /* Main Content - Dashboard */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-4xl font-light text-gray-700 mb-8">Dashboard </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-8">
              <div className="glassmorphic-card p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-sm text-gray-500">
                      {selectedIndex ? `${selectedIndex} Value` : 'Index Allocation Value'}
                    </h3>
                    <div className="flex items-baseline space-x-2">
                      {selectedIndex ? (
                        <>
                          <span className="text-3xl font-bold">₹{indexData[selectedIndex].value}</span>
                          <span className={`bg-${indexData[selectedIndex].change >= 0 ? 'green' : 'red'}-100 text-${indexData[selectedIndex].change >= 0 ? 'green' : 'red'}-800 px-2 py-0.5 rounded text-sm`}>
                            {indexData[selectedIndex].change >= 0 ? '↑' : '↓'}
                            {Math.abs(indexData[selectedIndex].change).toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">₹{portfolioData.totalValue}</span>
                          <span className={`bg-${parseFloat(portfolioData.changePercentage) >= 0 ? 'green' : 'red'}-100 text-${parseFloat(portfolioData.changePercentage) >= 0 ? 'green' : 'red'}-800 px-2 py-0.5 rounded text-sm`}>
                            {parseFloat(portfolioData.changePercentage) >= 0 ? '↑' : '↓'}
                            {Math.abs(parseFloat(portfolioData.changePercentage)).toFixed(1)}%
                          </span>
                          <span className={`text-${parseFloat(portfolioData.change) >= 0 ? 'green' : 'red'}-600`}>
                            {parseFloat(portfolioData.change) >= 0 ? '+' : ''}₹{portfolioData.change}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-sm mt-1">
                      {selectedIndex ? `${indexData[selectedIndex].symbol} Index` : 'Based on selected index percentages'}
                    </p>
                  </div>
                  <div className="relative" ref={timeDropdownRef}>
                    <button
                      onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                      className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 glassmorphic-light px-3 py-1 rounded-md"
                    >
                      <span>{timePeriod} Days</span>
                      <ChevronDown size={16} />
                    </button>
                    {isTimeDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-40 glassmorphic-light rounded-md shadow-lg z-10">
                        <div className="py-1">
                          {[30, 60, 90].map((period) => (
                            <button
                              key={period}
                              className={`block px-4 py-2 text-sm w-full text-left ${
                                timePeriod === period
                                  ? 'bg-indigo-50 text-indigo-600'
                                  : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                              }`}
                              onClick={() => {
                                setTimePeriod(period as 30 | 60 | 90);
                                setIsTimeDropdownOpen(false);
                                // Regenerate chart data when time period changes
                                if (selectedIndex) {
                                  generateIndexTimeSeries(selectedIndex);
                                }
                              }}
                            >
                              {period} Days
                              {timePeriod === period && (
                                <Check className="inline ml-2" size={16} />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {selectedIndex && selectedIndexTimeSeries.length > 0 ? (
                  <PerformanceChart data={selectedIndexTimeSeries} />
                ) : (
                  <PerformanceChart data={portfolioTimeSeries} />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                  title="Market Sentiment"
                  value={marketSentiment?.marketSentiment || 'Neutral'}
                  changeType={marketSentiment?.sentimentLevel > 3 ? 'increase' : marketSentiment?.sentimentLevel < 3 ? 'decrease' : 'neutral'}
                  subtitle="Based on technical indicators"
                  className="glassmorphic-card"
                />
                <StatsCard
                  title="Average Change"
                  value={`${marketSentiment?.avgChange || '0.0'}%`}
                  changeType={parseFloat(marketSentiment?.avgChange || '0') > 0 ? 'increase' : parseFloat(marketSentiment?.avgChange || '0') < 0 ? 'decrease' : 'neutral'}
                  subtitle="All selected indices"
                  className="glassmorphic-card"
                />
                <StatsCard
                  title="Top Performer"
                  value={marketSentiment?.topPerformer?.name || 'NIFTY IT'}
                  info={`+${marketSentiment?.topPerformer?.change || '0.0'}`}
                  subtitle="Last trading day"
                  className="glassmorphic-card"
                />
              </div>

              {/* Replace hardcoded news with MarketNews component */}
              <MarketNews />
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">Allocation</h3>
                {loading ? (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {[...Array(6)].map((_, index) => (
                      <div key={index} className="glassmorphic-card p-4 animate-pulse h-24">
                        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="flex justify-between">
                          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-6 bg-gray-200 rounded w-1/6"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {Object.entries(indexData).map(([name, data]) => (
                      <IndexCard
                        key={name}
                        name={name}
                        symbol={data.symbol}
                        value={data.value}
                        percentage={data.percentage}
                        color="glassmorphic-card"
                        isSelected={selectedIndex === name}
                        onClick={() => handleIndexCardClick(name)}
                        change={data.change}
                        inceptionDate={inceptionDates[name]}
                      />
                    ))}
                  </div>
                )}
                
                {/* Details panel - only shown when an index is selected */}
                {selectedIndex && indexData[selectedIndex] && (
                  <div className="glassmorphic-card p-5 border border-indigo-100 animate-fadeIn">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className="text-lg font-semibold">{selectedIndex}</h4>
                        <p className="text-gray-500">{indexData[selectedIndex].symbol}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          indexData[selectedIndex].change >= 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {indexData[selectedIndex].change >= 0 ? '+' : ''}{indexData[selectedIndex].change}%
                        </div>
                        <button 
                          onClick={() => setSelectedIndex(null)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                          title="Close details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Previous Close</p>
                        <p className="font-medium">₹{indexData[selectedIndex].details.prevClose}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Open</p>
                        <p className="font-medium">₹{indexData[selectedIndex].details.open}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Day High</p>
                        <p className="font-medium">₹{indexData[selectedIndex].details.dayHigh}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Day Low</p>
                        <p className="font-medium">₹{indexData[selectedIndex].details.dayLow}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">52W High</p>
                        <p className="font-medium">₹{indexData[selectedIndex].details.yearlyHigh}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">52W Low</p>
                        <p className="font-medium">₹{indexData[selectedIndex].details.yearlyLow}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">1M Change</p>
                        <p className={`font-medium ${
                          indexData[selectedIndex].details.monthlyChange.startsWith('+') 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {indexData[selectedIndex].details.monthlyChange}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button 
                        className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-md text-sm font-medium hover:bg-indigo-100 transition-colors"
                        onClick={() => setCurrentPage('comparison')}
                      >
                        View Rolling Returns
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Add Sector Breakdown component */}
                {selectedIndex && (
                  <SectorBreakdown selectedIndex={selectedIndex} />
                )}
              </div>
            </div>
          </div>
        </main>
      ) : currentPage === 'data' ? (
        <RollingReturnsPage />
      ) : currentPage === 'comparison' ? (
        <IndexComparison />
      ) : (
        <ProfilePage />
      )}
    </div>
  );
}

export default App;