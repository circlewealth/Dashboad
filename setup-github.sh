#!/bin/bash

# This script helps initialize a Git repository and push to GitHub
# Usage: ./setup-github.sh <github-username> <repository-name>

if [ $# -ne 2 ]; then
  echo "Usage: ./setup-github.sh <github-username> <repository-name>"
  exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME=$2

# Initialize Git repository if it doesn't exist
if [ ! -d .git ]; then
  echo "Initializing Git repository..."
  git init
fi

# Add all files
git add .

# Commit changes
git commit -m "Initial commit for Render deployment"

# Add GitHub remote
git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git

# Push to GitHub
echo "Pushing to GitHub repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
git push -u origin main

echo "Done! Your code has been pushed to GitHub."
echo "Now you can connect your GitHub repository to Render for deployment."