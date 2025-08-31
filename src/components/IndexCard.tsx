import React from 'react';
import { AlertTriangle, ChevronRight, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface IndexCardProps {
  name: string;
  symbol: string;
  value: string;
  percentage: string;
  change: number;
  color: string;
  isSelected: boolean;
  onClick: () => void;
  inceptionDate?: string;
}

export const IndexCard: React.FC<IndexCardProps> = ({
  name,
  symbol,
  value,
  percentage,
  change,
  color,
  isSelected,
  onClick,
  inceptionDate
}) => {
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

  return (
    <div
      className={`${color} p-4 transition-all duration-300 cursor-pointer ${
        isSelected 
          ? 'glassmorphic-card border-2 border-indigo-200 scale-105 animate-shimmer' 
          : 'hover:scale-102'
      }`}
      onClick={onClick}
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div className="flex flex-col h-full">
        <div>
          <h4 className="text-sm font-semibold text-shadow-sm">{name}</h4>
          <p className="text-xs text-gray-600">{symbol}</p>
          {inceptionDate && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <Calendar size={12} />
              <span>Since {formatDate(inceptionDate)}</span>
            </div>
          )}
        </div>
        <div className="mt-auto pt-2 flex justify-between items-end">
          <div>
            <p className="text-sm text-gray-600">Return</p>
            <p className={`font-semibold text-xl ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {value}
            </p>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            change >= 0 
              ? 'bg-green-100 bg-opacity-40 text-green-800' 
              : 'bg-red-100 bg-opacity-40 text-red-800'
          }`}>
            {change >= 0 ? '+' : ''}{change}%
          </div>
        </div>
      </div>
    </div>
  );
};