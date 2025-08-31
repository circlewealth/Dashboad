import { createDatabaseWorker, type DatabaseApi } from '../worker/database';

class DatabaseService {
  private worker: ReturnType<typeof createDatabaseWorker> | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeWorker();
  }

  private async initializeWorker() {
    try {
      this.worker = createDatabaseWorker();
      await this.worker.initSqlite();
      this.isInitialized = true;
      console.log('Database worker initialized');
    } catch (error) {
      console.error('Failed to initialize database worker:', error);
    }
  }

  async query(dbPath: string, sql: string, params: any[] = []) {
    if (!this.isInitialized || !this.worker) {
      await this.initializeWorker();
    }

    try {
      await this.worker!.openDatabase(dbPath);
      const result = await this.worker!.query(sql, params);
      await this.worker!.closeDatabase();
      return result;
    } catch (error) {
      console.error('Error executing database query:', error);
      throw error;
    }
  }

  // Helper method for the index database
  async queryIndexData(sql: string, params: any[] = []) {
    return this.query('/database.db', sql, params);
  }

  // Helper method for the returns database
  async queryReturnsData(sql: string, params: any[] = []) {
    return this.query('/final.db', sql, params);
  }

  // Get all available indices from the database
  async getAllIndices() {
    const columns = await this.queryIndexData("PRAGMA table_info(Sheet1)");
    return columns
      .map((col: any) => col.name)
      .filter((name: string) => name !== 'Date');
  }

  // Get historical data for a specific index
  async getHistoricalData(indexName: string) {
    const query = `
      SELECT Date as date, "${indexName}" as value 
      FROM Sheet1 
      WHERE "${indexName}" IS NOT NULL 
      ORDER BY Date
    `;
    
    return this.queryIndexData(query);
  }

  // Get returns for a specific index across all periods
  async getReturns(indexName: string) {
    const formattedIndexName = indexName.replace(/\./g, '\\.').trim(); // Escape dots for SQLite
    const returns: Record<string, number> = {};
    
    for (const period of ['1Yr', '3Yr', '5Yr', '7Yr', '10Yr']) {
      const returnKey = period === '1Yr' ? '1Y' : 
                       period === '3Yr' ? '3Y' : 
                       period === '5Yr' ? '5Y' : 
                       period === '7Yr' ? '7Y' : '10Y';
      
      const columnName = ` ${formattedIndexName} (${period})`;
      const query = `
        SELECT "${columnName}" as returnValue
        FROM returns
        ORDER BY "From" DESC
        LIMIT 1
      `;
      
      try {
        const result = await this.queryReturnsData(query);
        if (result && result[0] && result[0].returnValue) {
          returns[returnKey] = parseFloat(result[0].returnValue);
        } else {
          returns[returnKey] = 0;
        }
      } catch (error) {
        console.error(`Error fetching ${period} returns for ${indexName}:`, error);
        returns[returnKey] = 0;
      }
    }
    
    return returns;
  }

  // Get all returns for a specific period
  async getAllReturnsForPeriod(period: string) {
    const dbPeriod = period === '1Y' ? '1Yr' : 
                     period === '3Y' ? '3Yr' : 
                     period === '5Y' ? '5Yr' : 
                     period === '7Y' ? '7Yr' : '10Yr';
    
    const columns = await this.queryReturnsData("PRAGMA table_info(returns)");
    const periodColumns = columns
      .map((col: any) => col.name)
      .filter((name: string) => name.includes(`(${dbPeriod})`));
    
    const query = `
      SELECT ${periodColumns.map(col => `"${col}" as "${col}"`).join(', ')}
      FROM returns
      ORDER BY "From" DESC
      LIMIT 1
    `;
    
    try {
      const result = await this.queryReturnsData(query);
      const returns: Record<string, number> = {};
      
      if (result && result[0]) {
        for (const column of periodColumns) {
          const indexMatch = column.match(/^\s*([^(]+)\s*\(\d+Yr\)$/);
          if (indexMatch && result[0][column]) {
            const indexName = indexMatch[1].trim();
            returns[indexName] = parseFloat(result[0][column]);
          }
        }
      }
      
      return returns;
    } catch (error) {
      console.error(`Error fetching returns for period ${period}:`, error);
      return {};
    }
  }
}

export const databaseService = new DatabaseService(); 