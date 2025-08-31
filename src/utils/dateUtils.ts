/**
 * Date utilities for chart display
 */

/**
 * Shifts a date by a specific number of years
 * @param dateString The original date string
 * @param yearShift The number of years to shift (can be positive or negative)
 * @returns The shifted date string in the original format
 */
export function shiftDateByYears(dateString: string, yearShift: number): string {
  if (!dateString) return '';
  
  // Handle MM/DD/YYYY format
  const mmddyyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = dateString.match(mmddyyyyPattern);
  if (match) {
    const month = parseInt(match[1], 10) - 1; // Convert to 0-indexed month
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10) + yearShift;
    
    const newDate = new Date(year, month, day);
    // Return in MM/DD/YYYY format
    return `${String(newDate.getMonth() + 1).padStart(2, '0')}/${String(newDate.getDate()).padStart(2, '0')}/${newDate.getFullYear()}`;
  }
  
  // Handle ISO format (YYYY-MM-DD)
  const date = new Date(dateString);
  
  // Only process valid dates
  if (isNaN(date.getTime())) return dateString;
  
  // Add the specified number of years
  date.setFullYear(date.getFullYear() + yearShift);
  
  // Return in the same format as the input
  if (dateString.includes('T') || dateString.includes(' 00:00:00')) {
    // Handle ISO format with time component
    return date.toISOString().split('T')[0] + (dateString.includes(' 00:00:00') ? ' 00:00:00' : '');
  } else if (dateString.includes('-')) {
    // Handle YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } else {
    // Default to MM/DD/YYYY for any other formats
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  }
}

/**
 * Transforms a date string for rolling returns chart display based on time period
 * @param dateStr The original date string
 * @param period The time period (1Y, 3Y, 5Y, 7Y, 10Y)
 * @returns Transformed date string
 */
export function transformDateForRollingReturnsChart(dateStr: string, period: string): string {
  if (!dateStr) return '';
  
  try {
    // Extract years to add based on period
    let yearsToAdd = 0;
    if (period === '1Y') yearsToAdd = 1;
    else if (period === '3Y') yearsToAdd = 3;
    else if (period === '5Y') yearsToAdd = 5;
    else if (period === '7Y') yearsToAdd = 7;
    else if (period === '10Y') yearsToAdd = 10;
    
    // Handle MM/DD/YYYY format
    const mmddyyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateStr.match(mmddyyyyPattern);
    if (match) {
      const month = parseInt(match[1], 10) - 1; // Convert to 0-indexed
      const day = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      
      const date = new Date(year, month, day);
      date.setFullYear(date.getFullYear() + yearsToAdd);
      
      // Return in same format as input (MM/DD/YYYY)
      const newMonth = String(date.getMonth() + 1).padStart(2, '0');
      const newDay = String(date.getDate()).padStart(2, '0');
      const newYear = date.getFullYear();
      return `${newMonth}/${newDay}/${newYear}`;
    }
    
    // Handle ISO format (YYYY-MM-DD)
    const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
    const isoMatch = dateStr.match(isoPattern);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      
      const date = new Date(year, month, day);
      date.setFullYear(date.getFullYear() + yearsToAdd);
      
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    // Fallback to standard date parsing
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    date.setFullYear(date.getFullYear() + yearsToAdd);
    
    // Return in MM/DD/YYYY format by default for consistency
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  } catch (e) {
    console.error('Error transforming date:', e);
    return dateStr;
  }
}

/**
 * Formats date for display in chart tooltip
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatChartDate(date: string | number): string {
  if (!date) return '';
  
  try {
    // Handle MM/DD/YYYY strings
    if (typeof date === 'string') {
      const mmddyyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = date.match(mmddyyyyPattern);
      if (match) {
        const month = parseInt(match[1], 10) - 1;
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        
        const d = new Date(year, month, day);
        return d.toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric'
        });
      }
    }
    
    // Handle timestamp or other date formats
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric'
    });
  } catch (e) {
    console.error('Error formatting chart date:', e);
    return String(date);
  }
}

/**
 * Converts a date to MM/DD/YYYY format
 * @param date Date string or Date object
 * @returns Date in MM/DD/YYYY format
 */
export function toMMDDYYYY(date: string | Date): string {
  if (!date) return '';
  
  try {
    // If already in MM/DD/YYYY format, return as is
    if (typeof date === 'string') {
      const mmddyyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      if (mmddyyyyPattern.test(date)) {
        return date;
      }
    }
    
    // Convert to Date object
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return typeof date === 'string' ? date : '';
    
    // Format as MM/DD/YYYY
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${month}/${day}/${year}`;
  } catch (e) {
    console.error('Error converting to MM/DD/YYYY:', e);
    return typeof date === 'string' ? date : '';
  }
} 