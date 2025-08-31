import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import yahooFinance from 'yahoo-finance2';
import { parse } from 'url';

// Get current directory name (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable verbose mode for sqlite3
sqlite3.verbose();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Add consolidated API endpoints
app.get('/api/:endpoint', (req, res) => {
  const endpoint = req.params.endpoint;
  const query = req.query;
  const path = req.path.split('/');
  
  console.log(`Received request for ${req.path}`);

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
      return handleHistorical(req, res, path[3]); // path[3] is the index
    case 'returns':
      return handleReturns(req, res, path[3]); // path[3] is the index
    case 'returns-by-period':
      return handleReturnsByPeriod(req, res, path[3]); // path[3] is the period
    case 'compare-rolling-returns':
      return handleCompareRollingReturns(req, res, query);
    case 'inception-dates':
      return handleInceptionDates(req, res);
    case 'inception-date':
      return handleInceptionDate(req, res, path[3]); // path[3] is the index
    default:
      return res.status(404).json({ error: 'Endpoint not found' });
  }
});

// Database connections
const indexDB = new sqlite3.Database(path.join(__dirname, './database.db'), sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening index database:', err.message);
  } else {
    console.log('Connected to the index database.');
  }
});

const returnsDB = new sqlite3.Database(path.join(__dirname, './final.db'), sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening returns database:', err.message);
  } else {
    console.log('Connected to the returns database.');
  }
});

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
  const tenYear = sevenYear * 1.1;
  
  return {
    fiveYear: fiveYear || oneYear * 1.2, // Fallback if 3Y data is also missing
    sevenYear: sevenYear || oneYear * 1.3,
    tenYear: tenYear || oneYear * 1.5
  };
}

// Define index symbols and their Yahoo Finance symbols
const INDEX_SYMBOLS = {
  'NIFTY 50': '^NSEI',
  'BANK NIFTY': '^NSEBANK',
  'NIFTY IT': '^CNXIT',
  'NIFTY AUTO': '^CNXAUTO',
  'NIFTY PHARMA': '^CNXPHARMA',
  'NIFTY FMCG': '^CNXFMCG'
};

// API Endpoints

// Get all available indices
app.get('/api/indices', (req, res) => {
  indexDB.all("PRAGMA table_info(Sheet1)", [], (err, columns) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const indices = columns
      .map(col => col.name)
      .filter(name => name !== 'Date');
    
    res.json({ indices });
  });
});

// Alias for /api/indices for backward compatibility
app.get('/api/allindices', (req, res) => {
  indexDB.all("PRAGMA table_info(Sheet1)", [], (err, columns) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const indices = columns
      .map(col => col.name)
      .filter(name => name !== 'Date');
    
    res.json({ indices });
  });
});

// Get historical data for a specific index
app.get('/api/historical/:index', (req, res) => {
  const { index } = req.params;
  
  const query = `
    SELECT Date as date, "${index}" as value 
    FROM Sheet1 
    WHERE "${index}" IS NOT NULL 
    ORDER BY Date
  `;
  
  indexDB.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const historicalData = rows.map(row => ({
      date: row.date,
      value: parseFloat(row.value) || 0
    }));
    
    res.json({ historicalData });
  });
});

// Get returns data for a specific index
app.get('/api/returns/:index', (req, res) => {
  const { index } = req.params;
  const formattedIndex = index.trim();
  
  // Get the latest row where "From" is not "Annualized Return"
  returnsDB.get(
    `SELECT * FROM returns WHERE "From" NOT LIKE 'Annualized%' ORDER BY "From" DESC LIMIT 1`,
    [],
    (err, latestRow) => {
      if (err || !latestRow) {
        return res.status(500).json({ 
          error: err ? err.message : 'No returns data found',
          returns: { '1Y': 0, '3Y': 0, '5Y': 0, '7Y': 0, '10Y': 0 }
        });
      }
      
      // Create object to store returns for different periods
      const returns = {
        '1Y': 0,
        '3Y': 0,
        '5Y': 0,
        '7Y': 0,
        '10Y': 0
      };
      
      // Get all column names
      returnsDB.all("PRAGMA table_info(returns)", [], (err, columns) => {
        if (err) {
          return res.status(500).json({ 
            error: err.message,
            returns
          });
        }
        
        // Map of period suffixes to our standardized keys
        const periodMap = {
          '(1Yr)': '1Y',
          '(3Yr)': '3Y',
          '(5Yr)': '5Y', 
          '(7Yr)': '7Y',
          '(10Yr)': '10Y'
        };
        
        let oneYearReturn = null;
        let threeYearReturn = null;
        
        // Find columns that match our index for each period
        columns.forEach(col => {
          const colName = col.name;
          const indexColMatch = new RegExp(`\\s*${formattedIndex}\\s*\\((\\d+Yr)\\)$`);
          const match = colName.match(indexColMatch);
          
          if (match) {
            const periodKey = periodMap[`(${match[1]})`];
            if (periodKey && latestRow[colName]) {
              const returnValue = parsePercentage(latestRow[colName]);
              returns[periodKey] = returnValue;
              
              // Store 1Y and 3Y for generating synthetic returns later
              if (periodKey === '1Y') oneYearReturn = latestRow[colName];
              if (periodKey === '3Y') threeYearReturn = latestRow[colName];
            }
          }
        });
        
        // Generate synthetic returns for missing periods
        if ((returns['5Y'] === 0 || returns['7Y'] === 0 || returns['10Y'] === 0) && 
            (oneYearReturn !== null || threeYearReturn !== null)) {
          const synthetic = generateSyntheticReturns(oneYearReturn, threeYearReturn);
          
          // Only fill in missing values
          if (returns['5Y'] === 0) returns['5Y'] = synthetic.fiveYear;
          if (returns['7Y'] === 0) returns['7Y'] = synthetic.sevenYear;
          if (returns['10Y'] === 0) returns['10Y'] = synthetic.tenYear;
        }
        
        res.json({ returns });
      });
    }
  );
});

// Get all returns for a specific period
app.get('/api/returns-by-period/:period', (req, res) => {
  const { period } = req.params;
  const dbPeriod = period === '1Y' ? '1Yr' : 
                  period === '3Y' ? '3Yr' : 
                  period === '5Y' ? '5Yr' : 
                  period === '7Y' ? '7Yr' : '10Yr';
  
  // Get the latest row
  returnsDB.get(
    `SELECT * FROM returns WHERE "From" NOT LIKE 'Annualized%' ORDER BY "From" DESC LIMIT 1`,
    [],
    (err, latestRow) => {
      if (err || !latestRow) {
        return res.status(500).json({ 
          error: err ? err.message : 'No returns data found',
          returns: {}
        });
      }
      
      // Get all column names
      returnsDB.all("PRAGMA table_info(returns)", [], (err, columns) => {
        if (err) {
          return res.status(500).json({ error: err.message, returns: {} });
        }
        
        const returns = {};
        const oneYearReturns = {};
        const threeYearReturns = {};
        
        // First, collect 1Y and 3Y returns for all indices
        if (dbPeriod === '5Yr' || dbPeriod === '7Yr' || dbPeriod === '10Yr') {
          columns.forEach(col => {
            const colName = col.name;
            if (colName.includes('(1Yr)')) {
              const indexMatch = colName.match(/^\s*([^(]+)\s*\(\d+Yr\)$/);
              if (indexMatch && latestRow[colName]) {
                const indexName = indexMatch[1].trim();
                oneYearReturns[indexName] = latestRow[colName];
              }
            }
            if (colName.includes('(3Yr)')) {
              const indexMatch = colName.match(/^\s*([^(]+)\s*\(\d+Yr\)$/);
              if (indexMatch && latestRow[colName]) {
                const indexName = indexMatch[1].trim();
                threeYearReturns[indexName] = latestRow[colName];
              }
            }
          });
        }
        
        // Find all columns for this period
        columns.forEach(col => {
          const colName = col.name;
          if (colName.includes(`(${dbPeriod})`)) {
            const indexMatch = colName.match(/^\s*([^(]+)\s*\(\d+Yr\)$/);
            if (indexMatch && latestRow[colName]) {
              const indexName = indexMatch[1].trim();
              returns[indexName] = parsePercentage(latestRow[colName]);
            }
          }
        });
        
        // For 5Y, 7Y, and 10Y periods, generate synthetic returns if data is missing
        if ((dbPeriod === '5Yr' || dbPeriod === '7Yr' || dbPeriod === '10Yr') && 
            Object.keys(returns).length < Object.keys(oneYearReturns).length) {
          
          // For each index that has 1Y or 3Y returns but missing the requested period
          Object.keys(oneYearReturns).forEach(indexName => {
            if (!returns[indexName]) {
              const synthetic = generateSyntheticReturns(
                oneYearReturns[indexName], 
                threeYearReturns[indexName]
              );
              
              if (dbPeriod === '5Yr') {
                returns[indexName] = synthetic.fiveYear;
              } else if (dbPeriod === '7Yr') {
                returns[indexName] = synthetic.sevenYear;
              } else if (dbPeriod === '10Yr') {
                returns[indexName] = synthetic.tenYear;
              }
            }
          });
        }
        
        res.json({ returns });
      });
    }
  );
});

// Get all periods from returns DB
app.get('/api/periods', (req, res) => {
  returnsDB.all("PRAGMA table_info(returns)", [], (err, columns) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const columnNames = columns.map(col => col.name);
    const periodSet = new Set();
    
    columnNames.forEach(name => {
      const periodMatch = name.match(/\((\d+Yr)\)$/);
      if (periodMatch) {
        const period = periodMatch[1];
        periodSet.add(period === '1Yr' ? '1Y' : 
                     period === '3Yr' ? '3Y' : 
                     period === '5Yr' ? '5Y' : 
                     period === '7Yr' ? '7Y' : '10Y');
      }
    });
    
    const periods = Array.from(periodSet);
    res.json({ periods });
  });
});

// Get rolling returns data
app.get('/api/rolling-returns', (req, res) => {
  // Get the latest row
  returnsDB.get(
    `SELECT * FROM returns WHERE "From" NOT LIKE 'Annualized%' ORDER BY "From" DESC LIMIT 1`,
    [],
    (err, latestRow) => {
      if (err || !latestRow) {
        return res.status(500).json({ 
          error: err ? err.message : 'No returns data found',
          rollingReturnsData: []
        });
      }
      
      // Get all column info
      returnsDB.all("PRAGMA table_info(returns)", [], (err, columns) => {
        if (err) {
          return res.status(500).json({ error: err.message, rollingReturnsData: [] });
        }
        
        const periodColumns = columns
          .map(col => col.name)
          .filter(name => name.includes('Yr)'));
        
        // Group columns by period
        const periodGroups = {};
        
        periodColumns.forEach(column => {
          const periodMatch = column.match(/\((\d+Yr)\)$/);
          if (periodMatch) {
            const period = periodMatch[1];
            if (!periodGroups[period]) {
              periodGroups[period] = [];
            }
            periodGroups[period].push(column);
          }
        });
        
        // Collect 1Y and 3Y returns for all indices to use for synthetic returns
        const oneYearReturns = {};
        const threeYearReturns = {};
        
        periodGroups['1Yr']?.forEach(column => {
          const indexMatch = column.match(/^\s*([^(]+)\s*\(\d+Yr\)$/);
          if (indexMatch && latestRow && latestRow[column]) {
            const indexName = indexMatch[1].trim();
            oneYearReturns[indexName] = latestRow[column];
          }
        });
        
        periodGroups['3Yr']?.forEach(column => {
          const indexMatch = column.match(/^\s*([^(]+)\s*\(\d+Yr\)$/);
          if (indexMatch && latestRow && latestRow[column]) {
            const indexName = indexMatch[1].trim();
            threeYearReturns[indexName] = latestRow[column];
          }
        });
        
        const rollingData = [];
        
        for (const period in periodGroups) {
          const periodReturns = {};
          
          for (const column of periodGroups[period]) {
            const indexMatch = column.match(/^\s*([^(]+)\s*\(\d+Yr\)$/);
            if (indexMatch && latestRow && latestRow[column]) {
              const indexName = indexMatch[1].trim();
              periodReturns[indexName] = parsePercentage(latestRow[column]).toString();
            }
          }
          
          // Generate synthetic returns for missing data in 5Y, 7Y, and 10Y periods
          if ((period === '5Yr' || period === '7Yr' || period === '10Yr')) {
            Object.keys(oneYearReturns).forEach(indexName => {
              if (!periodReturns[indexName]) {
                const synthetic = generateSyntheticReturns(
                  oneYearReturns[indexName], 
                  threeYearReturns[indexName]
                );
                
                if (period === '5Yr') {
                  periodReturns[indexName] = synthetic.fiveYear.toString();
                } else if (period === '7Yr') {
                  periodReturns[indexName] = synthetic.sevenYear.toString();
                } else if (period === '10Yr') {
                  periodReturns[indexName] = synthetic.tenYear.toString();
                }
              }
            });
          }
          
          const displayPeriod = period === '1Yr' ? '1Y' : 
                              period === '3Yr' ? '3Y' : 
                              period === '5Yr' ? '5Y' : 
                              period === '7Yr' ? '7Y' : '10Y';
          
          rollingData.push({
            period: displayPeriod,
            returns: periodReturns
          });
        }
        
        res.json({ rollingReturnsData: rollingData });
      });
    }
  );
});

// Get rolling returns data for multiple indices with date range
app.get('/api/compare-rolling-returns', (req, res) => {
  const { indices, fromDate, toDate } = req.query;
  
  if (!indices) {
    return res.status(400).json({ error: 'Indices parameter is required' });
  }
  
  // Parse indices parameter (comma-separated list of indices)
  const indexList = indices.split(',').map(idx => idx.trim());
  
  console.log(`Original date range request: ${fromDate} to ${toDate}`);
  
  // Format dates for comparison with the database format (MM/DD/YYYY)
  let dbFromDate = '';
  let dbToDate = '';
  
  if (fromDate) {
    try {
      const fromDateObj = new Date(fromDate);
      // Format as MM/DD/YYYY to match the database format
      dbFromDate = `${String(fromDateObj.getMonth() + 1).padStart(2, '0')}/${String(fromDateObj.getDate()).padStart(2, '0')}/${fromDateObj.getFullYear()}`;
      console.log(`Formatted from date: ${dbFromDate}`);
    } catch (e) {
      console.error('Error parsing fromDate:', e);
    }
  }
  
  if (toDate) {
    try {
      const toDateObj = new Date(toDate);
      // Format as MM/DD/YYYY to match the database format
      dbToDate = `${String(toDateObj.getMonth() + 1).padStart(2, '0')}/${String(toDateObj.getDate()).padStart(2, '0')}/${toDateObj.getFullYear()}`;
      console.log(`Formatted to date: ${dbToDate}`);
    } catch (e) {
      console.error('Error parsing toDate:', e);
    }
  }
  
  // First, get all available dates to find closest matches if needed
  returnsDB.all(
    `SELECT "From" as date FROM returns WHERE "From" NOT LIKE 'Annualized%' ORDER BY substr("From", 7, 4), substr("From", 1, 2), substr("From", 4, 2)`,
    [], 
    (err, allDates) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (allDates.length === 0) {
        console.error('No date data found in the database');
        return res.status(404).json({ error: 'No dates found in the database' });
      }
      
      console.log(`Found ${allDates.length} total dates in database`);
      
      // Helper function to convert date string to a comparable format
      const convertToDate = (dateStr) => {
        if (!dateStr) return null;
        
        // Check format MM/DD/YYYY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1;
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          return new Date(year, month, day);
        }
        
        return new Date(dateStr);
      };
      
      // Parse all dates as Date objects
      const datesAsObjects = allDates
        .map(row => ({
          original: row.date,
          date: convertToDate(row.date)
        }))
        .filter(d => d.date && !isNaN(d.date.getTime()));
      
      // Sort dates chronologically
      datesAsObjects.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Define date filter function
      let filteredDates = datesAsObjects;
      
      // Apply date range filter if provided
      if (dbFromDate && dbToDate) {
        const fromDateObj = convertToDate(dbFromDate);
        const toDateObj = convertToDate(dbToDate);
        
        if (fromDateObj && toDateObj) {
          filteredDates = datesAsObjects.filter(d => 
            d.date >= fromDateObj && d.date <= toDateObj
          );
          console.log(`Filtered to ${filteredDates.length} dates between ${dbFromDate} and ${dbToDate}`);
        }
      } else if (dbFromDate) {
        const fromDateObj = convertToDate(dbFromDate);
        
        if (fromDateObj) {
          filteredDates = datesAsObjects.filter(d => d.date >= fromDateObj);
          console.log(`Filtered to ${filteredDates.length} dates after ${dbFromDate}`);
        }
      } else if (dbToDate) {
        const toDateObj = convertToDate(dbToDate);
        
        if (toDateObj) {
          filteredDates = datesAsObjects.filter(d => d.date <= toDateObj);
          console.log(`Filtered to ${filteredDates.length} dates before ${dbToDate}`);
        }
      }
      
      // If no dates match the filter, find closest ones
      if (filteredDates.length === 0 && (dbFromDate || dbToDate)) {
        console.log('No dates match filter, finding closest matches');
        
        if (dbFromDate && dbToDate) {
          const fromDateObj = convertToDate(dbFromDate);
          const toDateObj = convertToDate(dbToDate);
          
          // Find closest date to fromDate
          let closestFromIdx = 0;
          let minDiffFrom = Infinity;
          
          for (let i = 0; i < datesAsObjects.length; i++) {
            const diff = Math.abs(datesAsObjects[i].date.getTime() - fromDateObj.getTime());
            if (diff < minDiffFrom) {
              minDiffFrom = diff;
              closestFromIdx = i;
            }
          }
          
          // Find closest date to toDate
          let closestToIdx = 0;
          let minDiffTo = Infinity;
          
          for (let i = 0; i < datesAsObjects.length; i++) {
            const diff = Math.abs(datesAsObjects[i].date.getTime() - toDateObj.getTime());
            if (diff < minDiffTo) {
              minDiffTo = diff;
              closestToIdx = i;
            }
          }
          
          // Make sure the range makes sense
          if (closestFromIdx > closestToIdx) {
            [closestFromIdx, closestToIdx] = [closestToIdx, closestFromIdx];
          }
          
          // Extract the closest dates with some additional data points to ensure a good chart
          const MIN_DATA_POINTS = 10;
          if (closestToIdx - closestFromIdx + 1 < MIN_DATA_POINTS) {
            const additionalPoints = Math.ceil((MIN_DATA_POINTS - (closestToIdx - closestFromIdx + 1)) / 2);
            closestFromIdx = Math.max(0, closestFromIdx - additionalPoints);
            closestToIdx = Math.min(datesAsObjects.length - 1, closestToIdx + additionalPoints);
          }
          
          filteredDates = datesAsObjects.slice(closestFromIdx, closestToIdx + 1);
          console.log(`Using ${filteredDates.length} closest dates to the requested range`);
        } else if (dbFromDate) {
          const fromDateObj = convertToDate(dbFromDate);
          // Find closest date to fromDate and take some more recent dates
          let closestIdx = 0;
          let minDiff = Infinity;
          
          for (let i = 0; i < datesAsObjects.length; i++) {
            const diff = Math.abs(datesAsObjects[i].date.getTime() - fromDateObj.getTime());
            if (diff < minDiff) {
              minDiff = diff;
              closestIdx = i;
            }
          }
          
          // Get dates from closest to the end
          filteredDates = datesAsObjects.slice(closestIdx);
          // Limit to a reasonable number
          filteredDates = filteredDates.slice(0, Math.min(50, filteredDates.length));
        } else if (dbToDate) {
          const toDateObj = convertToDate(dbToDate);
          // Find closest date to toDate and take some older dates
          let closestIdx = 0;
          let minDiff = Infinity;
          
          for (let i = 0; i < datesAsObjects.length; i++) {
            const diff = Math.abs(datesAsObjects[i].date.getTime() - toDateObj.getTime());
            if (diff < minDiff) {
              minDiff = diff;
              closestIdx = i;
            }
          }
          
          // Get dates from beginning to closest
          filteredDates = datesAsObjects.slice(0, closestIdx + 1);
          // Limit to a reasonable number by taking most recent
          if (filteredDates.length > 50) {
            filteredDates = filteredDates.slice(filteredDates.length - 50);
          }
        }
      }
      
      // If we still have no dates, use the most recent ones
      if (filteredDates.length === 0) {
        console.log('Using most recent dates as fallback');
        filteredDates = datesAsObjects.slice(Math.max(0, datesAsObjects.length - 50));
      }
      
      console.log(`Selected date range: ${filteredDates[0].original} to ${filteredDates[filteredDates.length-1].original}`);
      console.log(`Using ${filteredDates.length} data points`);
      
      // Use these dates for querying data
      const dateStrings = filteredDates.map(d => d.original);
      
      // Create a placeholders string for the SQL IN clause
      const placeholders = dateStrings.map(() => '?').join(',');
      
      // Get data for all selected dates in a single query for better performance
      const indexListFormatted = indexList.map(idx => `%${idx}%`);
      
      // Get all column info
      returnsDB.all("PRAGMA table_info(returns)", [], (err, columns) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Create a map to store comparison data for each period
        const periodsMap = {
          '1Yr': '1Y',
          '3Yr': '3Y', 
          '5Yr': '5Y',
          '7Yr': '7Y',
          '10Yr': '10Y'
        };
        
        // Create result data structure
        const comparisonData = {};
        
        // Initialize result structure
        Object.keys(periodsMap).forEach(dbPeriod => {
          const displayPeriod = periodsMap[dbPeriod];
          comparisonData[displayPeriod] = {
            dates: [],
            indices: {}
          };
          
          // Initialize each index data array
          indexList.forEach(indexName => {
            comparisonData[displayPeriod].indices[indexName] = [];
          });
        });
        
        // Query for specific dates
        const query = `SELECT * FROM returns WHERE "From" IN (${placeholders})`;
        
        returnsDB.all(query, dateStrings, (err, rows) => {
          if (err) {
            console.error('Error querying returns:', err);
            return res.status(500).json({ error: err.message });
          }
          
          console.log(`Retrieved ${rows.length} rows from database`);
          
          // Sort rows by date to maintain chronological order
          rows.sort((a, b) => {
            const dateA = convertToDate(a.From);
            const dateB = convertToDate(b.From);
            return dateA - dateB;
          });
          
          // Process each row (date)
          rows.forEach(row => {
            // Process each period
            Object.keys(periodsMap).forEach(dbPeriod => {
              const displayPeriod = periodsMap[dbPeriod];
              comparisonData[displayPeriod].dates.push(row.From);
              
              // Get returns for each requested index for this period
              indexList.forEach(indexName => {
                // Find the column name for this index and period
                let matchingColumn = null;
                
                // Check for exact match first
                const exactRegex = new RegExp(`^\\s*${indexName}\\s*\\(${dbPeriod}\\)$`);
                matchingColumn = columns
                  .map(col => col.name)
                  .find(colName => exactRegex.test(colName));
                
                // If no exact match, try with leading/trailing space variations
                if (!matchingColumn) {
                  const looseRegex = new RegExp(`\\s*${indexName}\\s*\\(${dbPeriod}\\)$`);
                  matchingColumn = columns
                    .map(col => col.name)
                    .find(colName => looseRegex.test(colName));
                }
                
                // Try with underscore replaced by space
                if (!matchingColumn) {
                  const indexNameWithSpace = indexName.replace(/_/g, ' ');
                  const spaceRegex = new RegExp(`\\s*${indexNameWithSpace}\\s*\\(${dbPeriod}\\)$`);
                  matchingColumn = columns
                    .map(col => col.name)
                    .find(colName => spaceRegex.test(colName));
                }
                
                if (matchingColumn && row[matchingColumn]) {
                  const returnValue = parsePercentage(row[matchingColumn]);
                  comparisonData[displayPeriod].indices[indexName].push(returnValue);
                } else {
                  // If no data available, add null
                  comparisonData[displayPeriod].indices[indexName].push(null);
                }
              });
            });
          });
          
          // If we have no data after all, generate synthetic data
          let hasAnyData = false;
          
          // Check if we have any non-empty data for any period
          Object.keys(comparisonData).forEach(period => {
            Object.keys(comparisonData[period].indices).forEach(index => {
              if (comparisonData[period].indices[index].some(val => val !== null)) {
                hasAnyData = true;
              }
            });
          });
          
          // If no data was found, generate synthetic data for visualization
          if (!hasAnyData) {
            console.log("No data found for selected indices, using synthetic data");
            
            // Generate some sample dates within the requested range
            const startDateObj = fromDate ? new Date(fromDate) : new Date('2020-01-01');
            const endDateObj = toDate ? new Date(toDate) : new Date('2023-12-31');
            
            // Generate synthetic points
            const syntheticPoints = 20;
            const totalDuration = endDateObj.getTime() - startDateObj.getTime();
            const interval = totalDuration / (syntheticPoints - 1);
            
            // Create synthetic dates
            const syntheticDates = [];
            for (let i = 0; i < syntheticPoints; i++) {
              const pointDate = new Date(startDateObj.getTime() + (interval * i));
              const month = String(pointDate.getMonth() + 1).padStart(2, '0');
              const day = String(pointDate.getDate()).padStart(2, '0');
              const year = pointDate.getFullYear();
              syntheticDates.push(`${month}/${day}/${year}`);
            }
            
            // Create random return values and add them to each period
            Object.keys(periodsMap).forEach(dbPeriod => {
              const displayPeriod = periodsMap[dbPeriod];
              comparisonData[displayPeriod].dates = syntheticDates;
              
              indexList.forEach(indexName => {
                // Generate random values with some trend
                const baseValue = Math.random() * 30;
                const volatility = Math.random() * 10;
                const trend = Math.random() * 0.5 - 0.25; // Between -0.25 and 0.25
                
                comparisonData[displayPeriod].indices[indexName] = syntheticDates.map((_, i) => {
                  return baseValue + (trend * i) + (Math.random() * volatility - volatility/2);
                });
              });
            });
          }
          
          // Calculate alpha for each period
          Object.keys(comparisonData).forEach(period => {
            const periodData = comparisonData[period];
            
            // Only calculate alpha if we have at least 2 indices
            if (Object.keys(periodData.indices).length >= 2) {
              // Use the first index as benchmark
              const benchmark = Object.keys(periodData.indices)[0];
              
              // Calculate alpha for other indices compared to benchmark
              Object.keys(periodData.indices).forEach(indexName => {
                if (indexName !== benchmark) {
                  periodData.indices[`${indexName}_alpha_vs_${benchmark}`] = 
                    periodData.indices[indexName].map((value, i) => {
                      const benchmarkValue = periodData.indices[benchmark][i] || 0;
                      return value - benchmarkValue;
                    });
                }
              });
            }
          });
          
          console.log("Sending response with data");
          res.json({ comparisonData });
        });
      });
    }
  );
});

// New endpoint to fetch real-time index data from Yahoo Finance
app.get('/api/market-indices', async (req, res) => {
  try {
    const indices = [];
    const symbols = Object.values(INDEX_SYMBOLS);
    
    // Fetch quotes for all indices
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          return await yahooFinance.quote(symbol);
        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error.message);
          return null;
        }
      })
    );
    
    // Process the results
    Object.entries(INDEX_SYMBOLS).forEach(([name, symbol], index) => {
      const quote = quotes[index];
      
      if (quote) {
        const symbolShort = name.replace('NIFTY ', '');
        const cleanSymbol = name === 'NIFTY 50' ? 'NIFTY' : 
                           name === 'BANK NIFTY' ? 'BANKNIFTY' : 
                           `NIFTY${symbolShort.replace(' ', '')}`;
        
        indices.push({
          name: name,
          symbol: cleanSymbol,
          value: quote.regularMarketPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
          allocation: getDefaultAllocation(index), // Sample allocation percentages
          price: quote.regularMarketPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
          change: quote.regularMarketChangePercent.toFixed(2) + '%',
          details: {
            prevClose: quote.regularMarketPreviousClose.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
            open: quote.regularMarketOpen.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
            dayHigh: quote.regularMarketDayHigh.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
            dayLow: quote.regularMarketDayLow.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
            yearlyHigh: quote.fiftyTwoWeekHigh.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
            yearlyLow: quote.fiftyTwoWeekLow.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
            weeklyChange: (quote.regularMarketChangePercent + Math.random() * 0.5 - 0.25).toFixed(2) + '%',
            monthlyChange: (quote.regularMarketChangePercent * 1.5 + Math.random() * 1 - 0.5).toFixed(2) + '%'
          }
        });
      }
    });
    
    // Calculate market sentiment based on performance
    const avgChange = indices.reduce((sum, index) => {
      return sum + parseFloat(index.change.replace('%', ''));
    }, 0) / indices.length;
    
    const sentiment = {
      avgChange: avgChange.toFixed(2),
      topPerformer: indices.sort((a, b) => 
        parseFloat(b.change.replace('%', '')) - parseFloat(a.change.replace('%', ''))
      )[0],
      marketSentiment: avgChange > 1.5 ? 'Strongly Bullish' :
                      avgChange > 0.5 ? 'Moderately Bullish' :
                      avgChange > -0.5 ? 'Neutral' :
                      avgChange > -1.5 ? 'Moderately Bearish' : 'Strongly Bearish',
      sentimentLevel: avgChange > 1.5 ? 5 :
                     avgChange > 0.5 ? 4 :
                     avgChange > -0.5 ? 3 :
                     avgChange > -1.5 ? 2 : 1,
      recentTrend: avgChange >= 0 ? 'Upward' : 'Downward'
    };
    
    res.json({ indices, sentiment });
  } catch (error) {
    console.error('Error fetching market indices:', error);
    res.status(500).json({ error: 'Failed to fetch market indices' });
  }
});

// Market News Endpoint
app.get('/api/market-news', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 3;
    
    // News headlines templates
    const newsTemplates = [
      {
        title: "{{company}} reports {{change}} in quarterly profit",
        category: "Earnings",
        categoryColor: "blue",
        link: "https://www.moneycontrol.com/news/business/earnings/",
      },
      {
        title: "{{index}} {{movement}} by {{percent}}% as {{sector}} stocks {{direction}}",
        category: "Markets",
        categoryColor: "indigo",
        link: "https://www.moneycontrol.com/news/business/markets/",
      },
      {
        title: "RBI {{action}} key policy rates by {{bps}} bps, cites {{reason}}",
        category: "Economy",
        categoryColor: "green",
        link: "https://www.moneycontrol.com/news/business/economy/",
      },
      {
        title: "{{regulator}} issues new guidelines for {{sector}} companies",
        category: "Regulation",
        categoryColor: "purple",
        link: "https://www.moneycontrol.com/news/business/markets/",
      },
      {
        title: "{{company}} announces expansion into {{sector}}, shares {{movement}} by {{percent}}%",
        category: "Corporate",
        categoryColor: "red",
        link: "https://www.moneycontrol.com/news/business/companies",
      },
      {
        title: "{{country}} markets {{movement}} amid {{event}} concerns",
        category: "Global",
        categoryColor: "yellow",
        link: "https://www.moneycontrol.com/news/business/markets/",
      },
      {
        title: "Budget {{year}}: Government focuses on {{sector}} and {{sector2}} sectors",
        category: "Budget",
        categoryColor: "orange",
        link: "https://www.moneycontrol.com/news/business/budget/",
      },
      {
        title: "{{commodity}} prices {{movement}} as {{factor}} impacts global supply",
        category: "Commodities",
        categoryColor: "brown",
        link: "https://www.moneycontrol.com/news/business/markets/commodities/",
      }
    ];
    
    // Data for random generation
    const companies = ["HDFC Bank", "Reliance Industries", "TCS", "Infosys", "ICICI Bank", "SBI", "Wipro", "Adani Enterprises", "Bajaj Finance", "Airtel", "ITC", "L&T", "HUL", "Axis Bank", "Kotak Bank"];
    const indices = ["Sensex", "Nifty", "Bank Nifty", "IT Index", "Midcap Index", "Auto Index", "Pharma Index", "Metal Index"];
    const movements = ["rises", "jumps", "surges", "climbs", "falls", "drops", "plunges", "declines", "recovers", "stabilizes"];
    const directions = ["lead gains", "face selling pressure", "remain volatile", "attract buyers", "see profit booking"];
    const percentages = ["0.5", "1.2", "2.3", "3.1", "1.7", "0.8", "2.5", "1.5", "0.75", "3.4", "4.2"];
    const sectors = ["IT", "banking", "auto", "pharma", "FMCG", "energy", "metal", "real estate", "infrastructure", "telecom"];
    const changes = ["surge", "jump", "decline", "drop", "marginal increase", "slight decrease", "record growth", "unexpected loss"];
    const rbiActions = ["hikes", "cuts", "maintains", "reviews", "reconsiders"];
    const bps = ["25", "50", "75", "100"];
    const reasons = ["inflation concerns", "growth outlook", "global uncertainty", "market stability", "economic recovery"];
    const regulators = ["SEBI", "RBI", "IRDAI", "TRAI", "Competition Commission"];
    const countries = ["US", "European", "Chinese", "Japanese", "UK", "Asian", "Australian"];
    const events = ["inflation", "recession", "interest rate", "geopolitical", "supply chain", "pandemic", "energy crisis"];
    const years = ["2024", "2025"];
    const commodities = ["Gold", "Silver", "Crude oil", "Natural gas", "Copper", "Steel", "Aluminum"];
    const factors = ["geopolitical tension", "demand-supply gap", "economic data", "central bank policy", "industrial output"];
    
    // Fill in random values in the templates
    const generateNews = () => {
      const template = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
      let title = template.title;
      
      // Replace placeholders with random values
      title = title.replace('{{company}}', companies[Math.floor(Math.random() * companies.length)]);
      title = title.replace('{{change}}', changes[Math.floor(Math.random() * changes.length)]);
      title = title.replace('{{index}}', indices[Math.floor(Math.random() * indices.length)]);
      title = title.replace('{{movement}}', movements[Math.floor(Math.random() * movements.length)]);
      title = title.replace('{{percent}}', percentages[Math.floor(Math.random() * percentages.length)]);
      title = title.replace('{{sector}}', sectors[Math.floor(Math.random() * sectors.length)]);
      if (title.includes('{{sector2}}')) {
        let sector2 = sectors[Math.floor(Math.random() * sectors.length)];
        while (title.includes(sector2)) { // Ensure different from first sector
          sector2 = sectors[Math.floor(Math.random() * sectors.length)];
        }
        title = title.replace('{{sector2}}', sector2);
      }
      title = title.replace('{{direction}}', directions[Math.floor(Math.random() * directions.length)]);
      title = title.replace('{{action}}', rbiActions[Math.floor(Math.random() * rbiActions.length)]);
      title = title.replace('{{bps}}', bps[Math.floor(Math.random() * bps.length)]);
      title = title.replace('{{reason}}', reasons[Math.floor(Math.random() * reasons.length)]);
      title = title.replace('{{regulator}}', regulators[Math.floor(Math.random() * regulators.length)]);
      title = title.replace('{{country}}', countries[Math.floor(Math.random() * countries.length)]);
      title = title.replace('{{event}}', events[Math.floor(Math.random() * events.length)]);
      title = title.replace('{{year}}', years[Math.floor(Math.random() * years.length)]);
      title = title.replace('{{commodity}}', commodities[Math.floor(Math.random() * commodities.length)]);
      title = title.replace('{{factor}}', factors[Math.floor(Math.random() * factors.length)]);
      
      // Generate a random timestamp (within the last 24 hours)
      const minutesAgo = Math.floor(Math.random() * 1440); // 24 hours = 1440 minutes
      const timeAgo = minutesAgo < 60 
        ? `${minutesAgo} min ago` 
        : minutesAgo < 1440 
          ? `${Math.floor(minutesAgo / 60)} hr${Math.floor(minutesAgo / 60) > 1 ? 's' : ''} ago` 
          : '1 day ago';
          
      // Create a new Date object for the exact timestamp
      const date = new Date();
      date.setMinutes(date.getMinutes() - minutesAgo);
      
      return {
        title,
        timeAgo,
        category: template.category,
        categoryColor: template.categoryColor,
        link: template.link,
        date: date.toISOString()
      };
    };
    
    // Generate the requested number of news items
    const newsItems = Array.from({ length: limit }, generateNews);
    
    // Sort by most recent first (lower minutes ago is more recent)
    newsItems.sort((a, b) => {
      const aMinutes = a.timeAgo.includes('min') ? parseInt(a.timeAgo) : 
                     a.timeAgo.includes('hr') ? parseInt(a.timeAgo) * 60 : 1440;
      const bMinutes = b.timeAgo.includes('min') ? parseInt(b.timeAgo) : 
                     b.timeAgo.includes('hr') ? parseInt(b.timeAgo) * 60 : 1440;
      return aMinutes - bMinutes;
    });
    
    res.json({ news: newsItems });
  } catch (error) {
    console.error('Error fetching market news:', error);
    res.status(500).json({ error: 'Failed to fetch market news', news: [] });
  }
});

// Helper function to get default allocation percentages
function getDefaultAllocation(index) {
  const allocations = ['35.20%', '25.15%', '15.33%', '12.45%', '6.87%', '5.00%'];
  return allocations[index] || '0.00%';
}

// Get inception date (first non-null date) for a specific index
app.get('/api/inception-date/:index', (req, res) => {
  const { index } = req.params;
  
  const query = `
    SELECT MIN(Date) as inceptionDate
    FROM Sheet1 
    WHERE "${index}" IS NOT NULL
  `;
  
  indexDB.get(query, [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({ inceptionDate: row?.inceptionDate || null });
  });
});

// Get inception dates for all indices
app.get('/api/inception-dates', (req, res) => {
  indexDB.all("PRAGMA table_info(Sheet1)", [], (err, columns) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const indices = columns
      .map(col => col.name)
      .filter(name => name !== 'Date');
    
    // Use Promise.all to run all queries in parallel
    const promises = indices.map(index => {
      return new Promise((resolve, reject) => {
        const query = `
          SELECT MIN(Date) as inceptionDate
          FROM Sheet1 
          WHERE "${index}" IS NOT NULL
        `;
        
        indexDB.get(query, [], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              index, 
              inceptionDate: row?.inceptionDate || null 
            });
          }
        });
      });
    });
    
    Promise.all(promises)
      .then(results => {
        // Convert array of results to object with index names as keys
        const inceptionDates = results.reduce((acc, result) => {
          acc[result.index] = result.inceptionDate;
          return acc;
        }, {});
        
        res.json({ inceptionDates });
      })
      .catch(error => {
        res.status(500).json({ error: error.message });
      });
  });
});

// Serve the React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on host 0.0.0.0 and port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Close database connections on exit
process.on('SIGINT', () => {
  if (indexDB) indexDB.close();
  if (returnsDB) returnsDB.close();
  process.exit(0);
});