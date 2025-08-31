import { apiService, type HistoricalDataPoint, type IndexReturn, type IndexStats } from './api';

class IndexDataService {
  private indexData: Map<string, IndexReturn> = new Map();
  private indices: string[] = [];
  private periods: string[] = ['1Y', '3Y', '5Y', '7Y', '10Y'];
  private isLoading: boolean = true;
  private isInitialized: boolean = false;
  
  constructor() {
    this.loadData().catch(err => {
      console.error('Error in loadData:', err);
      this.initializeFallbackData();
    });
  }

  private async loadData(): Promise<void> {
    try {
      this.isLoading = true;
      
      // Get all available indices and periods
      const [indexNames, periods] = await Promise.all([
        apiService.getAllIndices(),
        apiService.getPeriods()
      ]);
      
      this.indices = indexNames;
      if (periods.length > 0) {
        this.periods = periods;
      }
      
      // Load data for each index
      for (const indexName of indexNames) {
        try {
          // Get historical data and returns in parallel
          const [historicalData, returns] = await Promise.all([
            apiService.getHistoricalData(indexName),
            apiService.getReturns(indexName)
          ]);
          
          // Add to our cache
          this.indexData.set(indexName, {
            name: indexName,
            symbol: this.formatSymbol(indexName),
            returns: {
              '1Y': returns['1Y'] || 0,
              '3Y': returns['3Y'] || 0,
              '5Y': returns['5Y'] || 0,
              '7Y': returns['7Y'] || 0,
              '10Y': returns['10Y'] || 0
            },
            historicalData
          });
        } catch (error) {
          console.error(`Error loading data for index ${indexName}:`, error);
        }
      }
      
      console.log(`Loaded ${this.indexData.size} indices from database`);
    } catch (error) {
      console.error('Error loading index database:', error);
      throw error;
    } finally {
      this.isLoading = false;
      this.isInitialized = true;
    }
  }

  private formatSymbol(indexName: string): string {
    // Extract the core symbol from the index name
    const parts = indexName.split('_');
    if (parts.length > 0) {
      // Return last part or the whole string if it's short
      return parts.length > 1 ? parts[parts.length - 1] : indexName;
    }
    return indexName;
  }

  private initializeFallbackData(): void {
    console.log('Initializing fallback data');
    // Initialize with some sample data
    this.indices = ['NIFTY 50', 'NIFTY Bank', 'NIFTY IT', 'NIFTY Auto', 'NIFTY Pharma', 'NIFTY FMCG'];
    
    this.indexData.set('NIFTY 50', {
      name: 'NIFTY 50',
      symbol: 'NIFTY',
      returns: {
        '1Y': 22.5,
        '3Y': 15.8,
        '5Y': 12.4,
        '7Y': 11.2,
        '10Y': 13.6
      },
      historicalData: [
        { date: '2019-01-01', value: 12.5 },
        { date: '2020-01-01', value: -8.2 },
        { date: '2021-01-01', value: 24.8 },
        { date: '2022-01-01', value: 15.3 },
        { date: '2023-01-01', value: 18.7 },
        { date: '2024-01-01', value: 22.5 }
      ]
    });

    this.indexData.set('NIFTY Bank', {
      name: 'NIFTY Bank',
      symbol: 'BANKNIFTY',
      returns: {
        '1Y': 25.3,
        '3Y': 18.2,
        '5Y': 14.6,
        '7Y': 13.1,
        '10Y': 15.8
      },
      historicalData: [
        { date: '2019-01-01', value: 15.2 },
        { date: '2020-01-01', value: -12.4 },
        { date: '2021-01-01', value: 28.6 },
        { date: '2022-01-01', value: 17.8 },
        { date: '2023-01-01', value: 21.5 },
        { date: '2024-01-01', value: 25.3 }
      ]
    });

    // Add more indices...
    ['NIFTY IT', 'NIFTY Auto', 'NIFTY Pharma', 'NIFTY FMCG'].forEach((name) => {
      this.indexData.set(name, {
        name,
        symbol: name.replace('NIFTY ', ''),
        returns: {
          '1Y': Math.random() * 30 + 10,
          '3Y': Math.random() * 20 + 10,
          '5Y': Math.random() * 15 + 10,
          '7Y': Math.random() * 12 + 10,
          '10Y': Math.random() * 15 + 10
        },
        historicalData: [
          { date: '2019-01-01', value: Math.random() * 20 },
          { date: '2020-01-01', value: Math.random() * -15 },
          { date: '2021-01-01', value: Math.random() * 30 },
          { date: '2022-01-01', value: Math.random() * 20 },
          { date: '2023-01-01', value: Math.random() * 25 },
          { date: '2024-01-01', value: Math.random() * 30 }
        ]
      });
    });
    
    this.isLoading = false;
    this.isInitialized = true;
  }

  async waitForInitialization(): Promise<void> {
    if (this.isInitialized) return;
    
    return new Promise<void>((resolve) => {
      const checkInit = () => {
        if (this.isInitialized) {
          resolve();
        } else {
          setTimeout(checkInit, 100);
        }
      };
      checkInit();
    });
  }

  isDataLoading(): boolean {
    return this.isLoading;
  }

  getAllIndices(): string[] {
    return this.indices;
  }

  getIndexData(index: string): IndexReturn | undefined {
    return this.indexData.get(index);
  }

  getPeriods(): string[] {
    return this.periods;
  }

  getIndexStats(index: string, period: string): IndexStats {
    const data = this.indexData.get(index);
    if (!data) return { averageReturn: 0, standardDeviation: 0, sharpeRatio: 0 };

    // Get the return for the specified period and calculate stats
    const returnValue = data.returns[period as keyof typeof data.returns] || 0;
    
    // Calculate standard deviation more accurately based on period length
    let stdDev = 0;
    
    // Different standard deviation calculation based on period
    if (period === '1Y') {
      stdDev = Math.abs(returnValue) * 0.6; // Higher volatility for 1Y
    } else if (period === '3Y') {
      stdDev = Math.abs(returnValue) * 0.45; // Medium volatility for 3Y
    } else if (period === '5Y') {
      stdDev = Math.abs(returnValue) * 0.35; // Lower volatility for 5Y
    } else if (period === '7Y') {
      stdDev = Math.abs(returnValue) * 0.3; // Lower volatility for 7Y
    } else if (period === '10Y') {
      stdDev = Math.abs(returnValue) * 0.25; // Lowest volatility for 10Y
    }
    
    // Ensure standard deviation is at least 1 to avoid division by zero in Sharpe ratio
    stdDev = Math.max(stdDev, 1);
    
    // Calculate Sharpe ratio: (Return - Risk-Free Rate) / Standard Deviation
    // Using 4% as an approximate risk-free rate
    const riskFreeRate = 4;
    const sharpeRatio = (returnValue - riskFreeRate) / stdDev;
    
    return {
      averageReturn: returnValue,
      standardDeviation: stdDev,
      sharpeRatio: sharpeRatio
    };
  }

  async getAllReturnsForPeriod(period: string): Promise<Record<string, number>> {
    await this.waitForInitialization();
    
    try {
      return await apiService.getReturnsByPeriod(period);
    } catch (error) {
      console.error('Error getting returns for period:', period, error);
      
      // Fallback to local data if API call fails
      const returns: Record<string, number> = {};
      this.indexData.forEach((data, index) => {
        returns[index] = data.returns[period as keyof typeof data.returns] || 0;
      });
      return returns;
    }
  }
}

export { type HistoricalDataPoint, type IndexReturn, type IndexStats };
export const indexDataService = new IndexDataService(); 