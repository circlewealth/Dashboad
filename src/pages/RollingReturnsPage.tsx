import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Area, AreaChart, ReferenceLine
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Info, TrendingUp, Search, Filter, Calendar } from 'lucide-react';
import { indexDataService, type IndexReturn, type IndexStats, type HistoricalDataPoint } from '../services/indexData';
import { formatChartDate } from '../utils/dateUtils';
import { apiService } from '../services/api';

// Date formatting function to use Month YY format (e.g., Apr 23)
const formatToMonthYY = (dateStr: string): string => {
  if (!dateStr) return '';
  
  try {
    // Handle MM/DD/YYYY format
    const mmddyyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateStr.match(mmddyyyyPattern);
    if (match) {
      const month = parseInt(match[1], 10);
      const year = parseInt(match[3], 10) % 100; // Get last 2 digits of year
      
      // Convert month number to abbreviation
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthAbbr = monthNames[month - 1];
      
      return `${monthAbbr} ${String(year).padStart(2, '0')}`;
    }
    
    // Handle ISO format
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = String(date.getFullYear() % 100).padStart(2, '0');
      const monthAbbr = date.toLocaleString('en-US', { month: 'short' });
      
      return `${monthAbbr} ${year}`;
    }
    
    return dateStr;
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateStr;
  }
};

export const RollingReturnsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');
  const [selectedIndex, setSelectedIndex] = useState('NIFTY 50');
  const [indices, setIndices] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [returns, setReturns] = useState<Record<string, number>>({});
  const [selectedIndexData, setSelectedIndexData] = useState<IndexReturn | null>(null);
  const [stats, setStats] = useState<IndexStats>({
    averageReturn: 0,
    standardDeviation: 0,
    sharpeRatio: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showPositiveOnly, setShowPositiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inceptionDates, setInceptionDates] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load initial data
    const loadData = async () => {
      try {
        setLoading(true);
        const allIndices = indexDataService.getAllIndices();
        const allPeriods = indexDataService.getPeriods();
        setIndices(allIndices);
        setPeriods(allPeriods);
        
        const periodReturns = await indexDataService.getAllReturnsForPeriod(selectedPeriod);
        setReturns(periodReturns);
        
        // Fetch inception dates
        const dates = await apiService.getInceptionDates();
        setInceptionDates(dates);
        
        // Make sure we have data for NIFTY 50 or use the first available index
        const defaultIndex = allIndices.includes('NIFTY 50') ? 'NIFTY 50' : (allIndices[0] || '');
        if (defaultIndex) {
          setSelectedIndex(defaultIndex);
          updateSelectedIndexData(defaultIndex);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    // Update returns when period changes
    const updateReturns = async () => {
      try {
        setLoading(true);
        const periodReturns = await indexDataService.getAllReturnsForPeriod(selectedPeriod);
        setReturns(periodReturns);
        
        if (selectedIndex) {
          updateSelectedIndexData(selectedIndex);
        }
      } catch (error) {
        console.error('Error updating returns for period:', error);
      } finally {
        setLoading(false);
      }
    };
    
    updateReturns();
  }, [selectedPeriod]);

  const updateSelectedIndexData = (index: string) => {
    const data = indexDataService.getIndexData(index);
    if (data) {
      setSelectedIndexData(data);
      // Pass the selected period to get proper statistics for that period
      const updatedStats = indexDataService.getIndexStats(index, selectedPeriod);
      setStats(updatedStats);
      
      // Log stats to verify they're updating correctly
      console.log(`Stats for ${index} over ${selectedPeriod}:`, updatedStats);
    }
  };

  // Add this useEffect to update stats when period changes
  useEffect(() => {
    if (selectedIndex) {
      setStats(indexDataService.getIndexStats(selectedIndex, selectedPeriod));
    }
  }, [selectedPeriod, selectedIndex]);

  const getReturnColor = (value: number) => {
    if (value >= 30) return 'text-green-600';
    if (value >= 15) return 'text-green-500';
    if (value >= 0) return 'text-green-400';
    return 'text-red-500';
  };

  const formatReturn = (value: number) => {
    if (isNaN(value)) return '0.0';
    return `${value.toFixed(2)}`;
  };

  const filteredIndices = indices.filter(index => {
    // Filter by search query
    if (searchQuery && !index.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by positive returns only
    if (showPositiveOnly && (returns[index] || 0) <= 0) {
      return false;
    }
    
    return true;
  });

  // Sort indices by returns (descending)
  const sortedIndices = [...filteredIndices].sort((a, b) => {
    return (returns[b] || 0) - (returns[a] || 0);
  });

  // Format the inception date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      // Handle dates in MM/DD/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0]) - 1;
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('en-US', { 
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
      
      // Fall back to standard date parsing
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr; // Return original if invalid
      
      return d.toLocaleDateString('en-US', { 
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      console.warn('Error formatting date:', e);
      return dateStr; // Return original on error
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 glass-gradient-bg min-h-screen">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <h2 className="text-4xl font-light text-gray-800 text-shadow-sm">Index Values</h2>
      </div>

      {/* Main chart section */}
      <div className="glassmorphic-card p-6 mb-8 animate-fadeIn">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">{selectedIndex} Performance</h3>
          <div className="flex space-x-2">
            {periods.map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? 'bg-blue-500 text-white'
                    : 'glassmorphic-light text-gray-700 hover:bg-gray-100'
                }`}
              >
                {period === '1Y' ? '1 Year' : `${period.replace('Y', '')} Years`}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={selectedIndexData?.historicalData ? selectedIndexData.historicalData.map(dataPoint => ({
              ...dataPoint,
              // Use original date without transformation but with new formatting
              displayDate: formatToMonthYY(dataPoint.date),
            })) : []}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis 
                dataKey="displayDate" 
                tickFormatter={(value) => {
                  // Simply return the already formatted date
                  return value.toString();
                }}
                tick={{ 
                  fill: '#555',
                  fontSize: 10, // Smaller font size
                  dy: 5 // Move text slightly downward
                }}
                padding={{ left: 10, right: 10 }}
                interval={Math.floor((selectedIndexData?.historicalData?.length || 0) / 12) || 0} // Show fewer ticks
                tickMargin={10} // Add margin to ticks
              />
              <YAxis 
                domain={['auto', 'auto']}
                tickFormatter={(value) => `${value.toFixed(1)}`}
                tick={{ fill: '#555' }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}`, 'Value']}
                labelFormatter={(label) => {
                  return `Date: ${label}`;
                }}
                contentStyle={{ 
                  padding: '10px', 
                  borderRadius: '5px',
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  fontSize: '12px', // Smaller font
                  letterSpacing: '0.01em' // Better letter spacing
                }}
                itemStyle={{
                  padding: '4px 0',
                  fontSize: '11px'
                }}
                labelStyle={{
                  fontWeight: 'bold',
                  marginBottom: '5px'
                }}
              />
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorValue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Statistics Cards */}
        <div className="col-span-1">
          <div className="glassmorphic-card p-6 mb-6 animate-slideIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Key Statistics</h3>
              <Info size={16} className="text-gray-400" />
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-500">Average Return</p>
                <p className={`text-2xl font-bold ${getReturnColor(stats.averageReturn)}`}>
                  {formatReturn(stats.averageReturn)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Standard Deviation</p>
                <p className="text-2xl font-bold">{formatReturn(stats.standardDeviation)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sharpe Ratio</p>
                <p className="text-2xl font-bold">{stats.sharpeRatio.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{selectedPeriod} Return</p>
                <p className={`text-2xl font-bold ${getReturnColor(selectedIndexData?.returns[selectedPeriod as keyof typeof selectedIndexData.returns] || 0)}`}>
                  {formatReturn(selectedIndexData?.returns[selectedPeriod as keyof typeof selectedIndexData.returns] || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data Points</p>
                <p className="text-2xl font-bold">{selectedIndexData?.historicalData.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="glassmorphic-card p-6 animate-slideIn" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-lg font-semibold mb-4">Time Period</h3>
            <div className="flex flex-col space-y-2">
              {periods.map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                    selectedPeriod === period
                      ? 'bg-blue-500 text-white'
                      : 'glassmorphic-light text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {period === '1Y' ? '1 Year' : `${period.replace('Y', '')} Years`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Index Returns Grid */}
        <div className="col-span-3">
          <div className="glassmorphic-card p-6 animate-slideIn" style={{ animationDelay: '0.2s' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">All Index Returns - {selectedPeriod}</h3>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search indices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 glassmorphic-light"
                  />
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPositiveOnly}
                    onChange={() => setShowPositiveOnly(!showPositiveOnly)}
                    className="rounded text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm">Show positive returns only</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedIndices.map((index) => (
                <div
                  key={index}
                  className="glassmorphic-card p-4 hover:shadow-lg transition-shadow min-h-[120px]"
                  onClick={() => {
                    setSelectedIndex(index);
                    updateSelectedIndexData(index);
                  }}
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex flex-col">
                      <h4 className="text-base font-medium mb-1">{index}</h4>
                      {inceptionDates[index] && (
                        <div className="flex items-center gap-1 mb-2 text-xs text-gray-500">
                          <Calendar size={10} />
                          <span>Since {formatDate(inceptionDates[index])}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">Return</p>
                        <p className={`text-base font-semibold ${getReturnColor(returns[index])}`}>
                          {formatReturn(returns[index])}
                        </p>
                      </div>
                      <TrendingUp
                        size={16}
                        className={`transition-transform duration-300 ${
                          returns[index] >= 0 ? 'text-green-500 rotate-45' : 'text-red-500 -rotate-45'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};