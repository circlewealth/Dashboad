import React, { useState, useRef, useEffect } from 'react';
import { transformDateForRollingReturnsChart } from '../utils/dateUtils';

interface ChartPoint {
  date: string;
  value: number;
}

interface PerformanceChartProps {
  data: ChartPoint[];
  period?: string;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, period = '1Y' }) => {
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);
  const [isZooming, setIsZooming] = useState<boolean>(false);
  const [startZoomX, setStartZoomX] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  if (!data || data.length < 2) {
    return <div className="h-48 flex items-center justify-center text-gray-500">No data available</div>;
  }
  
  // Format date for display (convert YYYY-MM-DD to MMM DD format)
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      // Check if date is valid
      if (isNaN(date.getTime())) return dateStr;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
    } catch (e) {
      return dateStr; // Return original if error
    }
  };
  
  // Use the original dates but format them for display
  const transformedData = data.map(point => ({
    ...point,
    displayDate: formatDate(point.date)
  }));
  
  // Apply zoom if active
  const displayData = zoomRange 
    ? transformedData.slice(zoomRange[0], zoomRange[1] + 1) 
    : transformedData;
  
  // Get min and max values for scaling
  const values = displayData.map(d => d.value);
  const minValue = Math.min(...values) * 0.95; // Add 5% padding
  const maxValue = Math.max(...values) * 1.05;
  const valueRange = maxValue - minValue;
  
  // Calculate if trend is up or down
  const firstValue = displayData[0].value;
  const lastValue = displayData[displayData.length - 1].value;
  const isUptrend = lastValue >= firstValue;
  
  // Calculate percentages for the path
  const getY = (value: number): number => {
    return 100 - ((value - minValue) / valueRange) * 90; // Leave 10% padding
  };
  
  // Create the SVG path
  const pathPoints = displayData.map((point, i) => {
    const x = (i / (displayData.length - 1)) * 100;
    const y = getY(point.value);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  
  // Create the fill path that goes to the bottom
  const fillPath = `${pathPoints} L 100 100 L 0 100 Z`;
  
  // Format for display
  const formatCurrency = (value: number): string => {
    return '₹' + value.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });
  };
  
  // Calculate change
  const change = lastValue - firstValue;
  const changePercent = (change / firstValue) * 100;
  
  // Handle mouse movement over chart
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const relativeX = mouseX / svgRect.width;
    
    // If zooming, update selection
    if (isZooming && startZoomX !== null) {
      const currentX = Math.max(0, Math.min(1, relativeX)) * 100;
      const startX = Math.max(0, Math.min(1, startZoomX)) * 100;
      const left = Math.min(startX, currentX);
      const right = Math.max(startX, currentX);
      
      // Calculate indices for the zoom range
      const leftIndex = Math.floor((left / 100) * (transformedData.length - 1));
      const rightIndex = Math.ceil((right / 100) * (transformedData.length - 1));
      
      setZoomRange([leftIndex, rightIndex]);
      return;
    }
    
    // Find the closest point
    const index = Math.min(
      Math.round(relativeX * (displayData.length - 1)),
      displayData.length - 1
    );
    
    if (index >= 0 && index < displayData.length) {
      setHoveredPoint(displayData[index]);
      setHoveredIndex(index);
    }
  };
  
  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoveredIndex(null);
    
    // If still zooming, cancel it
    if (isZooming) {
      setIsZooming(false);
      setStartZoomX(null);
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const relativeX = mouseX / svgRect.width;
    
    setIsZooming(true);
    setStartZoomX(relativeX);
    setZoomRange(null); // Reset any existing zoom
  };
  
  const handleMouseUp = () => {
    if (isZooming) {
      setIsZooming(false);
      setStartZoomX(null);
      
      // If the zoom range is too small, reset it
      if (zoomRange && (zoomRange[1] - zoomRange[0] < 5)) {
        setZoomRange(null);
      }
    }
  };
  
  // Reset zoom on double click
  const handleDoubleClick = () => {
    setZoomRange(null);
  };
  
  return (
    <div className="mt-4">
      <div className="flex justify-between items-baseline mb-4">
        <div>
          <div className="text-xl font-semibold text-shadow-sm">
            {formatCurrency(lastValue)}
          </div>
          <div className={`flex items-center text-sm ${isUptrend ? 'text-green-600' : 'text-red-600'}`}>
            {isUptrend ? '↑' : '↓'} {formatCurrency(Math.abs(change))} ({changePercent.toFixed(2)}%)
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {displayData[0].displayDate} - {displayData[displayData.length - 1].displayDate}
          {zoomRange && (
            <button 
              onClick={() => setZoomRange(null)} 
              className="ml-2 text-xs text-indigo-600 hover:text-indigo-800"
            >
              Reset Zoom
            </button>
          )}
        </div>
      </div>
      
      <div className="relative h-48 w-full glassmorphic p-2 rounded-lg border-glass animate-shimmer">
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: isZooming ? 'col-resize' : hoveredPoint ? 'pointer' : 'default' }}
        >
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(229, 231, 235, 0.3)" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(229, 231, 235, 0.3)" strokeWidth="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(229, 231, 235, 0.3)" strokeWidth="0.5" />
          
          {/* Fill area under the curve */}
          <path
            d={fillPath}
            fill={`url(#gradient-${isUptrend ? 'up' : 'down'})`}
            strokeWidth="0"
            className="transition-opacity duration-500"
          />
          
          {/* The line itself */}
          <path
            d={pathPoints}
            fill="none"
            stroke={isUptrend ? '#10B981' : '#EF4444'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-md"
          />
          
          {/* Highlight data points on hover */}
          {displayData.map((point, i) => (
            <circle
              key={i}
              cx={`${(i / (displayData.length - 1)) * 100}%`}
              cy={`${getY(point.value)}%`}
              r={hoveredIndex === i ? 3 : 0}
              fill="white"
              stroke={isUptrend ? '#10B981' : '#EF4444'}
              strokeWidth="1.5"
              className="transition-all duration-200"
              style={{ opacity: hoveredIndex === i ? 1 : 0 }}
            />
          ))}
          
          {/* Zoom selection area */}
          {isZooming && startZoomX !== null && zoomRange && (
            <rect
              x={`${Math.min(startZoomX * 100, (zoomRange[0] / (transformedData.length - 1)) * 100)}%`}
              y="0"
              width={`${Math.abs(((zoomRange[1] - zoomRange[0]) / (transformedData.length - 1)) * 100)}%`}
              height="100%"
              fill="rgba(59, 130, 246, 0.2)"
              stroke="rgba(59, 130, 246, 0.5)"
              strokeWidth="1"
            />
          )}
          
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="gradient-up" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.2)" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0.02)" />
            </linearGradient>
            <linearGradient id="gradient-down" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 0.2)" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0.02)" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Value markers on right side */}
        <div className="absolute right-2 top-0 text-xs text-gray-500 backdrop-blur-sm px-1">
          {formatCurrency(maxValue)}
        </div>
        <div className="absolute right-2 bottom-0 text-xs text-gray-500 backdrop-blur-sm px-1">
          {formatCurrency(minValue)}
        </div>
        
        {/* Highlight the last point */}
        <div 
          className="absolute w-3 h-3 rounded-full border-2 shadow-md animate-pulse"
          style={{
            right: '0%',
            top: `${getY(lastValue)}%`,
            transform: 'translate(50%, -50%)',
            backgroundColor: isUptrend ? '#10B981' : '#EF4444',
            borderColor: 'white'
          }}
        />
        
        {/* Tooltip on hover */}
        {hoveredPoint && hoveredIndex !== null && (
          <div 
            className="absolute bg-white/90 shadow-lg rounded-md p-3 text-xs z-10 backdrop-blur-sm border border-gray-200"
            style={{
              left: `${(hoveredIndex / (displayData.length - 1)) * 100}%`,
              top: `${getY(hoveredPoint.value) - 15}%`,
              transform: 'translate(-50%, -100%)',
              minWidth: '120px',
              letterSpacing: '0.01em',
              lineHeight: '1.5'
            }}
          >
            <div className="font-medium text-[11px] mb-1">Date: {hoveredPoint.displayDate}</div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-600">Value:</span>
              <span className="font-bold text-[11px]">{formatCurrency(hoveredPoint.value)}</span>
            </div>
          </div>
        )}
        
        {/* Zoom instructions */}
        {!zoomRange && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-white/30 px-2 py-1 rounded-full backdrop-blur-sm">
            Click & drag to zoom • Double-click to reset
          </div>
        )}
      </div>
      
      {/* Date markers */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        {displayData.filter((_, i) => i % Math.ceil(displayData.length / 5) === 0 || i === displayData.length - 1).map((point, i) => (
          <div key={i} className="backdrop-blur-sm px-1 rounded">{point.displayDate}</div>
        ))}
      </div>
    </div>
  );
};