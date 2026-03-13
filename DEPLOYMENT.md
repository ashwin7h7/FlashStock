# Flash Stock Deployment Guide

## Required Environment Variables

### Backend (server/.env)
- PORT: backend port (example: 4000)
- MONGODB_URI: MongoDB connection string
- MONGODB_DB_NAME: database name (default: FlashStock)
- JWT_SECRET: JWT signing secret
- NODE_ENV: development or production
- CORS_ORIGIN: allowed frontend origin(s), comma-separated
- FRONTEND_ORIGIN: fallback frontend origin
- COOKIE_SAME_SITE: strict, lax, or none
- COOKIE_SECURE: true or false
- CLOUDINARY_CLOUD_NAME: Cloudinary cloud name
- CLOUDINARY_API_KEY: Cloudinary API key
- CLOUDINARY_API_SECRET: Cloudinary API secret

### Frontend (client/.env)
- VITE_API_BASE_URL: backend API base URL (example: https://api.your-domain.com/api)
- VITE_SOCKET_URL: backend socket URL (example: https://api.your-domain.com)

## Run Backend Locally
1. Copy server/.env.example to server/.env and set values.
2. Install dependencies:
   - cd server
   - npm install
3. Start backend:
   - npm start

## Run Frontend Locally
1. Copy client/.env.example to client/.env and set values.
2. Install dependencies:
   - cd client
   - npm install
3. Start frontend dev server:
   - npm run dev

## Seed Demo Data
1. Configure backend .env first.
2. Run:
   - cd server
   - npm run seed

## Build for Production
- Frontend build:
  - cd client
  - npm run build
- Backend production start:
  - cd server
  - npm start

## Deployment Notes
- Set CORS_ORIGIN to your deployed frontend URL(s).
- For HTTPS deployments across different domains, use COOKIE_SAME_SITE=none and COOKIE_SECURE=true.
- Keep JWT secret and Cloudinary credentials out of source control.
