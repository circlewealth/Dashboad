import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface IndexData {
  name: string;
  symbol: string;
  value: string;
  allocation: string;
  price: string;
  change: string;
}

export const BreakdownTable: React.FC = () => {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIndices = async () => {
      try {
        setLoading(true);
        const response = await apiService.getMarketIndices();
        // Extract the indices array from the response
        setIndices(response.indices || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch market indices:', err);
        setError('Failed to fetch index data. Using fallback data.');
        // Use fallback data if API fails
        setIndices([
          {
            name: 'NIFTY 50',
            symbol: 'NIFTY',
            value: '22,147.50',
            allocation: '35.20%',
            price: '22,147.50',
            change: '+1.5%'
          },
          {
            name: 'BANK NIFTY',
            symbol: 'BANKNIFTY',
            value: '46,592.75',
            allocation: '25.15%',
            price: '46,592.75',
            change: '+2.1%'
          },
          {
            name: 'NIFTY IT',
            symbol: 'NIFTYIT',
            value: '33,845.60',
            allocation: '15.33%',
            price: '33,845.60',
            change: '+3.7%'
          },
          {
            name: 'NIFTY Auto',
            symbol: 'NIFTYAUTO',
            value: '18,956.30',
            allocation: '12.45%',
            price: '18,956.30',
            change: '+1.2%'
          },
          {
            name: 'NIFTY Pharma',
            symbol: 'NIFTYPHARMA',
            value: '15,678.90',
            allocation: '6.87%',
            price: '15,678.90',
            change: '-0.6%'
          },
          {
            name: 'NIFTY FMCG',
            symbol: 'NIFTYFMCG',
            value: '52,345.80',
            allocation: '5.00%',
            price: '52,345.80',
            change: '+0.8%'
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchIndices();
    
    // Refresh data every 5 minutes (300000 ms)
    const intervalId = setInterval(fetchIndices, 300000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 flex justify-center items-center h-64">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {error && (
        <div className="bg-yellow-50 p-4 border-b border-yellow-100">
          <p className="text-yellow-700 text-sm">{error}</p>
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Index
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Value
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Allocation
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Change
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.isArray(indices) && indices.length > 0 ? indices.map((index) => (
            <tr key={index.symbol} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{index.name}</div>
                    <div className="text-sm text-gray-500">{index.symbol}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{index.value}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index.allocation}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{index.price}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  index.change.startsWith('-') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {index.change.startsWith('+') || index.change.startsWith('-') ? index.change : `+${index.change}`}
                </span>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};