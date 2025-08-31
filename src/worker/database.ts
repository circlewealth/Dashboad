import initSqlJs from 'sql.js';
import { createWorkerFactory } from '@shopify/web-worker';

let SQL: any;
let db: any;

// Initialize SQLite WASM
async function initSqlite() {
  try {
    SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });
    
    console.log('SQLite initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing SQLite:', error);
    return false;
  }
}

// Open database connection
async function openDatabase(path: string) {
  try {
    if (!SQL) {
      await initSqlite();
    }
    
    // In browser, we need to fetch the database file first
    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    const uInt8Array = new Uint8Array(arrayBuffer);
    
    // Create database from the fetched file
    db = new SQL.Database(uInt8Array);
    console.log(`Database opened: ${path}`);
    return true;
  } catch (error) {
    console.error(`Error opening database: ${path}`, error);
    return false;
  }
}

// Execute a query
async function query(sql: string, params: any[] = []) {
  try {
    if (!db) {
      throw new Error('Database not opened');
    }
    
    const statement = db.prepare(sql);
    const result = [];
    
    // Bind parameters if provided
    if (params.length > 0) {
      statement.bind(params);
    }
    
    // Execute and collect results
    while (statement.step()) {
      result.push(statement.getAsObject());
    }
    
    statement.free();
    return result;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

// Close database connection
async function closeDatabase() {
  try {
    if (db) {
      db.close();
      console.log('Database closed');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error closing database:', error);
    return false;
  }
}

// Create worker factory
export const createDatabaseWorker = createWorkerFactory(() => import('./database'));

// Export functions
const api = {
  initSqlite,
  openDatabase,
  query,
  closeDatabase
};

export type DatabaseApi = typeof api;
export default api; 