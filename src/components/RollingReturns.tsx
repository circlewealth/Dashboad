import React, { useState, useEffect } from 'react';
import { apiService, type RollingReturnPeriod } from '../services/api';

// Date formatting function to use Month YY format (e.g., Apr 23)
const formatToMonthYY = (date: Date): string => {
  const year = String(date.getFullYear() % 100).padStart(2, '0');
  const monthAbbr = date.toLocaleString('en-US', { month: 'short' });
  
  return `${monthAbbr} ${year}`;
};

export const RollingReturns: React.FC = () => {
  const [rollingReturnsData, setRollingReturnsData] = useState<RollingReturnPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRollingReturns = async () => {
      try {
        setLoading(true);
        const data = await apiService.getRollingReturns();
        
        if (data.length > 0) {
          setRollingReturnsData(data);
          // Set the default selected period to 1Y if available
          const defaultPeriod = data.find(p => p.period === '1Y')?.period || data[0].period;
          setSelectedPeriod(defaultPeriod);
        }
      } catch (error) {
        console.error('Error loading rolling returns data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRollingReturns();
  }, []);

  const getReturnColor = (returnValue: string) => {
    const value = parseFloat(returnValue);
    if (value >= 30) return 'text-green-600';
    if (value >= 15) return 'text-green-500';
    if (value >= 0) return 'text-green-400';
    return 'text-red-500';
  };

  // Format return value to display properly
  const formatReturnValue = (returnValue: string) => {
    const value = parseFloat(returnValue);
    if (isNaN(value)) return '0.0';
    return `${value.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">Rolling Returns</h3>
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {rollingReturnsData.map((data: RollingReturnPeriod) => (
            <button
              key={data.period}
              onClick={() => setSelectedPeriod(data.period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedPeriod === data.period
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {data.period === '1Y' ? '1 Year' : `${data.period.replace('Y', '')} Years`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(
          rollingReturnsData.find((data: RollingReturnPeriod) => data.period === selectedPeriod)?.returns || {}
        ).map(([index, returnValue]) => (
          <div
            key={index}
            className="bg-gray-50 rounded-lg p-4 transition-transform hover:scale-105"
          >
            <h4 className="text-sm font-medium text-gray-600 mb-2">{index}</h4>
            <p className={`text-2xl font-bold ${getReturnColor(returnValue)}`}>
              {formatReturnValue(returnValue)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Last updated: {formatToMonthYY(new Date())}</span>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span>Data from API</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 