import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export interface HistoricalDataPoint {
  date: string;
  value: number;
}

export interface IndexReturn {
  name: string;
  symbol: string;
  returns: {
    '1Y': number;
    '3Y': number;
    '5Y': number;
    '7Y': number;
    '10Y': number;
  };
  historicalData: HistoricalDataPoint[];
}

export interface IndexStats {
  averageReturn: number;
  standardDeviation: number;
  sharpeRatio: number;
}

export interface RollingReturnPeriod {
  period: string;
  returns: Record<string, string>;
}

// Interface for comparison data
export interface ComparisonDataPoint {
  dates: string[];
  indices: Record<string, number[]>;
}

export interface ComparisonData {
  comparisonData: Record<string, ComparisonDataPoint>;
}

export interface NewsItem {
  title: string;
  timeAgo: string;
  category: string;
  categoryColor: string;
  link: string;
  date?: string;
}

class ApiService {
  // Get all available indices
  async getAllIndices(): Promise<string[]> {
    try {
      const response = await axios.get(`${API_URL}/indices`);
      return response.data.indices || [];
    } catch (error) {
      console.error('Error fetching indices:', error);
      return [];
    }
  }

  // Get market indices data
  async getMarketIndices(): Promise<any> {
    try {
      const response = await axios.get(`${API_URL}/market-indices`);
      return response.data || { indices: [], sentiment: null };
    } catch (error) {
      console.error('Error fetching market indices:', error);
      return { indices: [], sentiment: null };
    }
  }

  // Get all time periods
  async getPeriods(): Promise<string[]> {
    try {
      const response = await axios.get(`${API_URL}/periods`);
      return response.data.periods || ['1Y', '3Y', '5Y', '7Y', '10Y'];
    } catch (error) {
      console.error('Error fetching periods:', error);
      return ['1Y', '3Y', '5Y', '7Y', '10Y'];
    }
  }

  // Get historical data for an index
  async getHistoricalData(index: string): Promise<HistoricalDataPoint[]> {
    try {
      const response = await axios.get(`${API_URL}/historical/${encodeURIComponent(index)}`);
      return response.data.historicalData || [];
    } catch (error) {
      console.error(`Error fetching historical data for ${index}:`, error);
      return [];
    }
  }

  // Get returns data for an index
  async getReturns(index: string): Promise<Record<string, number>> {
    try {
      const response = await axios.get(`${API_URL}/returns/${encodeURIComponent(index)}`);
      return response.data.returns || {};
    } catch (error) {
      console.error(`Error fetching returns for ${index}:`, error);
      return { '1Y': 0, '3Y': 0, '5Y': 0, '7Y': 0, '10Y': 0 };
    }
  }

  // Get all returns for a specific period
  async getReturnsByPeriod(period: string): Promise<Record<string, number>> {
    try {
      const response = await axios.get(`${API_URL}/returns-by-period/${encodeURIComponent(period)}`);
      return response.data.returns || {};
    } catch (error) {
      console.error(`Error fetching returns for period ${period}:`, error);
      return {};
    }
  }

  // Get rolling returns data
  async getRollingReturns(): Promise<RollingReturnPeriod[]> {
    try {
      const response = await axios.get(`${API_URL}/rolling-returns`);
      return response.data.rollingReturnsData || [];
    } catch (error) {
      console.error('Error fetching rolling returns:', error);
      return [];
    }
  }

  // Calculate index statistics
  calculateStats(returns: Record<string, number>): IndexStats {
    const values = Object.values(returns);
    if (values.length === 0) {
      return { averageReturn: 0, standardDeviation: 0, sharpeRatio: 0 };
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    const std = Math.sqrt(variance) || 0.01; // Avoid division by zero
    const riskFreeRate = 4.5; // Assuming 4.5% risk-free rate

    return {
      averageReturn: avg,
      standardDeviation: std,
      sharpeRatio: (avg - riskFreeRate) / std
    };
  }

  // Compare multiple indices rolling returns
  async compareRollingReturns(
    indices: string[], 
    fromDate?: string, 
    toDate?: string
  ): Promise<ComparisonData> {
    try {
      const indicesParam = indices.join(',');
      let url = `${API_URL}/compare-rolling-returns?indices=${encodeURIComponent(indicesParam)}`;
      
      // Format dates to MM/DD/YYYY format that the server expects
      if (fromDate) {
        try {
          // Verify if the date is already in MM/DD/YYYY format
          const mmddyyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
          if (mmddyyyyPattern.test(fromDate)) {
            url += `&fromDate=${encodeURIComponent(fromDate)}`;
            console.log(`From date already in correct format: ${fromDate}`);
          } else {
            // Convert from ISO or other format to MM/DD/YYYY
            const fromDateObj = new Date(fromDate);
            if (!isNaN(fromDateObj.getTime())) {
              const mm = String(fromDateObj.getMonth() + 1).padStart(2, '0');
              const dd = String(fromDateObj.getDate()).padStart(2, '0');
              const yyyy = fromDateObj.getFullYear();
              const formattedFromDate = `${mm}/${dd}/${yyyy}`;
              url += `&fromDate=${encodeURIComponent(formattedFromDate)}`;
              console.log(`From date: ${fromDate} -> ${formattedFromDate}`);
            } else {
              console.warn(`Invalid from date: ${fromDate}`);
              url += `&fromDate=${encodeURIComponent(fromDate)}`;
            }
          }
        } catch (e) {
          console.error('Error formatting fromDate:', e);
          url += `&fromDate=${encodeURIComponent(fromDate)}`;
        }
      }
      
      if (toDate) {
        try {
          // Verify if the date is already in MM/DD/YYYY format
          const mmddyyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
          if (mmddyyyyPattern.test(toDate)) {
            url += `&toDate=${encodeURIComponent(toDate)}`;
            console.log(`To date already in correct format: ${toDate}`);
          } else {
            // Convert from ISO or other format to MM/DD/YYYY
            const toDateObj = new Date(toDate);
            if (!isNaN(toDateObj.getTime())) {
              const mm = String(toDateObj.getMonth() + 1).padStart(2, '0');
              const dd = String(toDateObj.getDate()).padStart(2, '0');
              const yyyy = toDateObj.getFullYear();
              const formattedToDate = `${mm}/${dd}/${yyyy}`;
              url += `&toDate=${encodeURIComponent(formattedToDate)}`;
              console.log(`To date: ${toDate} -> ${formattedToDate}`);
            } else {
              console.warn(`Invalid to date: ${toDate}`);
              url += `&toDate=${encodeURIComponent(toDate)}`;
            }
          }
        } catch (e) {
          console.error('Error formatting toDate:', e);
          url += `&toDate=${encodeURIComponent(toDate)}`;
        }
      }
      
      console.log(`Fetching comparison data from: ${url}`);
      const response = await axios.get(url);
      
      // Check if we got valid data
      if (response.data && response.data.comparisonData) {
        // Ensure we have data for all required periods
        const periodsToCheck = ['1Y', '3Y', '5Y', '7Y', '10Y'];
        const returnData = response.data as ComparisonData;
        
        // Initialize any missing periods with empty data
        periodsToCheck.forEach(period => {
          if (!returnData.comparisonData[period]) {
            returnData.comparisonData[period] = {
              dates: [],
              indices: {}
            };
            
            // Initialize indices
            indices.forEach(index => {
              returnData.comparisonData[period].indices[index] = [];
            });
          }
        });
        
        return returnData;
      }
      
      return response.data || { comparisonData: {} };
    } catch (error) {
      console.error('Error comparing rolling returns:', error);
      // Return valid but empty data structure instead of throwing error
      return { 
        comparisonData: {
          '1Y': { dates: [], indices: {} },
          '3Y': { dates: [], indices: {} },
          '5Y': { dates: [], indices: {} },
          '7Y': { dates: [], indices: {} },
          '10Y': { dates: [], indices: {} }
        } 
      };
    }
  }

  // Get latest market news
  async getMarketNews(limit = 3): Promise<NewsItem[]> {
    try {
      const response = await axios.get(`${API_URL}/market-news`, {
        params: { limit }
      });
      
      if (response.data && response.data.news) {
        return response.data.news;
      }
      
      // Fallback to the old response format
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      console.error("Unexpected API response format", response.data);
      return [];
    } catch (error) {
      console.error("Error fetching market news", error);
      return [];
    }
  }
  
  // Fallback news data if API call fails
  private getFallbackNews(): NewsItem[] {
    return [
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
  }

  // Get inception dates for all indices
  async getInceptionDates(): Promise<Record<string, string>> {
    try {
      const response = await axios.get(`${API_URL}/inception-dates`);
      return response.data.inceptionDates || {};
    } catch (error) {
      console.error('Error fetching inception dates:', error);
      return {};
    }
  }

  // Get inception date for a specific index
  async getInceptionDate(index: string): Promise<string | null> {
    try {
      const response = await axios.get(`${API_URL}/inception-date/${encodeURIComponent(index)}`);
      return response.data.inceptionDate;
    } catch (error) {
      console.error(`Error fetching inception date for ${index}:`, error);
      return null;
    }
  }
}

export const apiService = new ApiService(); 