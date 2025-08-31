import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';

interface RollingReturnsStatsProps {
  indices: string[];
  period: string;
  data: any;
  colors: string[];
}

interface StatItem {
  min: number;
  median: number;
  max: number;
  stdDev: number;
  distribution: {
    negative: number;
    low: number;
    medium: number;
    high: number;
    veryHigh: number;
  };
}

const RollingReturnsStats: React.FC<RollingReturnsStatsProps> = ({ indices, period, data, colors }) => {
  const [showEditRange, setShowEditRange] = useState(false);
  
  // Calculate statistics from the actual data
  const stats = useMemo(() => {
    const result: Record<string, StatItem> = {};
    
    // Only proceed if we have valid data
    if (!data || !data.comparisonData || !data.comparisonData[period]) {
      return result;
    }
    
    const periodData = data.comparisonData[period];
    
    // For each selected index
    indices.forEach(index => {
      // Extract the values for this index
      const values = periodData.indices[index] || [];
      
      // Filter out any null or undefined values
      const validValues = values.filter(val => val !== null && val !== undefined);
      
      if (validValues.length === 0) {
        result[index] = {
          min: 0,
          median: 0,
          max: 0,
          stdDev: 0,
          distribution: {
            negative: 0,
            low: 0,
            medium: 0,
            high: 0,
            veryHigh: 0
          }
        };
        return;
      }
      
      try {
        // Sort values for calculations
        const sortedValues = [...validValues].sort((a, b) => a - b);
        
        // Calculate min, max, median
        const min = sortedValues[0];
        const max = sortedValues[sortedValues.length - 1];
        
        // Calculate median
        let median;
        if (sortedValues.length % 2 === 0) {
          // Even number of elements
          const midIndex = sortedValues.length / 2;
          median = (sortedValues[midIndex - 1] + sortedValues[midIndex]) / 2;
        } else {
          // Odd number of elements
          median = sortedValues[Math.floor(sortedValues.length / 2)];
        }
        
        // Calculate standard deviation
        const mean = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        const squaredDiffs = validValues.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / validValues.length;
        const stdDev = Math.sqrt(variance);
        
        // Calculate distribution percentages
        const total = validValues.length;
        const negativeCount = validValues.filter(val => val < 0).length;
        const lowCount = validValues.filter(val => val >= 0 && val < 8).length;
        const mediumCount = validValues.filter(val => val >= 8 && val < 12).length;
        const highCount = validValues.filter(val => val >= 12 && val < 20).length;
        const veryHighCount = validValues.filter(val => val >= 20).length;
        
        result[index] = {
          min,
          median,
          max,
          stdDev,
          distribution: {
            negative: (negativeCount / total) * 100,
            low: (lowCount / total) * 100,
            medium: (mediumCount / total) * 100,
            high: (highCount / total) * 100,
            veryHigh: (veryHighCount / total) * 100
          }
        };
      } catch (err) {
        console.error(`Error calculating statistics for ${index}:`, err);
        // Provide default values in case of error
        result[index] = {
          min: 0,
          median: 0,
          max: 0,
          stdDev: 0,
          distribution: {
            negative: 0,
            low: 0,
            medium: 0,
            high: 0,
            veryHigh: 0
          }
        };
      }
    });
    
    return result;
  }, [indices, period, data]);
  
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "0.0";
    return num.toFixed(1);
  };
  
  const getSymbolColor = (index: string, i: number) => {
    // Return the matching color for this index, or a default color
    return colors[i % colors.length];
  };
  
  // Defend against missing data
  if (!indices || indices.length === 0) {
    return (
      <div className="glassmorphic-card p-6 mb-8 border-glass">
        <h3 className="text-xl font-semibold mb-6">Rolling Return Statistics</h3>
        <p className="text-gray-500 text-center py-8">Select indices to view statistics</p>
      </div>
    );
  }
  
  return (
    <div className="glassmorphic-card p-6 mb-8 border-glass">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Rolling Return Statistics - {period}</h3>
        {/* <button 
          onClick={() => setShowEditRange(!showEditRange)}
          className="flex items-center text-blue-500 hover:text-blue-600 transition"
        >
          <Plus size={16} className="mr-1" /> Edit Range
        </button> */}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm" key={`stats-table-${period}-${indices.join('-')}`}>
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 text-left font-medium text-gray-600 w-1/5">Funds and benchmarks</th>
              <th className="py-3 text-center font-medium text-gray-600">Min.</th>
              <th className="py-3 text-center font-medium text-gray-600">Med.</th>
              <th className="py-3 text-center font-medium text-gray-600">Max.</th>
              <th className="py-3 text-center font-medium text-gray-600">STD Dev.</th>
              <th colSpan={5} className="py-3 text-center font-medium text-gray-600">
                Rolling Returns Distribution (% of times)
              </th>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="py-2"></th>
              <th className="py-2"></th>
              <th className="py-2"></th>
              <th className="py-2"></th>
              <th className="py-2"></th>
              <th className="py-2 text-center text-xs text-gray-500">{'< 0%'}</th>
              <th className="py-2 text-center text-xs text-gray-500">0 - 8%</th>
              <th className="py-2 text-center text-xs text-gray-500">8 - 12%</th>
              <th className="py-2 text-center text-xs text-gray-500">12 - 20%</th>
              <th className="py-2 text-center text-xs text-gray-500">{"> 20%"}</th>
            </tr>
          </thead>
          <tbody>
            {indices.filter(index => index).map((index, i) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: getSymbolColor(index, i) }}
                    ></div>
                    <span>{index}</span>
                  </div>
                </td>
                <td className="py-3 text-center">{stats[index] ? formatNumber(stats[index].min) : "0.0"}</td>
                <td className="py-3 text-center">{stats[index] ? formatNumber(stats[index].median) : "0.0"}</td>
                <td className="py-3 text-center">{stats[index] ? formatNumber(stats[index].max) : "0.0"}</td>
                <td className="py-3 text-center">{stats[index] ? formatNumber(stats[index].stdDev) : "0.0"}</td>
                <td className="py-3 text-center">{stats[index] && stats[index].distribution ? formatNumber(stats[index].distribution.negative) : "0.0"}</td>
                <td className="py-3 text-center">{stats[index] && stats[index].distribution ? formatNumber(stats[index].distribution.low) : "0.0"}</td>
                <td className="py-3 text-center">{stats[index] && stats[index].distribution ? formatNumber(stats[index].distribution.medium) : "0.0"}</td>
                <td className="py-3 text-center">{stats[index] && stats[index].distribution ? formatNumber(stats[index].distribution.high) : "0.0"}</td>
                <td className="py-3 text-center">{stats[index] && stats[index].distribution ? formatNumber(stats[index].distribution.veryHigh) : "0.0"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showEditRange && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium mb-3">Edit Date Range</h4>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input 
                type="date" 
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input 
                type="date" 
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              onClick={() => setShowEditRange(false)}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RollingReturnsStats; 