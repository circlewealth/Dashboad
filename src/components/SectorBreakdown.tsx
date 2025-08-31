import React from 'react';

interface SectorBreakdownProps {
  selectedIndex: string | null;
}

interface SectorData {
  name: string;
  percentage: string;
  color: string;
}

interface IndexSectorData {
  [key: string]: {
    sectors: SectorData[];
  };
}

export const SectorBreakdown: React.FC<SectorBreakdownProps> = ({ selectedIndex }) => {
  // Data for each index's sector breakdown
  const sectorData: IndexSectorData = {
    'NIFTY 50': {
      sectors: [
        { name: 'Financial Services', percentage: '33.5%', color: 'bg-blue-500' },
        { name: 'Information Technology', percentage: '15.2%', color: 'bg-green-500' },
        { name: 'Oil & Gas', percentage: '12.8%', color: 'bg-yellow-500' },
        { name: 'Consumer Goods', percentage: '11.5%', color: 'bg-red-500' },
        { name: 'Automobile', percentage: '6.2%', color: 'bg-purple-500' },
        { name: 'Metals', percentage: '5.8%', color: 'bg-indigo-500' },
        { name: 'Pharma', percentage: '4.9%', color: 'bg-pink-500' },
        { name: 'Infrastructure', percentage: '4.2%', color: 'bg-orange-500' },
        { name: 'Telecom', percentage: '3.6%', color: 'bg-teal-500' },
        { name: 'Others', percentage: '2.3%', color: 'bg-cyan-500' }
      ]
    },
    'Bank NIFTY': {
      sectors: [
        { name: 'Private Banks', percentage: '58.4%', color: 'bg-blue-500' },
        { name: 'Public Sector Banks', percentage: '31.7%', color: 'bg-green-500' },
        { name: 'Financial Institutions', percentage: '9.9%', color: 'bg-yellow-500' }
      ]
    },
    'NIFTY Auto': {
      sectors: [
        { name: 'Passenger Vehicles', percentage: '42.3%', color: 'bg-blue-500' },
        { name: 'Two Wheelers', percentage: '26.8%', color: 'bg-green-500' },
        { name: 'Commercial Vehicles', percentage: '19.5%', color: 'bg-yellow-500' },
        { name: 'Auto Ancillaries', percentage: '11.4%', color: 'bg-red-500' }
      ]
    },
    'NIFTY Pharma': {
      sectors: [
        { name: 'Generic Drugs', percentage: '38.7%', color: 'bg-blue-500' },
        { name: 'Formulations', percentage: '29.5%', color: 'bg-green-500' },
        { name: 'APIs', percentage: '18.4%', color: 'bg-yellow-500' },
        { name: 'Hospitals', percentage: '8.3%', color: 'bg-red-500' },
        { name: 'R&D', percentage: '5.1%', color: 'bg-purple-500' }
      ]
    },
    'NIFTY IT': {
      sectors: [
        { name: 'IT Consulting', percentage: '68.3%', color: 'bg-blue-500' },
        { name: 'Software Development', percentage: '22.5%', color: 'bg-green-500' },
        { name: 'Hardware', percentage: '5.7%', color: 'bg-yellow-500' },
        { name: 'BPO', percentage: '3.5%', color: 'bg-red-500' }
      ]
    },
    'NIFTY FMCG': {
      sectors: [
        { name: 'Personal Care', percentage: '31.6%', color: 'bg-blue-500' },
        { name: 'Food Products', percentage: '28.4%', color: 'bg-green-500' },
        { name: 'Beverages', percentage: '20.7%', color: 'bg-yellow-500' },
        { name: 'Tobacco', percentage: '14.8%', color: 'bg-red-500' },
        { name: 'Household Products', percentage: '4.5%', color: 'bg-purple-500' }
      ]
    }
  };

  // Create normalized keys mapping to handle case differences
  const normalizedKeys: {[key: string]: string} = {};
  Object.keys(sectorData).forEach(key => {
    normalizedKeys[key.toLowerCase()] = key;
  });

  // Fallback sector data if no match is found
  const defaultSectors = [
    { name: 'Large Cap', percentage: '45%', color: 'bg-blue-500' },
    { name: 'Mid Cap', percentage: '30%', color: 'bg-green-500' },
    { name: 'Small Cap', percentage: '25%', color: 'bg-red-500' }
  ];

  // Find the appropriate data for the selected index
  const getDataForIndex = () => {
    if (!selectedIndex) return null;
    
    // Try direct match first
    if (sectorData[selectedIndex]) {
      return {
        title: selectedIndex,
        sectors: sectorData[selectedIndex].sectors
      };
    }
    
    // Try normalized match
    const normalizedKey = normalizedKeys[selectedIndex.toLowerCase()];
    if (normalizedKey && sectorData[normalizedKey]) {
      return {
        title: normalizedKey,
        sectors: sectorData[normalizedKey].sectors
      };
    }
    
    // Try partial match
    for (const key of Object.keys(sectorData)) {
      if (selectedIndex.includes(key) || key.includes(selectedIndex)) {
        return {
          title: key,
          sectors: sectorData[key].sectors
        };
      }
    }
    
    // Use fallback
    return {
      title: selectedIndex,
      sectors: defaultSectors
    };
  };

  if (!selectedIndex) {
    return null;
  }

  const data = getDataForIndex();
  if (!data) return null;

  return (
    <div className="glassmorphic-card p-5 mt-4 animate-fadeIn border-glass">
      <h3 className="text-lg font-semibold mb-1 text-shadow-sm">{data.title} Sector Breakdown</h3>
      <p className="text-sm text-gray-500 mb-4">Data sourced from Yahoo Finance</p>
      
      {/* Stacked bar visualization */}
      <div className="h-8 w-full rounded-full flex mb-6 overflow-hidden glassmorphic">
        {data.sectors.map((sector, idx) => (
          <div 
            key={idx} 
            className={`${sector.color} h-full bg-opacity-60 transition-all duration-300 hover:bg-opacity-80`} 
            style={{ width: sector.percentage }}
            title={`${sector.name}: ${sector.percentage}`}
          ></div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="space-y-3">
        {data.sectors.map((sector, idx) => (
          <div key={idx} className="flex items-center justify-between group">
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full ${sector.color} mr-3 bg-opacity-70 group-hover:bg-opacity-100 transition-all duration-300`}></div>
              <span className="text-sm group-hover:font-medium transition-all duration-200">{sector.name}</span>
            </div>
            <span className="text-sm font-medium">{sector.percentage}</span>
          </div>
        ))}
      </div>
    </div>
  );
}; 