import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sqlite3
from sqlalchemy import create_engine
import time

def find_closest_trading_day(dates_array, target_date, start_index):
    """
    Find the closest available trading day to target date.
    If target date is available, use it.
    If not, use the latest available date before the target date.
    If the target date is beyond the last available date, return None.
    """
    # Get all available dates after the start_index
    available_dates = dates_array[start_index:]
    
    if len(available_dates) == 0:
        return None
    
    # Find the closest date
    target_date_num = pd.Timestamp(target_date).to_datetime64()
    
    # If target date is beyond the last available date, return None
    if target_date_num > available_dates[-1]:
        return None
    
    # Find exact match if exists
    exact_matches = np.where(available_dates == target_date_num)[0]
    if len(exact_matches) > 0:
        return start_index + exact_matches[0]
    
    # Find the closest date before the target date
    past_dates_idx = np.where(available_dates < target_date_num)[0]
    if len(past_dates_idx) > 0:
        return start_index + past_dates_idx[-1]
    
    return None

def calculate_returns_optimized(df, years):
    """
    Calculate annualized returns in CAGR term over a specified number of years.
    Only use actual dates and values from the input file.
    """
    # Convert date column to datetime and sort
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date').reset_index(drop=True)
    
    # Convert dates to numpy array for faster operations
    dates_array = df['Date'].to_numpy()
    
    # Get the earliest and latest dates in the dataset
    earliest_date = df['Date'].min()
    latest_date = df['Date'].max()
    min_possible_period = (latest_date - earliest_date).days / 365.25
    
    if min_possible_period < years:
        print(f"Warning: Data only spans {min_possible_period:.2f} years, which is less than the requested {years} years.")
    
    # Create result dataframe
    result_df = pd.DataFrame()
    result_df['From'] = df['Date'].dt.strftime('%m/%d/%Y')
    
    # Pre-calculate all target dates
    target_dates = df['Date'] + pd.DateOffset(years=years)
    
    # Find closest trading days for all dates in one pass
    to_indices = []
    for i, target_date in enumerate(target_dates):
        closest_idx = find_closest_trading_day(dates_array, target_date, i)
        to_indices.append(closest_idx if closest_idx is not None else None)
    
    # Create To dates column
    to_dates = []
    for idx in to_indices:
        if idx is not None:
            to_dates.append(df['Date'].iloc[idx].strftime('%m/%d/%Y'))
        else:
            to_dates.append("")
    
    result_df[f'To ({years}Yr)'] = to_dates
    
    # Calculate returns for numeric columns
    for column in df.columns:
        if column == 'Date':
            continue
        
        try:
            # Clean the data and convert to numeric
            series = pd.to_numeric(df[column].astype(str).str.replace(',', ''), errors='coerce')
            
            # Calculate returns
            returns = []
            for i, to_idx in enumerate(to_indices):
                if to_idx is not None:
                    start_val = series.iloc[i]
                    end_val = series.iloc[to_idx]
                    
                    if pd.notna(start_val) and pd.notna(end_val) and start_val != 0:
                        total_return = (end_val / start_val) - 1
                        actual_days = (df['Date'].iloc[to_idx] - df['Date'].iloc[i]).days
                        
                        if actual_days > 0:
                            actual_years = actual_days / 365.25
                            # Only calculate if the period is at least half of the requested years
                            if actual_years >= years * 0.5:
                                annualized_return = (((1 + total_return) ** (1 / actual_years)) - 1) * 100
                                returns.append(f"{annualized_return:.2f}%")
                            else:
                                # Period too short
                                returns.append("")
                        else:
                            returns.append("")
                    else:
                        returns.append("")
                else:
                    returns.append("")
            
            result_df[f" {column} ({years}Yr)"] = returns
            
        except Exception as e:
            print(f"Error processing column {column} for {years} year return: {str(e)}")
            result_df[f" {column} ({years}Yr)"] = [""] * len(result_df)
    
    # Filter out rows where the "To" date is empty (no valid target date found)
    valid_rows = result_df[f'To ({years}Yr)'] != ""
    if not all(valid_rows):
        print(f"Removed {len(result_df) - valid_rows.sum()} rows with no valid 'To' date for {years} year period")
        result_df = result_df[valid_rows].reset_index(drop=True)
    
    return result_df

def main():
    try:
        print("Starting script execution...")
        start_total = time.time()
        
        # Read from input database
        input_db = "./database.db"
        print(f"Reading from database {input_db}...")
        
        # Connect to input database
        conn = sqlite3.connect(input_db)
        df = pd.read_sql_query("SELECT * FROM Sheet1", conn)
        conn.close()
        
        print(f"Data loaded successfully. Shape: {df.shape}")
        
        if df.empty:
            print("Warning: Data frame is empty")
            return
        
        # Process all periods
        periods = [1, 3, 5, 7, 10]
        all_results = []
        
        for years in periods:
            print(f"Calculating returns for {years} year period...")
            start_time = time.time()
            period_result_df = calculate_returns_optimized(df.copy(), years)
            all_results.append(period_result_df)
            print(f"Finished calculating {years} year returns in {time.time() - start_time:.2f} seconds")

        # Concatenate results horizontally
        if all_results:
            print(f"Finalizing output with {len(all_results)} period results...")
            final_result_df = pd.concat(all_results, axis=1)
            
            # Remove duplicate columns if any
            final_result_df = final_result_df.loc[:, ~final_result_df.columns.duplicated(keep='first')]
            
            # Create header row for "Annualized Return"
            header_row = ["Annualized Return"] + [""] * (len(final_result_df.columns) - 1)
            header_df = pd.DataFrame([header_row], columns=final_result_df.columns)
            final_result_df = pd.concat([header_df, final_result_df], ignore_index=True)
            
            # Save to output database
            output_db = "./final.db"
            engine = create_engine(f'sqlite:///{output_db}')
            final_result_df.to_sql('returns', engine, if_exists='replace', index=False)
            
            print(f"Returns for multiple periods have been calculated and saved to {output_db}")
            print(f"Total execution time: {time.time() - start_total:.2f} seconds")
        else:
            print("No data was processed from the input file.")
    except Exception as e:
        print(f"Error in main function: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 