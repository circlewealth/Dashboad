import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Label, ReferenceLine
} from 'recharts';
import { Calendar, Filter, ChevronDown, TrendingUp, ArrowDownRight, ArrowUpRight, Search } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { apiService, type ComparisonData } from '../services/api';
import { transformDateForRollingReturnsChart, formatChartDate } from '../utils/dateUtils';
import RollingReturnsStats from '../components/RollingReturnsStats';
import LumpsumScenario from '../components/LumpsumScenario';

export const IndexComparison: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1Y');
  const [availablePeriods] = useState<string[]>(['1Y', '3Y', '5Y', '7Y', '10Y']);
  const [availableIndices, setAvailableIndices] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [benchmarkIndex, setBenchmarkIndex] = useState<string>('');
  const [showAlpha, setShowAlpha] = useState<boolean>(false);
  const [showOnlyAlpha, setShowOnlyAlpha] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [searchQuery, setSearchQuery] = useState('');
  const [inceptionDates, setInceptionDates] = useState<Record<string, string>>({});

  const colors = [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899'
  ];

  // Add window resize listener
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Fetch available indices
    const fetchIndices = async () => {
      try {
        const indices = await apiService.getAllIndices();
        setAvailableIndices(indices);
        // Select first two indices by default
        if (indices.length >= 2) {
          setSelectedIndices([indices[0], indices[1]]);
          setBenchmarkIndex(indices[0]);
        } else if (indices.length === 1) {
          setSelectedIndices([indices[0]]);
          setBenchmarkIndex(indices[0]);
        }
      } catch (error) {
        console.error('Error fetching indices:', error);
      }
    };
    
    fetchIndices();
  }, []);

  useEffect(() => {
    // Fetch comparison data when selected indices change
    const fetchComparisonData = async () => {
      if (selectedIndices.length === 0) return;
      
      setLoading(true);
      try {
        // Format dates to strings for the API call
        const formatDateForApi = (date: Date | null): string | undefined => {
          if (!date) return undefined;
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          const yyyy = date.getFullYear();
          return `${mm}/${dd}/${yyyy}`;
        };
        
        const data = await apiService.compareRollingReturns(
          selectedIndices, 
          startDate ? formatDateForApi(startDate) : undefined, 
          endDate ? formatDateForApi(endDate) : undefined
        );
        setComparisonData(data);
      } catch (error) {
        console.error('Error fetching comparison data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchComparisonData();
  }, [selectedIndices, startDate, endDate]);

  // Additional useEffect to trigger re-calculation of alpha when benchmark changes
  useEffect(() => {
    // Skip if no data or indices
    if (!comparisonData || !comparisonData.comparisonData || selectedIndices.length === 0) return;
    
    // Refresh the alpha data when benchmark changes
    const refreshedData = { ...comparisonData };
    setComparisonData(refreshedData);
  }, [benchmarkIndex]);

  useEffect(() => {
    const fetchInceptionDates = async () => {
      const dates = await apiService.getInceptionDates();
      setInceptionDates(dates);
    };
    fetchInceptionDates();
  }, []);

  // Transform data for line chart
  const getLineData = () => {
    if (!comparisonData?.comparisonData || !comparisonData.comparisonData[selectedPeriod]) {
      return [];
    }
    
    const periodData = comparisonData.comparisonData[selectedPeriod];
    const selectedData = [];
    const dates = periodData.dates || [];
    
    // If we have no dates, return empty array
    if (dates.length === 0) {
      return [];
    }
    
    // Helper function to convert date string to timestamp
    const dateToTimestamp = (dateStr: string): number => {
      try {
        // Handle MM/DD/YYYY format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1;
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          return new Date(year, month, day).getTime();
        }
        
        // Fall back to standard date parsing
        return new Date(dateStr).getTime();
      } catch (e) {
        console.warn('Error converting date to timestamp:', e);
        return 0;
      }
    };
    
    // Create array of data points with dates and values for each index
    for (let i = 0; i < dates.length; i++) {
      // Original date from data
      const originalDate = dates[i] || '';
      
      // Transform date for display (add years based on selected period)
      const transformedDate = transformDateForRollingReturnsChart(originalDate, selectedPeriod);
      
      const dataPoint: any = {
        date: dateToTimestamp(transformedDate), // Convert to timestamp for sorting
        formattedDate: formatDate(transformedDate || ''),
        originalDate: originalDate,
        rawDate: transformedDate || ''
      };
      
      // Add values for each selected index
      selectedIndices.forEach(index => {
        // Safely access values that might be undefined
        const indexValues = periodData.indices[index] || [];
        dataPoint[index] = i < indexValues.length ? indexValues[i] : null;
      });
      
      // Add alpha values if requested (as a separate step to ensure proper calculation)
      if (showAlpha && benchmarkIndex) {
        selectedIndices.forEach(index => {
          if (index !== benchmarkIndex) {
            // Try to get the precomputed alpha values first
            const alphaKey = `${index}_alpha_vs_${benchmarkIndex}`;
            const alphaValues = periodData.indices[alphaKey] || [];
            
            if (alphaValues.length > 0 && i < alphaValues.length) {
              dataPoint[alphaKey] = alphaValues[i];
            } else {
              // If no precomputed alpha, calculate it directly if we have both index values
              const indexValue = dataPoint[index];
              const benchmarkValue = dataPoint[benchmarkIndex];
              
              if (indexValue !== null && benchmarkValue !== null) {
                dataPoint[alphaKey] = indexValue - benchmarkValue;
              } else {
                dataPoint[alphaKey] = null;
              }
            }
          }
        });
      }
      
      selectedData.push(dataPoint);
    }
    
    // Sort by date
    return selectedData.sort((a, b) => a.date - b.date);
  };

  const toggleIndexSelection = (index: string) => {
    if (selectedIndices.includes(index)) {
      // Don't remove if it's the last one
      if (selectedIndices.length > 1) {
        setSelectedIndices(selectedIndices.filter(i => i !== index));
        // If we removed the benchmark, set a new one
        if (benchmarkIndex === index && selectedIndices.length > 0) {
          const newBenchmark = selectedIndices.find(i => i !== index) || '';
          setBenchmarkIndex(newBenchmark);
        }
      }
    } else {
      // Limit to 3 indices max
      if (selectedIndices.length < 3) {
        setSelectedIndices([...selectedIndices, index]);
        // If this is the first index, make it the benchmark
        if (selectedIndices.length === 0) {
          setBenchmarkIndex(index);
        }
      }
    }
  };

  const setBenchmark = (index: string) => {
    if (selectedIndices.includes(index)) {
      setBenchmarkIndex(index);
      
      // Force re-render of the chart data when benchmark changes
      if (showAlpha) {
        // Small delay to ensure state updates properly
        setTimeout(() => {
          // Clone the comparison data to force a re-render
          if (comparisonData) {
            const refreshedData = { ...comparisonData };
            setComparisonData(refreshedData);
          }
        }, 10);
      }
    }
  };
  
  // Format date for display
  const formatDate = (date: string) => {
    if (!date) return '';
    try {
      // Handle dates in MM/DD/YYYY format
      const parts = date.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0]) - 1;
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
      }
      
      // Fall back to standard date parsing
      const d = new Date(date);
      if (isNaN(d.getTime())) return date; // Return original if invalid
      
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      console.warn('Error formatting date:', e);
      return date; // Return original on error
    }
  };
  
  // Format date for x-axis ticks to prevent overlapping
  const formatXAxisTick = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return ''; // Return empty if invalid
      
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        year: '2-digit'
      });
    } catch (e) {
      console.warn('Error formatting tick:', e);
      return ''; // Return empty on error
    }
  };
  
  // Custom tooltip for the line chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-md border glassmorphic-light">
          <p className="text-sm font-semibold mb-2">{payload[0]?.payload?.formattedDate}</p>
          <p className="text-xs text-gray-500 mb-2">Showing data for {formatChartDate(payload[0]?.payload?.date)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              <span className="font-medium">{entry.name}:</span> {entry.value !== null && entry.value !== undefined ? entry.value.toFixed(2) : 'N/A'}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Safe check for valid data to pass to child components
  const hasValidChartData = () => {
    if (!comparisonData || 
        !comparisonData.comparisonData || 
        !comparisonData.comparisonData[selectedPeriod] ||
        !selectedIndices || 
        selectedIndices.length === 0) {
      return false;
    }
    
    const lineData = getLineData();
    return lineData && lineData.length > 0;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <h2 className="text-4xl font-light text-gray-700">Index Comparison</h2>
      </div>

      {/* Control Panel */}
      <div className="glassmorphic-card p-6 mb-8 border-glass">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Index Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-shadow-sm">Select Indices (Max 3)</h3>
            <div className="mb-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search indices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full glassmorphic-light rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableIndices
                .filter(index => 
                  index.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(index => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                      selectedIndices.includes(index) 
                        ? 'glassmorphic-light border-glass' 
                        : 'bg-opacity-30 backdrop-blur-sm hover:bg-opacity-50'
                    }`}
                    onClick={() => toggleIndexSelection(index)}
                  >
                    <div className="flex items-center">
                      <div 
                        className={`w-4 h-4 rounded-full mr-3 ${
                          selectedIndices.includes(index) 
                            ? 'bg-indigo-500' 
                            : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-sm font-medium flex flex-col">
                        {index}
                        {inceptionDates[index] && (
                          <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Calendar size={12} className="inline-block" />
                            Since {formatDate(inceptionDates[index])}
                          </span>
                        )}
                      </span>
                    </div>
                    {selectedIndices.includes(index) && (
                      <button 
                        className={`px-2 py-1 text-xs rounded transition-all duration-300 ${
                          benchmarkIndex === index 
                            ? 'bg-green-100 bg-opacity-70 text-green-800 backdrop-blur-sm'
                            : 'bg-gray-100 bg-opacity-50 text-gray-800 hover:bg-green-100 hover:bg-opacity-70 hover:text-green-800'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBenchmark(index);
                        }}
                      >
                        {benchmarkIndex === index ? 'Benchmark' : 'Set as Benchmark'}
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-shadow-sm">Date Range</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                <div className="relative datepicker-wrapper">
                  <DatePicker
                    selected={startDate}
                    onChange={(date: Date | null) => {
                      if (!date || !endDate || date <= endDate) {
                        setStartDate(date);
                      }
                    }}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    minDate={new Date('2000-01-01')}
                    maxDate={new Date()}
                    dateFormat="MMMM d, yyyy"
                    placeholderText="Select start date"
                    className="glassmorphic-light border-glass w-full p-2 rounded-md"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    filterDate={(date: Date) => date <= (endDate || new Date())}
                  />
                  {startDate && (
                    <button 
                      onClick={() => setStartDate(null)}
                      className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Clear date"
                    >
                      ✕
                    </button>
                  )}
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">End Date</label>
                <div className="relative datepicker-wrapper">
                  <DatePicker
                    selected={endDate}
                    onChange={(date: Date | null) => {
                      if (!date || !startDate || date >= startDate) {
                        setEndDate(date);
                      }
                    }}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate || new Date('2000-01-01')}
                    maxDate={new Date()}
                    dateFormat="MMMM d, yyyy"
                    placeholderText="Select end date"
                    className="glassmorphic-light border-glass w-full p-2 rounded-md"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    filterDate={(date: Date) => !startDate || date >= startDate}
                  />
                  {endDate && (
                    <button 
                      onClick={() => setEndDate(null)}
                      className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Clear date"
                    >
                      ✕
                    </button>
                  )}
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>
              
              {(startDate || endDate) && (
                <div className="mt-2">
                  <button
                    onClick={() => {
                      setStartDate(null);
                      setEndDate(null);
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    <span className="mr-1">✕</span> Clear all date filters
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Time Period */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-shadow-sm">Time Period</h3>
            <div className="flex flex-wrap gap-2">
              {availablePeriods.map(period => (
                <button
                  key={period}
                  className={`px-4 py-2 rounded-md text-sm transition-all duration-300 ${
                    selectedPeriod === period
                      ? 'glassmorphic-light border-glass text-indigo-700 font-medium'
                      : 'bg-white bg-opacity-30 hover:bg-opacity-50 text-gray-700 backdrop-blur-sm'
                  }`}
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period}
                </button>
              ))}
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showAlpha"
                  checked={showAlpha}
                  onChange={(e) => {
                    setShowAlpha(e.target.checked);
                    if (!e.target.checked) {
                      setShowOnlyAlpha(false);
                    }
                  }}
                  className="mr-2 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="showAlpha" className="text-sm">
                  Show Alpha vs Benchmark
                </label>
              </div>
              
              {showAlpha && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showOnlyAlpha"
                    checked={showOnlyAlpha}
                    onChange={(e) => setShowOnlyAlpha(e.target.checked)}
                    className="mr-2 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="showOnlyAlpha" className="text-sm">
                    Show Only Alpha Line
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Chart */}
      {comparisonData && selectedIndices.length > 0 && (
        <div className="glassmorphic-card p-6 mb-8 border-glass">
          <h3 className="text-xl font-semibold mb-6 text-shadow-sm">Rolling Returns Comparison</h3>
          
          {getLineData().length > 0 ? (
            <div className="h-80">
              {startDate || endDate ? (
                <div className="text-sm text-gray-600 mb-2 text-center">
                  Chart plotted from {getLineData()[0]?.formattedDate || ''} to {getLineData()[getLineData().length - 1]?.formattedDate || ''}
                </div>
              ) : null}
              <ResponsiveContainer width="100%" height="100%" key={`chart-${startDate}-${endDate}-${selectedPeriod}-${selectedIndices.join('-')}-${windowSize.width}`}>
                <LineChart
                  data={getLineData()}
                  margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxisTick} 
                    scale="time" 
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    padding={{ left: 10, right: 10 }}
                    tick={{ 
                      fill: '#555',
                      fontSize: 10
                    }}
                    interval="equidistantPreserveStart"
                    height={50}
                    allowDataOverflow={false}
                  >
                    <Label 
                      value="Date" 
                      offset={20} 
                      position="insideBottom" 
                      style={{ textAnchor: 'middle', fill: '#666' }} 
                    />
                  </XAxis>
                  <YAxis
                    yAxisId="left"
                    domain={['auto', 'auto']}
                    padding={{ top: 20, bottom: 20 }}
                    allowDataOverflow={false}
                    width={60}
                  >
                    <Label 
                      value="Return (%)" 
                      angle={-90} 
                      position="insideLeft" 
                      style={{ textAnchor: 'middle', fill: '#666' }} 
                    />
                  </YAxis>
                  {showAlpha && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={['auto', 'auto']}
                      padding={{ top: 20, bottom: 20 }}
                      allowDataOverflow={false}
                      width={60}
                    >
                      <Label 
                        value="Alpha (%)" 
                        angle={90} 
                        position="insideRight" 
                        style={{ textAnchor: 'middle', fill: '#666' }} 
                      />
                    </YAxis>
                  )}
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{stroke: 'rgba(0,0,0,0.2)', strokeWidth: 1, strokeDasharray: '5 5'}}
                    isAnimationActive={false}
                  />
                  <Legend 
                    height={30} 
                    wrapperStyle={{paddingTop: '10px'}}
                    iconType="circle"
                    iconSize={8}
                  />
                  <ReferenceLine y={0} stroke="rgba(0,0,0,0.2)" yAxisId="left" />
                  
                  {/* Render lines for each selected index */}
                  {!showOnlyAlpha && selectedIndices.map((index, i) => (
                    <Line
                      key={index}
                      type="monotone"
                      dataKey={index}
                      stroke={colors[i % colors.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                      connectNulls={true}
                      name={index}
                      isAnimationActive={false}
                      yAxisId="left"
                    />
                  ))}
                  
                  {/* Render alpha lines if requested */}
                  {showAlpha && selectedIndices.filter(index => index !== benchmarkIndex).map((index, i) => (
                    <Line
                      key={`${index}_alpha`}
                      type="monotone"
                      dataKey={`${index}_alpha_vs_${benchmarkIndex}`}
                      stroke="#FF0000"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                      connectNulls={true}
                      name={`Alpha Line ${selectedIndices.indexOf(index) + 1}`}
                      isAnimationActive={false}
                      yAxisId="right"
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 text-center">
              <div className="text-gray-500 mb-2">
                <Filter size={48} />
              </div>
              <h4 className="text-xl font-medium text-gray-700 mb-2">No data available</h4>
              <p className="text-gray-500 max-w-md">
                No data is available for the selected date range. Please try a different date range or clear the date filters.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Rolling Returns Statistics */}
      {hasValidChartData() && (
        <RollingReturnsStats 
          indices={selectedIndices}
          period={selectedPeriod}
          data={comparisonData}
          colors={colors}
        />
      )}
      
      {/* Lumpsum Scenario */}
      {hasValidChartData() && (
        <LumpsumScenario period={selectedPeriod} />
      )}
      
      {/* Performance Summary */}
      {comparisonData && selectedIndices.length > 0 && getLineData().length > 0 && (
        <div className="glassmorphic-card p-6 border-glass">
          <h3 className="text-xl font-semibold mb-6 text-shadow-sm">Performance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedIndices.map((index, i) => {
              const lineData = getLineData();
              const lastValue = lineData.length > 0 ? lineData[lineData.length - 1][index] : 0;
              
              // Calculate average of all values
              let sum = 0;
              let count = 0;
              lineData.forEach(item => {
                if (item[index] !== null && item[index] !== undefined) {
                  sum += item[index];
                  count++;
                }
              });
              const avgValue = count > 0 ? sum / count : 0;
              
              return (
                <div 
                  key={index} 
                  className="glassmorphic-light p-4 rounded-lg border-glass"
                  style={{ borderLeft: `4px solid ${colors[i % colors.length]}` }}
                >
                  <h4 className="text-lg font-medium mb-2">{index}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Latest Return</p>
                      <p className={`text-xl font-semibold ${lastValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {lastValue !== null && lastValue !== undefined ? lastValue.toFixed(2) : 'N/A'}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Average Return</p>
                      <p className={`text-xl font-semibold ${avgValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {avgValue.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}; 