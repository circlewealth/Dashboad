import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  info?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  info,
  changeType = 'neutral',
  className = ''
}) => {
  return (
    <div className={`p-4 rounded-lg transition-all duration-300 backdrop-blur-md ${className}`}>
      <div className="flex justify-between items-start">
        <div className="group">
          <h3 className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors duration-300">
            {title}
          </h3>
          <div className="flex items-baseline space-x-2">
            <p className="text-xl font-semibold text-shadow-sm">{value}</p>
            {info && <span className="text-sm text-gray-600">{info}</span>}
          </div>
          <p className="text-xs text-gray-500 mt-1 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
            {subtitle}
          </p>
        </div>
        <div className={`p-2 rounded-full transition-transform duration-300 hover:scale-110 ${
          changeType === 'increase' 
            ? 'bg-green-100 bg-opacity-40 text-green-600' 
            : changeType === 'decrease' 
              ? 'bg-red-100 bg-opacity-40 text-red-600' 
              : 'bg-gray-100 bg-opacity-40 text-gray-600'
        }`}>
          {changeType === 'increase' 
            ? <TrendingUp size={18} /> 
            : changeType === 'decrease' 
              ? <TrendingDown size={18} /> 
              : <Minus size={18} />
          }
        </div>
      </div>
    </div>
  );
};