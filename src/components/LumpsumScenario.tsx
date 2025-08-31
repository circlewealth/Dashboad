import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';

interface LumpsumScenarioProps {
  period: string;
}

const LumpsumScenario: React.FC<LumpsumScenarioProps> = ({ period }) => {
  const [investment, setInvestment] = useState<string>("1000");
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showMessage, setShowMessage] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
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
  
  // Generate some mock data for the chart
  const generateChartData = () => {
    try {
      const data = [];
      const years = parseInt(period?.replace('Y', '') || '1');
      const months = years * 12;
      const initialAmount = parseFloat(investment) || 1000;
      
      // Assume a conservative 10% annual growth rate for demonstration
      const monthlyGrowthRate = Math.pow(1.10, 1/12) - 1;
      
      for (let i = 0; i <= months; i++) {
        const growthFactor = Math.pow(1 + monthlyGrowthRate, i);
        const currentValue = initialAmount * growthFactor;
        
        // Create date for x-axis - go backwards from today
        const date = new Date();
        date.setMonth(date.getMonth() - (months - i));
        
        data.push({
          month: i,
          value: currentValue,
          date: `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`
        });
      }
      
      return data;
    } catch (err) {
      console.error("Error generating chart data:", err);
      // Return some fallback data
      return [
        { month: 0, value: 1000, date: 'Jan 2023' },
        { month: 12, value: 1100, date: 'Jan 2024' }
      ];
    }
  };
  
  const chartData = generateChartData();
  
  const handleSave = () => {
    setIsSaved(true);
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
    }, 3000);
  };
  
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '₹0.00';
    return `₹${value.toFixed(2)}`;
  };
  
  const getSafeInvestmentValue = () => {
    try {
      return parseFloat(investment) || 1000;
    } catch {
      return 1000;
    }
  };
  
  const getSafeFinalValue = () => {
    try {
      return chartData[chartData.length - 1]?.value || 0;
    } catch {
      return 0;
    }
  };
  
  const calculateGrowthPercentage = () => {
    try {
      const initialValue = getSafeInvestmentValue();
      const finalValue = getSafeFinalValue();
      return ((finalValue / initialValue) - 1) * 100;
    } catch {
      return 0;
    }
  };
  
  return (
    <div className="glassmorphic-card p-6 border-glass mb-8">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-lg font-medium text-gray-700">Scenario for Lumpsum</h3>
          <span className="text-sm text-gray-500">investment of</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
            <input 
              type="text" 
              value={investment}
              onChange={(e) => {
                // Only allow numbers
                if (/^\d*\.?\d*$/.test(e.target.value)) {
                  setInvestment(e.target.value);
                  setIsSaved(false);
                }
              }}
              className="w-24 px-6 py-1 rounded border border-gray-300 text-right"
            />
          </div>
          <span className="text-sm text-gray-500">for {period || '1Y'} |</span>
          <span className="text-sm text-gray-500">Rolling returns chart</span>
        </div>
        
        <button 
          className={`flex items-center ${isSaved ? 'bg-green-500' : 'bg-teal-500 hover:bg-teal-600'} text-white px-4 py-2 rounded transition`}
          onClick={handleSave}
        >
          {isSaved ? '✓ Saved' : '+ Save'}
        </button>
      </div>
      
      {showMessage && (
        <div className="bg-green-100 text-green-700 p-2 rounded mb-4 text-sm">
          Scenario saved successfully!
        </div>
      )}
      
      <div className="mt-4 h-64">
        <ResponsiveContainer 
          width="100%" 
          height="100%" 
          key={`lumpsum-chart-${period}-${investment}-${windowSize.width}`}
        >
          <AreaChart 
            data={chartData} 
            margin={{ top: 15, right: 15, left: 15, bottom: 15 }}
          >
            <defs>
              <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }}
              tickMargin={10}
              interval="equidistantPreserveStart"
              padding={{ left: 10, right: 10 }}
              height={40}
            />
            <YAxis 
              tickFormatter={(value) => `₹${value.toFixed(0)}`}
              tick={{ fontSize: 10 }}
              width={70}
              padding={{ top: 15, bottom: 15 }}
              domain={['auto', 'auto']}
            />
            <Tooltip 
              formatter={(value: any) => [formatCurrency(value), 'Value']}
              labelFormatter={(label) => `Date: ${label || ''}`}
              contentStyle={{ 
                fontSize: '12px',
                padding: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px'
              }}
              cursor={{stroke: 'rgba(0,0,0,0.2)', strokeWidth: 1, strokeDasharray: '5 5'}}
            />
            <ReferenceLine 
              y={getSafeInvestmentValue()} 
              stroke="#666" 
              strokeDasharray="3 3" 
              label={{ 
                value: 'Initial Investment', 
                position: 'insideBottomRight',
                fontSize: 10
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#10B981" 
              fillOpacity={1} 
              fill="url(#colorInvestment)" 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex justify-between text-sm">
        <div className="text-gray-500">
          <div>Initial: <span className="font-medium">₹{getSafeInvestmentValue().toFixed(2)}</span></div>
          <div>
            Final: <span className="font-medium text-green-600">
              ₹{getSafeFinalValue().toFixed(2)}
            </span>
          </div>
        </div>
        <div className="text-gray-500">
          <div>
            Growth: <span className="font-medium text-green-600">
              {calculateGrowthPercentage().toFixed(2)}%
            </span>
          </div>
          <div>Period: <span className="font-medium">{period || '1Y'}</span></div>
        </div>
      </div>
    </div>
  );
};

export default LumpsumScenario; 