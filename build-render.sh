#!/bin/bash

# Build script for Render deployment

# Install dependencies
npm install

# Build the frontend
npm run build

# Copy database files to dist directory and root directory
cp -f database.db dist/database.db
cp -f final.db dist/final.db

# Also copy to the root directory where the server will be running
cp -f database.db ./database.db
cp -f final.db ./final.db

# Print database file locations for debugging
echo "Database files copied to:"
echo "- $(pwd)/database.db"
echo "- $(pwd)/final.db"
echo "- $(pwd)/dist/database.db"
echo "- $(pwd)/dist/final.db"

echo "Build completed successfully!"