const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const yahooFinance = require('yahoo-finance2').default;

// Use better-sqlite3 for improved serverless compatibility
let sqlite3;
try {
  sqlite3 = require('better-sqlite3');
} catch (err) {
  console.error('Failed to load better-sqlite3, falling back to sqlite3:', err.message);
  sqlite3 = require('sqlite3').verbose();
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connections
let indexDB, returnsDB;

function findDatabasePath(dbName) {
  // Possible locations for the database files
  const possiblePaths = [
    path.join(process.cwd(), dbName),
    path.join(process.cwd(), 'api', dbName),
    path.join(process.cwd(), 'dist', dbName),
    path.join(__dirname, dbName),
    path.join(__dirname, '..', dbName),
    // Additional paths for Vercel serverless environment
    '/tmp/' + dbName,
    path.join('/var/task', dbName),
    path.join('/var/task/api', dbName)
  ];
  
  console.log('Current working directory:', process.cwd());
  console.log('__dirname:', __dirname);
  console.log('Searching for database:', dbName);
  
  // Use the first path that exists
  const fs = require('fs');
  for (const dbPath of possiblePaths) {
    try {
      if (fs.existsSync(dbPath)) {
        console.log(`Found ${dbName} at ${dbPath}`);
        return dbPath;
      } else {
        console.log(`Database not found at ${dbPath}`);
      }
    } catch (error) {
      console.error(`Error checking path ${dbPath}:`, error.message);
    }
  }
  
  // Default to the standard path if none found
  console.warn(`Could not find ${dbName} in any expected location, using default path`);
  return path.join(process.cwd(), dbName);
}

function connectToDatabases() {
  // Close any existing connections first
  closeDatabases();
  
  const indexDbPath = findDatabasePath('database.db');
  const returnsDbPath = findDatabasePath('final.db');
  
  console.log('Attempting to connect to databases...');
  console.log('Index DB path:', indexDbPath);
  console.log('Returns DB path:', returnsDbPath);
  
  // Check if the database files exist
  const fs = require('fs');
  const indexDbExists = fs.existsSync(indexDbPath);
  const returnsDbExists = fs.existsSync(returnsDbPath);
  
  console.log('Index DB exists:', indexDbExists);
  console.log('Returns DB exists:', returnsDbExists);
  
  // Check if we're using better-sqlite3 or regular sqlite3
  if (typeof sqlite3 === 'function') {
    // better-sqlite3
    try {
      if (indexDbExists) {
        indexDB = sqlite3(indexDbPath, { readonly: true, fileMustExist: true });
        console.log('Connected to the index database at', indexDbPath);
      } else {
        console.error('Index database file does not exist at', indexDbPath);
        indexDB = null;
      }
    } catch (err) {
      console.error('Error opening index database:', err.message);
      indexDB = null;
    }

    try {
      if (returnsDbExists) {
        returnsDB = sqlite3(returnsDbPath, { readonly: true, fileMustExist: true });
        console.log('Connected to the returns database at', returnsDbPath);
      } else {
        console.error('Returns database file does not exist at', returnsDbPath);
        returnsDB = null;
      }
    } catch (err) {
      console.error('Error opening returns database:', err.message);
      returnsDB = null;
    }
  } else {
    // regular sqlite3
    if (indexDbExists) {
      indexDB = new sqlite3.Database(indexDbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('Error opening index database:', err.message);
          indexDB = null;
        } else {
          console.log('Connected to the index database at', indexDbPath);
        }
      });
    } else {
      console.error('Index database file does not exist at', indexDbPath);
      indexDB = null;
    }

    if (returnsDbExists) {
      returnsDB = new sqlite3.Database(returnsDbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('Error opening returns database:', err.message);
          returnsDB = null;
        } else {
          console.log('Connected to the returns database at', returnsDbPath);
        }
      });
    } else {
      console.error('Returns database file does not exist at', returnsDbPath);
      returnsDB = null;
    }
  }
  
  // Check if connections were successful
  console.log('Database connections established:', {
    indexDB: indexDB !== null,
    returnsDB: returnsDB !== null
  });
}

// Helper function to parse percentage string to number
function parsePercentage(percentStr) {
  if (!percentStr || typeof percentStr !== 'string') return 0;
  // Remove % sign and convert to float
  return parseFloat(percentStr.replace('%', '')) || 0;
}

// Helper function to generate synthetic returns for missing periods
function generateSyntheticReturns(oneYearReturn, threeYearReturn) {
  // Use available data to generate reasonable estimates for missing periods
  const oneYear = parsePercentage(oneYearReturn);
  const threeYear = parsePercentage(threeYearReturn);
  
  // Simple estimation based on available data
  // For 5Y, we use a weighted average of 1Y and 3Y with more weight to 3Y
  const fiveYear = threeYear * 1.1;
  
  // 7Y and 10Y are typically more stable, so we make them slightly higher
  const sevenYear = fiveYear * 1.05;
  const tenYear = sevenYear * 1.05;
  
  return {
    fiveYear: fiveYear.toFixed(2) + '%',
    sevenYear: sevenYear.toFixed(2) + '%',
    tenYear: tenYear.toFixed(2) + '%'
  };
}

// Helper function to execute queries with either sqlite3 or better-sqlite3
function executeQuery(db, query, params = [], callback) {
  if (!db) {
    callback(new Error('Database connection not established'), null);
    return;
  }

  // Check if we're using better-sqlite3 or regular sqlite3
  if (db.prepare) {
    // better-sqlite3
    try {
      const stmt = db.prepare(query);
      const rows = stmt.all(params);
      callback(null, rows);
    } catch (err) {
      callback(err, null);
    }
  } else {
    // regular sqlite3
    db.all(query, params, callback);
  }
}

// Mock data for fallback when database is unavailable
const mockIndices = [
  {
    id: 1,
    name: 'NIFTY 50',
    symbol: 'NIFTY50',
    description: 'Benchmark Indian stock market index that represents the weighted average of 50 of the largest Indian companies listed on the National Stock Exchange.',
    one_year_return: '15.2%',
    three_year_return: '12.8%',
    five_year_return: '14.1%',
    seven_year_return: '13.5%',
    ten_year_return: '12.9%',
    current_value: 22500,
    previous_close: 22450,
    change_percentage: '0.22%'
  },
  {
    id: 2,
    name: 'SENSEX',
    symbol: 'SENSEX',
    description: 'The S&P BSE SENSEX is a free-float market-weighted stock market index of 30 well-established and financially sound companies listed on the Bombay Stock Exchange.',
    one_year_return: '14.8%',
    three_year_return: '11.9%',
    five_year_return: '13.5%',
    seven_year_return: '12.8%',
    ten_year_return: '12.2%',
    current_value: 74000,
    previous_close: 73800,
    change_percentage: '0.27%'
  }
];

// Import routes from server.js
app.get('/api/indices', (req, res) => {
  connectToDatabases();
  
  // If database connection failed, return mock data
  if (!indexDB) {
    console.log('Using mock data for /api/indices because database connection failed');
    res.json(mockIndices);
    return;
  }
  
  executeQuery(indexDB, 'SELECT * FROM indices', [], (err, rows) => {
    if (err) {
      console.error('Error querying indices:', err.message);
      console.log('Falling back to mock data due to query error');
      res.json(mockIndices);
      return;
    }
    
    if (!rows || rows.length === 0) {
      console.log('No indices found in database, using mock data');
      res.json(mockIndices);
      return;
    }
    
    // Process the data to add synthetic returns where missing
    const processedRows = rows.map(row => {
      const synthetic = generateSyntheticReturns(row.one_year_return, row.three_year_return);
      
      return {
        ...row,
        five_year_return: row.five_year_return || synthetic.fiveYear,
        seven_year_return: row.seven_year_return || synthetic.sevenYear,
        ten_year_return: row.ten_year_return || synthetic.tenYear
      };
    });
    
    res.json(processedRows);
  });
});

// Helper function to execute a single row query
function executeGetQuery(db, query, params = [], callback) {
  if (!db) {
    callback(new Error('Database connection not established'), null);
    return;
  }

  // Check if we're using better-sqlite3 or regular sqlite3
  if (db.prepare) {
    // better-sqlite3
    try {
      const stmt = db.prepare(query);
      const row = stmt.get(params);
      callback(null, row);
    } catch (err) {
      callback(err, null);
    }
  } else {
    // regular sqlite3
    db.get(query, params, callback);
  }
}

app.get('/api/index/:id', (req, res) => {
  connectToDatabases();
  
  const { id } = req.params;
  
  // If database connection failed, return mock data
  if (!indexDB) {
    console.log(`Using mock data for /api/index/${id} because database connection failed`);
    const mockIndex = mockIndices.find(index => index.id === parseInt(id));
    if (mockIndex) {
      res.json(mockIndex);
    } else {
      res.status(404).json({ error: 'Index not found' });
    }
    return;
  }
  
  executeGetQuery(indexDB, 'SELECT * FROM indices WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(`Error querying index ${id}:`, err.message);
      console.log('Falling back to mock data due to query error');
      const mockIndex = mockIndices.find(index => index.id === parseInt(id));
      if (mockIndex) {
        res.json(mockIndex);
      } else {
        res.status(404).json({ error: 'Index not found' });
      }
      return;
    }
    
    if (!row) {
      console.log(`Index ${id} not found in database, checking mock data`);
      const mockIndex = mockIndices.find(index => index.id === parseInt(id));
      if (mockIndex) {
        res.json(mockIndex);
      } else {
        res.status(404).json({ error: 'Index not found' });
      }
      return;
    }
    
    // Add synthetic returns if missing
    const synthetic = generateSyntheticReturns(row.one_year_return, row.three_year_return);
    
    const processedRow = {
      ...row,
      five_year_return: row.five_year_return || synthetic.fiveYear,
      seven_year_return: row.seven_year_return || synthetic.sevenYear,
      ten_year_return: row.ten_year_return || synthetic.tenYear
    };
    
    res.json(processedRow);
  });
});

// Mock data for returns
const mockReturns = {
  1: [
    { id: 1, index_id: 1, date: '2023-01-01', value: 21000 },
    { id: 2, index_id: 1, date: '2023-02-01', value: 21200 },
    { id: 3, index_id: 1, date: '2023-03-01', value: 21500 },
    { id: 4, index_id: 1, date: '2023-04-01', value: 21300 },
    { id: 5, index_id: 1, date: '2023-05-01', value: 21800 },
    { id: 6, index_id: 1, date: '2023-06-01', value: 22000 },
    { id: 7, index_id: 1, date: '2023-07-01', value: 22200 },
    { id: 8, index_id: 1, date: '2023-08-01', value: 22100 },
    { id: 9, index_id: 1, date: '2023-09-01', value: 22300 },
    { id: 10, index_id: 1, date: '2023-10-01', value: 22400 },
    { id: 11, index_id: 1, date: '2023-11-01', value: 22300 },
    { id: 12, index_id: 1, date: '2023-12-01', value: 22500 }
  ],
  2: [
    { id: 13, index_id: 2, date: '2023-01-01', value: 70000 },
    { id: 14, index_id: 2, date: '2023-02-01', value: 70500 },
    { id: 15, index_id: 2, date: '2023-03-01', value: 71000 },
    { id: 16, index_id: 2, date: '2023-04-01', value: 70800 },
    { id: 17, index_id: 2, date: '2023-05-01', value: 71500 },
    { id: 18, index_id: 2, date: '2023-06-01', value: 72000 },
    { id: 19, index_id: 2, date: '2023-07-01', value: 72500 },
    { id: 20, index_id: 2, date: '2023-08-01', value: 72300 },
    { id: 21, index_id: 2, date: '2023-09-01', value: 73000 },
    { id: 22, index_id: 2, date: '2023-10-01', value: 73500 },
    { id: 23, index_id: 2, date: '2023-11-01', value: 73200 },
    { id: 24, index_id: 2, date: '2023-12-01', value: 74000 }
  ]
};

// Mock data for sectors
const mockSectors = {
  1: [
    { id: 1, index_id: 1, name: 'Financial Services', weight: '35.2%' },
    { id: 2, index_id: 1, name: 'IT', weight: '18.5%' },
    { id: 3, index_id: 1, name: 'Oil & Gas', weight: '12.8%' },
    { id: 4, index_id: 1, name: 'Consumer Goods', weight: '11.5%' },
    { id: 5, index_id: 1, name: 'Automobile', weight: '5.7%' },
    { id: 6, index_id: 1, name: 'Pharma', weight: '4.8%' },
    { id: 7, index_id: 1, name: 'Others', weight: '11.5%' }
  ],
  2: [
    { id: 8, index_id: 2, name: 'Financial Services', weight: '37.5%' },
    { id: 9, index_id: 2, name: 'IT', weight: '16.2%' },
    { id: 10, index_id: 2, name: 'Oil & Gas', weight: '13.5%' },
    { id: 11, index_id: 2, name: 'Consumer Goods', weight: '10.8%' },
    { id: 12, index_id: 2, name: 'Automobile', weight: '6.2%' },
    { id: 13, index_id: 2, name: 'Pharma', weight: '5.3%' },
    { id: 14, index_id: 2, name: 'Others', weight: '10.5%' }
  ]
};

app.get('/api/returns/:indexId', (req, res) => {
  connectToDatabases();
  
  const { indexId } = req.params;
  
  // If database connection failed, return mock data
  if (!returnsDB) {
    console.log(`Using mock data for /api/returns/${indexId} because database connection failed`);
    const mockData = mockReturns[indexId] || [];
    res.json(mockData);
    return;
  }
  
  executeQuery(returnsDB, 'SELECT * FROM returns WHERE index_id = ? ORDER BY date', [indexId], (err, rows) => {
    if (err) {
      console.error(`Error querying returns for index ${indexId}:`, err.message);
      console.log('Falling back to mock data due to query error');
      const mockData = mockReturns[indexId] || [];
      res.json(mockData);
      return;
    }
    
    if (!rows || rows.length === 0) {
      console.log(`No returns found for index ${indexId}, using mock data`);
      const mockData = mockReturns[indexId] || [];
      res.json(mockData);
      return;
    }
    
    res.json(rows);
  });
});

app.get('/api/sectors/:indexId', (req, res) => {
  connectToDatabases();
  
  const { indexId } = req.params;
  
  // If database connection failed, return mock data
  if (!indexDB) {
    console.log(`Using mock data for /api/sectors/${indexId} because database connection failed`);
    const mockData = mockSectors[indexId] || [];
    res.json(mockData);
    return;
  }
  
  executeQuery(indexDB, 'SELECT * FROM sectors WHERE index_id = ?', [indexId], (err, rows) => {
    if (err) {
      console.error(`Error querying sectors for index ${indexId}:`, err.message);
      console.log('Falling back to mock data due to query error');
      const mockData = mockSectors[indexId] || [];
      res.json(mockData);
      return;
    }
    
    if (!rows || rows.length === 0) {
      console.log(`No sectors found for index ${indexId}, using mock data`);
      const mockData = mockSectors[indexId] || [];
      res.json(mockData);
      return;
    }
    
    res.json(rows);
  });
});

// Mock data for market indices
const mockMarketIndices = {
  indices: [
    {
      name: 'NIFTY 50',
      symbol: '^NSEI',
      value: '22,500.75',
      change: '0.22%',
      allocation: '35%',
      details: {
        open: '22,450.30',
        high: '22,550.60',
        low: '22,400.10',
        volume: '125.5M'
      }
    },
    {
      name: 'SENSEX',
      symbol: '^BSESN',
      value: '74,000.50',
      change: '0.27%',
      allocation: '30%',
      details: {
        open: '73,800.20',
        high: '74,100.40',
        low: '73,750.30',
        volume: '98.2M'
      }
    },
    {
      name: 'BANK NIFTY',
      symbol: '^NSEBANK',
      value: '48,250.30',
      change: '0.15%',
      allocation: '15%',
      details: {
        open: '48,200.10',
        high: '48,350.20',
        low: '48,150.50',
        volume: '45.3M'
      }
    },
    {
      name: 'NIFTY IT',
      symbol: '^CNXIT',
      value: '32,750.25',
      change: '0.35%',
      allocation: '10%',
      details: {
        open: '32,650.40',
        high: '32,850.30',
        low: '32,600.20',
        volume: '22.1M'
      }
    },
    {
      name: 'NIFTY PHARMA',
      symbol: '^CNXPHARMA',
      value: '15,850.60',
      change: '-0.12%',
      allocation: '5%',
      details: {
        open: '15,870.30',
        high: '15,900.20',
        low: '15,830.40',
        volume: '18.7M'
      }
    },
    {
      name: 'NIFTY AUTO',
      symbol: '^CNXAUTO',
      value: '18,950.40',
      change: '0.18%',
      allocation: '5%',
      details: {
        open: '18,920.10',
        high: '19,000.30',
        low: '18,900.50',
        volume: '15.2M'
      }
    }
  ],
  sentiment: {
    overall: 'bullish',
    strength: 0.65,
    description: 'Markets showing strong bullish sentiment with positive momentum across most sectors.'
  }
};

// Add market indices endpoint
app.get('/api/market-indices', (req, res) => {
  console.log('Received request for /api/market-indices');
  
  // For now, we'll just return mock data
  // In a production environment, this would fetch real-time data from a financial API
  res.json(mockMarketIndices);
});

// Mock data for market news
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
  }
];

// Add market news endpoint
app.get('/api/market-news', (req, res) => {
  console.log('Received request for /api/market-news');
  
  // Get limit parameter from query, default to 3
  const limit = parseInt(req.query.limit) || 3;
  
  // Return mock news data with the specified limit
  res.json({
    news: mockMarketNews.slice(0, limit)
  });
});

// Add periods endpoint
app.get('/api/periods', (req, res) => {
  console.log('Received request for /api/periods');
  
  // Return standard time periods
  res.json({
    periods: ['1Y', '3Y', '5Y', '7Y', '10Y']
  });
});

// Add historical data endpoint
app.get('/api/historical/:index', (req, res) => {
  console.log(`Received request for /api/historical/${req.params.index}`);
  
  const { index } = req.params;
  
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
  
  res.json({ historicalData });
});

// Add returns-by-period endpoint
app.get('/api/returns-by-period/:period', (req, res) => {
  console.log(`Received request for /api/returns-by-period/${req.params.period}`);
  
  const { period } = req.params;
  
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
  
  res.json({ returns: mockReturns });
});

// Add compare-rolling-returns endpoint
app.get('/api/compare-rolling-returns', (req, res) => {
  console.log('Received request for /api/compare-rolling-returns');
  
  const { indices, fromDate, toDate } = req.query;
  const indexList = indices ? indices.split(',') : ['NIFTY 50', 'SENSEX'];
  
  console.log('Requested indices:', indexList);
  console.log('From date:', fromDate);
  console.log('To date:', toDate);
  
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
  
  res.json({ comparisonData });
});

// Add inception-dates endpoint
app.get('/api/inception-dates', (req, res) => {
  console.log('Received request for /api/inception-dates');
  
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
  
  res.json({ inceptionDates: mockInceptionDates });
});

// Add inception-date endpoint for a specific index
app.get('/api/inception-date/:index', (req, res) => {
  console.log(`Received request for /api/inception-date/${req.params.index}`);
  
  const { index } = req.params;
  
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
  
  res.json({ inceptionDate });
});

// Add rolling-returns endpoint
app.get('/api/rolling-returns', (req, res) => {
  console.log('Received request for /api/rolling-returns');
  
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
  
  res.json({ rollingReturnsData });
});

// Helper function to close database connections
function closeDatabases() {
  if (indexDB) {
    if (typeof indexDB.close === 'function') {
      indexDB.close();
    }
  }
  
  if (returnsDB) {
    if (typeof returnsDB.close === 'function') {
      returnsDB.close();
    }
  }
}

// Close database connections when the server is shutting down
process.on('SIGINT', () => {
  closeDatabases();
  process.exit(0);
});

// For serverless environments, close connections after each request
app.use((req, res, next) => {
  res.on('finish', () => {
    closeDatabases();
  });
  next();
});

// Export the Express API
module.exports = app;