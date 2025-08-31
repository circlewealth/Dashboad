// market-data.js
const { json } = require('micro');
const { parse } = require('url');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse the URL and query parameters
  const { pathname, query } = parse(req.url, true);
  const path = pathname.split('/');
  const endpoint = path[1]; // The first segment after /api/
  
  console.log(`Received request for ${pathname}`);

  // Handle different endpoints
  switch (endpoint) {
    case 'market-indices':
      return handleMarketIndices(req, res);
    case 'market-news':
      return handleMarketNews(req, res, query);
    case 'periods':
      return handlePeriods(req, res);
    case 'indices':
      return handleIndices(req, res);
    case 'rolling-returns':
      return handleRollingReturns(req, res);
    case 'historical':
      return handleHistorical(req, res, path[2]); // path[2] is the index
    case 'returns':
      return handleReturns(req, res, path[2]); // path[2] is the index
    case 'returns-by-period':
      return handleReturnsByPeriod(req, res, path[2]); // path[2] is the period
    case 'compare-rolling-returns':
      return handleCompareRollingReturns(req, res, query);
    case 'inception-dates':
      return handleInceptionDates(req, res);
    case 'inception-date':
      return handleInceptionDate(req, res, path[2]); // path[2] is the index
    default:
      return res.status(404).json({ error: 'Endpoint not found' });
  }
};

// Handler functions for each endpoint
function handleMarketIndices(req, res) {
  const mockMarketIndices = {
    indices: [
      {
        name: 'NIFTY 50',
        value: 22453.30,
        change: 125.80,
        percentChange: 0.56,
        trend: 'up'
      },
      {
        name: 'SENSEX',
        value: 73852.94,
        change: 408.86,
        percentChange: 0.55,
        trend: 'up'
      },
      {
        name: 'BANK NIFTY',
        value: 48325.45,
        change: -102.30,
        percentChange: -0.21,
        trend: 'down'
      },
      {
        name: 'NIFTY IT',
        value: 37562.80,
        change: 452.60,
        percentChange: 1.22,
        trend: 'up'
      },
      {
        name: 'NIFTY PHARMA',
        value: 18734.25,
        change: 78.45,
        percentChange: 0.42,
        trend: 'up'
      },
      {
        name: 'NIFTY AUTO',
        value: 21456.70,
        change: -45.30,
        percentChange: -0.21,
        trend: 'down'
      }
    ],
    sentiment: {
      overall: 'bullish',
      strength: 0.65
    }
  };

  return res.json(mockMarketIndices);
}

function handleMarketNews(req, res, query) {
  // Get limit from query parameters, default to 3
  const limit = query.limit ? parseInt(query.limit, 10) : 3;

  // Mock market news data
  const mockMarketNews = [
    {
      title: 'RBI holds key interest rates, maintains accommodative stance',
      timeAgo: '20 minutes ago',
      category: 'Economic Policy',
      categoryColor: 'blue',
      link: 'https://www.livemint.com/economy/rbi-monetary-policy-committee-keeps-repo-rate-unchanged-at-6-5-for-8th-time-in-a-row-11718095282454.html',
      date: new Date().toISOString()
    },
    {
      title: 'IT stocks rally, Infosys up 3.2% on strong global cues',
      timeAgo: '1 hour ago',
      category: 'Stock Movement',
      categoryColor: 'green',
      link: 'https://economictimes.indiatimes.com/markets/stocks/news/it-stocks-in-demand-infosys-tcs-hcl-tech-gain-up-to-4/articleshow/108512733.cms',
      date: new Date().toISOString()
    },
    {
      title: 'Q1 results: HDFC Bank reports 19% growth in net profit',
      timeAgo: '3 hours ago',
      category: 'Earnings',
      categoryColor: 'yellow',
      link: 'https://www.business-standard.com/finance/news/hdfc-bank-q1-results-net-profit-rises-19-to-rs-16-975-crore-124071500503_1.html',
      date: new Date().toISOString()
    },
    {
      title: 'Crude oil prices fall as Middle East tensions ease',
      timeAgo: '5 hours ago',
      category: 'Commodities',
      categoryColor: 'orange',
      link: 'https://www.cnbc.com/2024/07/15/oil-prices-fall-as-middle-east-tensions-ease.html',
      date: new Date().toISOString()
    },
    {
      title: 'Government announces new PLI scheme for manufacturing sector',
      timeAgo: '8 hours ago',
      category: 'Policy',
      categoryColor: 'purple',
      link: 'https://economictimes.indiatimes.com/news/economy/policy/government-announces-new-pli-scheme-for-manufacturing-sector/articleshow/108513456.cms',
      date: new Date().toISOString()
    }
  ];

  // Return limited news items
  return res.json({ news: mockMarketNews.slice(0, limit) });
}

function handlePeriods(req, res) {
  // Return standard time periods
  return res.json({
    periods: ['1Y', '3Y', '5Y', '7Y', '10Y']
  });
}

function handleIndices(req, res) {
  // Mock indices data
  const mockIndices = {
    indices: ['NIFTY 50', 'SENSEX', 'BANK NIFTY', 'NIFTY IT', 'NIFTY PHARMA', 'NIFTY AUTO']
  };

  return res.json(mockIndices);
}

function handleRollingReturns(req, res) {
  // Generate mock rolling returns data
  const rollingReturnsData = [
    {
      period: '1Y',
      returns: {
        'NIFTY 50': '15.2%',
        'SENSEX': '14.8%',
        'BANK NIFTY': '18.5%',
        'NIFTY IT': '22.3%',
        'NIFTY PHARMA': '12.7%',
        'NIFTY AUTO': '16.9%'
      }
    },
    {
      period: '3Y',
      returns: {
        'NIFTY 50': '12.4%',
        'SENSEX': '11.9%',
        'BANK NIFTY': '14.2%',
        'NIFTY IT': '18.7%',
        'NIFTY PHARMA': '10.5%',
        'NIFTY AUTO': '13.8%'
      }
    },
    {
      period: '5Y',
      returns: {
        'NIFTY 50': '11.8%',
        'SENSEX': '11.2%',
        'BANK NIFTY': '13.5%',
        'NIFTY IT': '17.2%',
        'NIFTY PHARMA': '9.8%',
        'NIFTY AUTO': '12.5%'
      }
    },
    {
      period: '7Y',
      returns: {
        'NIFTY 50': '10.9%',
        'SENSEX': '10.5%',
        'BANK NIFTY': '12.8%',
        'NIFTY IT': '15.6%',
        'NIFTY PHARMA': '9.2%',
        'NIFTY AUTO': '11.7%'
      }
    },
    {
      period: '10Y',
      returns: {
        'NIFTY 50': '10.2%',
        'SENSEX': '9.8%',
        'BANK NIFTY': '11.5%',
        'NIFTY IT': '14.3%',
        'NIFTY PHARMA': '8.7%',
        'NIFTY AUTO': '10.9%'
      }
    }
  ];
  
  return res.json({ rollingReturnsData });
}

function handleHistorical(req, res, index) {
  // Generate mock historical data
  const historicalData = [];
  const today = new Date();
  const startValue = 20000 + Math.random() * 5000;
  
  // Generate data for the past 365 days
  for (let i = 365; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Calculate a somewhat realistic value with some randomness
    const dayFactor = 1 + (Math.random() * 0.02 - 0.01); // -1% to +1%
    const trendFactor = 1 + (0.0001 * (365 - i)); // Slight upward trend
    
    const value = i === 365 
      ? startValue 
      : historicalData[historicalData.length - 1].value * dayFactor * trendFactor;
    
    historicalData.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100
    });
  }
  
  return res.json({ historicalData });
}

function handleReturns(req, res, index) {
  // Generate mock returns data
  const mockReturns = {
    'NIFTY 50': {
      '1Y': 15.2,
      '3Y': 12.4,
      '5Y': 11.8,
      '7Y': 10.9,
      '10Y': 10.2
    },
    'SENSEX': {
      '1Y': 14.8,
      '3Y': 11.9,
      '5Y': 11.2,
      '7Y': 10.5,
      '10Y': 9.8
    },
    'BANK NIFTY': {
      '1Y': 18.5,
      '3Y': 14.2,
      '5Y': 13.5,
      '7Y': 12.8,
      '10Y': 11.5
    },
    'NIFTY IT': {
      '1Y': 22.3,
      '3Y': 18.7,
      '5Y': 17.2,
      '7Y': 15.6,
      '10Y': 14.3
    },
    'NIFTY PHARMA': {
      '1Y': 12.7,
      '3Y': 10.5,
      '5Y': 9.8,
      '7Y': 9.2,
      '10Y': 8.7
    },
    'NIFTY AUTO': {
      '1Y': 16.9,
      '3Y': 13.8,
      '5Y': 12.5,
      '7Y': 11.7,
      '10Y': 10.9
    }
  };
  
  // Return the mock data for the requested index or a default
  return res.json({ returns: mockReturns[index] || mockReturns['NIFTY 50'] });
}

function handleReturnsByPeriod(req, res, period) {
  // Generate mock returns data for the specified period
  const mockReturns = {};
  const indices = ['NIFTY 50', 'SENSEX', 'BANK NIFTY', 'NIFTY IT', 'NIFTY PHARMA', 'NIFTY AUTO'];
  
  indices.forEach(index => {
    // Generate a realistic return value based on the period
    let baseReturn;
    switch(period) {
      case '1Y':
        baseReturn = 12 + Math.random() * 8; // 12-20%
        break;
      case '3Y':
        baseReturn = 10 + Math.random() * 6; // 10-16%
        break;
      case '5Y':
        baseReturn = 11 + Math.random() * 5; // 11-16%
        break;
      case '7Y':
        baseReturn = 10 + Math.random() * 4; // 10-14%
        break;
      case '10Y':
        baseReturn = 9 + Math.random() * 4; // 9-13%
        break;
      default:
        baseReturn = 10 + Math.random() * 5; // 10-15%
    }
    
    // Add some variation per index
    const indexFactor = index === 'NIFTY IT' ? 1.2 : 
                       index === 'BANK NIFTY' ? 1.1 : 
                       index === 'NIFTY PHARMA' ? 0.9 : 1;
    
    mockReturns[index] = parseFloat((baseReturn * indexFactor).toFixed(2));
  });
  
  return res.json({ returns: mockReturns });
}

function handleCompareRollingReturns(req, res, query) {
  const { indices, fromDate, toDate } = query;
  const indexList = indices ? indices.split(',') : ['NIFTY 50', 'SENSEX'];
  
  // Generate mock comparison data
  const comparisonData = {};
  const periods = ['1Y', '3Y', '5Y', '7Y', '10Y'];
  
  periods.forEach(period => {
    // Generate dates (monthly for the past year)
    const dates = [];
    const today = new Date();
    for (let i = 12; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // Generate values for each index
    const indexValues = {};
    indexList.forEach(index => {
      const values = [];
      let baseValue = 100; // Start at 100 (percentage)
      
      dates.forEach((date, i) => {
        if (i === 0) {
          values.push(baseValue);
        } else {
          // Generate a somewhat realistic monthly return
          const monthlyChange = (Math.random() * 6) - 2; // -2% to +4%
          baseValue = baseValue * (1 + (monthlyChange / 100));
          values.push(parseFloat(baseValue.toFixed(2)));
        }
      });
      
      indexValues[index] = values;
    });
    
    comparisonData[period] = {
      dates,
      indices: indexValues
    };
  });
  
  return res.json({ comparisonData });
}

function handleInceptionDates(req, res) {
  // Mock inception dates for various indices
  const mockInceptionDates = {
    'NIFTY 50': '1995-04-22',
    'SENSEX': '1986-01-01',
    'BANK NIFTY': '2000-06-12',
    'NIFTY IT': '1996-01-01',
    'NIFTY PHARMA': '2001-01-01',
    'NIFTY AUTO': '2004-01-01',
    'NIFTY FMCG': '1996-01-01',
    'NIFTY METAL': '2005-01-01',
    'NIFTY REALTY': '2007-01-01'
  };
  
  return res.json({ inceptionDates: mockInceptionDates });
}

function handleInceptionDate(req, res, index) {
  // Mock inception dates for various indices
  const mockInceptionDates = {
    'NIFTY 50': '1995-04-22',
    'SENSEX': '1986-01-01',
    'BANK NIFTY': '2000-06-12',
    'NIFTY IT': '1996-01-01',
    'NIFTY PHARMA': '2001-01-01',
    'NIFTY AUTO': '2004-01-01',
    'NIFTY FMCG': '1996-01-01',
    'NIFTY METAL': '2005-01-01',
    'NIFTY REALTY': '2007-01-01'
  };
  
  // Return the inception date for the requested index, or null if not found
  const inceptionDate = mockInceptionDates[index] || null;
  
  return res.json({ inceptionDate });
}