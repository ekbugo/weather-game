# Automated Score Calculation

This document explains how to set up automatic daily score calculation for the Hurricane Forecast app.

## How It Works

1. **Forecasts are submitted** by users through the app
2. **Weather data is imported** (manually or automatically)
3. **Scores are calculated automatically** every day at 3:00 AM AST
4. **User points are updated** and leaderboard is refreshed

## Setup Instructions

### Step 1: Configure Railway Environment

Add the `CRON_SECRET` environment variable in Railway:

1. Go to your Railway project
2. Navigate to Variables
3. Add new variable:
   ```
   CRON_SECRET=<generate-a-secure-random-string>
   ```

**Generate a secure secret:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# Or use any secure random string generator
```

### Step 2: Configure GitHub Secrets

Add two secrets to your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add these secrets:

   - **Name:** `RAILWAY_API_URL`
     - **Value:** `https://your-app.railway.app` (your Railway URL, without /api)

   - **Name:** `CRON_SECRET`
     - **Value:** (same value as in Railway)

### Step 3: Deploy

Merge the automated scoring changes to main:

1. The backend will deploy with the new `/api/cron/calculate-scores` endpoint
2. The GitHub Action will be ready to run

### Step 4: Test

Test the automated scoring manually:

**Option A: Via GitHub Actions**
1. Go to Actions → "Daily Score Calculation"
2. Click "Run workflow"
3. Check the logs to verify it worked

**Option B: Via API**
```bash
curl -X POST https://your-app.railway.app/api/cron/calculate-scores \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## Cron Schedule

The GitHub Action runs:
- **Daily at 3:00 AM AST (7:00 AM UTC)**
- Can also be triggered manually via GitHub Actions

To change the schedule, edit `.github/workflows/daily-score-calculation.yml`:

```yaml
schedule:
  - cron: '0 7 * * *'  # Change this line
```

Cron syntax:
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-6, Sunday=0)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

Examples:
- `0 7 * * *` - Every day at 7:00 AM UTC
- `0 */6 * * *` - Every 6 hours
- `0 8 * * 1-5` - Weekdays at 8:00 AM UTC

---

## API Endpoints

### POST /api/cron/calculate-scores

Trigger score calculation for all pending forecasts.

**Headers:**
```
x-cron-secret: YOUR_CRON_SECRET
```

**Response:**
```json
{
  "success": true,
  "message": "Score calculation completed",
  "results": {
    "calculated": 5,
    "skipped": 2,
    "errors": 0
  }
}
```

### GET /api/cron/health

Check cron service health (for monitoring).

**Headers:**
```
x-cron-secret: YOUR_CRON_SECRET
```

**Response:**
```json
{
  "status": "ok",
  "service": "cron",
  "timestamp": "2024-12-09T07:00:00.000Z"
}
```

---

## How Score Calculation Works

1. **Finds pending forecasts**: Looks for forecasts that have matching station readings but no scores yet
2. **Calculates each score**: Compares forecast predictions to actual weather data
3. **Updates database**: Creates score records and updates user total points
4. **Skips duplicates**: Won't recalculate scores that already exist

The scoring logic follows these rules:

| Parameter | Perfect (5pts) | 4pts | 3pts | 2pts | 1pt | 0pts |
|-----------|---------------|------|------|------|-----|------|
| Max Temp | 0° diff | 1° | 2° | 3° | 4° | 5°+ |
| Min Temp | 0° diff | 1° | 2° | 3° | 4° | 5°+ |
| Wind Gust | 0 diff | 1-2 | 3-5 | 6-9 | 10-14 | 15+ |
| Precipitation | 0 range diff | 1 | 2 | 3 | 4 | 5+ |

**Perfect Forecast Bonus:** +5 points if all parameters are perfect (total: 25 points)

---

## Manual Score Calculation

You can still calculate scores manually when needed:

### Via Railway Terminal
```bash
cd backend
npm run calculate-scores
```

### Via API (with secret)
```bash
curl -X POST https://your-app.railway.app/api/cron/calculate-scores \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## Troubleshooting

### Scores Not Being Calculated

1. **Check GitHub Actions logs**:
   - Go to Actions tab → Daily Score Calculation
   - Look for errors in the latest run

2. **Verify secrets are set**:
   - Railway: Check `CRON_SECRET` is set
   - GitHub: Check both `RAILWAY_API_URL` and `CRON_SECRET` are set

3. **Test the endpoint manually**:
   ```bash
   curl -X POST https://your-app.railway.app/api/cron/calculate-scores \
     -H "x-cron-secret: YOUR_CRON_SECRET" \
     -v
   ```

4. **Check Railway logs**:
   - Look for errors when the endpoint is called
   - Verify the CRON_SECRET matches

### Weather Data Not Available

Scores can only be calculated after weather readings are imported:

1. Place JSON files in `backend/data/`
2. Run `npm run import-readings` in Railway terminal
3. Then scores will calculate automatically (or manually trigger)

---

## Monitoring

### Check Latest Score Calculation

Via Railway logs:
- Look for "Score calculation triggered via API"
- Check for "✅ Calculated: X" messages

Via API:
```bash
# Check recent scores
curl https://your-app.railway.app/api/leaderboard/stats
```

---

## Cost

- GitHub Actions: **Free** (2000 minutes/month on free tier)
- Railway: **No additional cost** (just API calls to your existing app)

---

## Security

- The cron endpoint is protected by `CRON_SECRET`
- Keep this secret secure and never commit it to git
- Only GitHub Actions and authorized services should have access
- The endpoint returns 401 Unauthorized without the correct secret

---

## Alternative: Railway Cron Jobs

If you prefer, you can set up a Railway cron job instead of GitHub Actions:

1. Create a new Railway service
2. Set it to run `npm run calculate-scores` on a schedule
3. Point it to the same database

However, GitHub Actions is simpler and free for most use cases.
