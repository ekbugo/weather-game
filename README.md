# Huracán Info Student Weather Challenge

A gamified weather forecasting competition app for Puerto Rico.

## Project Structure

```
hurricane-forecast-app/
├── backend/                 # Node.js + Express + Prisma API
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic (scoring, etc.)
│   │   ├── utils/           # Utilities (time handling, etc.)
│   │   └── middleware/      # Auth middleware
│   ├── scripts/             # Data import & scoring jobs
│   └── data/                # Weather station JSON files
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── context/         # React context (auth, etc.)
│   │   ├── i18n/            # Internationalization (ES/EN)
│   │   └── utils/           # Frontend utilities
│   └── public/              # Static assets
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

```bash
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and JWT secret

# Initialize database
npx prisma migrate dev --name init
npx prisma db seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm run dev
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://user:password@localhost:5432/hurricane_forecast"
JWT_SECRET="your-secret-key-here"
PORT=3001
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Stations
- `GET /api/stations/current` - Get current active station

### Forecasts
- `POST /api/forecasts` - Submit a forecast
- `GET /api/forecasts/my-history` - Get user's forecast history
- `GET /api/forecasts/status` - Check submission window status

### Leaderboard
- `GET /api/leaderboard` - Get rankings (weekly/all-time)

### Scores
- `GET /api/scores/my-scores` - Get user's scores

## Data Pipeline

### Importing Weather Data
Place your JSON files in `backend/data/` with the naming convention:
`{STATION_ID}_{YYYY-MM-DD}.json`

Then run:
```bash
cd backend
npm run import-readings
```

### Calculating Scores
Run daily after weather data is imported:
```bash
cd backend
npm run calculate-scores
```

## Scoring Rules

| Parameter | Perfect (5pts) | 4pts | 3pts | 2pts | 1pt | 0pts |
|-----------|---------------|------|------|------|-----|------|
| Max Temp (°F) | 0° diff | 1° | 2° | 3° | 4° | 5°+ |
| Min Temp (°F) | 0° diff | 1° | 2° | 3° | 4° | 5°+ |
| Wind Gust (mph) | 0 diff | 1-2 | 3-5 | 6-9 | 10-14 | 15+ |
| Precipitation | 0 range diff | 1 | 2 | 3 | 4 | 5+ |

**Perfect Forecast Bonus:** +5 points if all parameters are perfect

## Documentation

- **[📚 API Endpoints Reference](backend/API_ENDPOINTS.md)** - Complete API documentation with request/response examples
- **[💾 Database Setup Guide](backend/DATABASE_SETUP.md)** - Database configuration and persistence details
- **[🚀 Deployment Guide](DEPLOYMENT.md)** - Step-by-step deployment instructions for Railway + GitHub Pages

## Deployment

This project is designed to deploy with:
- **Backend**: Railway (Node.js + PostgreSQL)
- **Frontend**: GitHub Pages (React SPA)

### Quick Deployment Steps

1. **Deploy Backend to Railway**
   - Connect your GitHub repository
   - Add PostgreSQL database
   - Set environment variables (JWT_SECRET, etc.)
   - Run `npm run db:seed` once to populate stations

2. **Deploy Frontend to GitHub Pages**
   - Enable GitHub Pages in repository settings
   - Set `VITE_API_URL` secret with your Railway URL
   - Push to main branch (auto-deploys via GitHub Actions)

✅ **Database persists automatically** on Railway - seed data only once!

For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Testing Endpoints

Once deployed, verify your backend is working:

```bash
# Health check
curl https://your-app.railway.app/api/health

# Get stations
curl https://your-app.railway.app/api/stations
```

Your frontend will be available at: `https://<username>.github.io/weather-game/`

## License
