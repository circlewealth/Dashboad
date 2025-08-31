#!/bin/bash

# Build script for Render deployment

# Install dependencies
npm install

# Build the frontend
npm run build

# Copy database files to dist directory
cp -f database.db dist/database.db
cp -f final.db dist/final.db

echo "Build completed successfully!"