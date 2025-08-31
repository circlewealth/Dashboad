#!/bin/bash

set -e

# Run the build command
echo "Running build command..."
npm run build

# Create directories if they don't exist
echo "Creating necessary directories..."
mkdir -p dist
mkdir -p api

# Ensure the database files are copied to the correct locations
echo "Copying database files..."

if [ -f "database.db" ]; then
  cp database.db dist/
  cp database.db api/
  # Create a public directory if it doesn't exist
  mkdir -p public
  cp database.db public/
  echo "database.db copied successfully to dist/, api/, and public/"
else
  echo "Warning: database.db not found in root directory"
fi

if [ -f "final.db" ]; then
  cp final.db dist/
  cp final.db api/
  # Create a public directory if it doesn't exist
  mkdir -p public
  cp final.db public/
  echo "final.db copied successfully to dist/, api/, and public/"
else
  echo "Warning: final.db not found in root directory"
fi

# List the files to verify
echo "Verifying copied files:"
ls -la dist/ | grep ".db"
ls -la api/ | grep ".db"
ls -la public/ | grep ".db"

echo "Build completed and database files copied."

# Print environment information for debugging
echo "Environment information:"
echo "Current working directory: $(pwd)"
echo "Files in current directory:"
ls -la

echo "Files in api directory:"
ls -la api/