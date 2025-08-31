# Circle Wealth - Financial Analysis Dashboard

## Overview
This project is a financial analysis dashboard that displays market indices, historical data, and rolling returns for various financial indices.

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev:all
   ```
   This will start both the frontend (Vite) and backend (Express) servers.

## Deployment

### Deploying to Render

This project is configured for deployment on Render using the `render.yaml` blueprint file.

1. Create a new Render account if you don't have one at [render.com](https://render.com)
2. Connect your GitHub repository to Render
3. Create a new Blueprint deployment and select your repository
4. Render will automatically detect the `render.yaml` file and create the necessary services

Alternatively, you can deploy manually:

1. **Backend API Service**:
   - Create a new Web Service on Render
   - Connect your repository
   - Set the build command to `npm install`
   - Set the start command to `node server.js`
   - Set the environment variable `PORT` to `10000`

2. **Frontend Service**:
   - Create a new Static Site on Render
   - Connect your repository
   - Set the build command to `npm install && npm run build`
   - Set the publish directory to `dist`
   - Add the environment variable `NODE_ENV` to `production`

### Deploying to Vercel

The project can also be deployed to Vercel:

```
npm run deploy
```

## Technologies Used

- Frontend: React, TypeScript, Vite, Recharts
- Backend: Express, SQLite
- Data: Yahoo Finance API