import React from 'react';
import { AlertTriangle, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

interface IndexCardProps {
  name: string;
  symbol: string;
  value: string;
  percentage: string;
  change: number;
  color: string;
  isSelected: boolean;
  onClick: () => void;
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
}) => {
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
        </div>
        <div className="mt-auto pt-2 flex justify-between items-end">
          <div>
            <p className="font-medium text-lg">₹{value}</p>
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