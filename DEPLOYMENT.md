# Deployment Guide

This guide explains how to deploy the Huracán Info Weather Challenge application.

## Architecture

- **Backend API**: Deployed on Railway (Node.js + PostgreSQL)
- **Frontend**: Deployed on GitHub Pages (React SPA)

## Backend Deployment (Railway)

### Initial Setup

1. **Create a Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with your GitHub account

2. **Create a New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose the `weather-game` repository
   - Select the `backend` directory as the root

3. **Add PostgreSQL Database**
   - In your Railway project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically set the `DATABASE_URL` environment variable

4. **Configure Environment Variables**

   In Railway's dashboard, go to Variables and set:

   ```
   JWT_SECRET=<generate-a-secure-random-string>
   JWT_EXPIRES_IN=7d
   PORT=3001
   NODE_ENV=production
   ```

   Railway automatically provides:
   - `DATABASE_URL` - PostgreSQL connection string
   - `PORT` - The port your app should listen on

5. **Deploy**
   - Railway will automatically deploy your backend
   - The database migration will run automatically
   - Get your Railway API URL (e.g., `https://your-app.railway.app`)

6. **Seed the Database**

   After first deployment, open Railway's terminal and run:
   ```bash
   npm run db:seed
   ```

   This populates the database with weather stations.

### Database Persistence

✅ **Your database persists automatically** on Railway. Once seeded, your data (users, forecasts, scores, stations) will persist across all deployments.

### Updating the Backend

Simply push to your main branch:
```bash
git push origin main
```

Railway will automatically redeploy your backend.

---

## Frontend Deployment (GitHub Pages)

### Initial Setup

1. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Navigate to Settings → Pages
   - Under "Source", select "GitHub Actions"

2. **Configure API URL Secret**

   Add your Railway API URL as a GitHub secret:

   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `VITE_API_URL`
   - Value: `https://your-app.railway.app/api`

   (Replace with your actual Railway URL from step 1)

3. **Deploy**

   The frontend will automatically deploy when you push to the `main` branch:

   ```bash
   git push origin main
   ```

   The GitHub Action will:
   - Install dependencies
   - Build the React app with your API URL
   - Deploy to GitHub Pages

4. **Access Your Site**

   Your site will be available at:
   ```
   https://<your-username>.github.io/weather-game/
   ```

### Manual Deployment

You can also trigger a manual deployment:

1. Go to Actions tab on GitHub
2. Select "Deploy to GitHub Pages"
3. Click "Run workflow"

---

## Environment Variables Summary

### Backend (.env on Railway)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection (auto-set by Railway) | Auto-provided |
| `JWT_SECRET` | Yes | Secret key for JWT tokens | Random 32+ char string |
| `JWT_EXPIRES_IN` | No | JWT expiration time | `7d` |
| `PORT` | Yes | Server port (auto-set by Railway) | Auto-provided |
| `NODE_ENV` | Yes | Environment | `production` |

### Frontend (GitHub Secrets)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API URL | `https://your-app.railway.app/api` |

---

## Testing the Deployment

### Test Backend API

```bash
# Health check
curl https://your-app.railway.app/api/health

# Get stations (should return seeded data)
curl https://your-app.railway.app/api/stations
```

### Test Frontend

1. Visit `https://<your-username>.github.io/weather-game/`
2. Try registering a new account
3. Submit a forecast
4. Check the leaderboard

---

## Troubleshooting

### Backend Issues

**Database connection errors:**
- Verify `DATABASE_URL` is set in Railway
- Check Railway logs for connection errors

**Migration errors:**
- Check if migrations ran successfully in Railway logs
- Manually run: `npm run db:migrate`

**Seed data missing:**
- Run `npm run db:seed` in Railway's terminal

### Frontend Issues

**API calls failing:**
- Verify `VITE_API_URL` secret is set correctly
- Check browser console for CORS errors
- Ensure Railway backend allows CORS from your GitHub Pages domain

**404 on refresh:**
- This is expected on GitHub Pages with client-side routing
- Users should navigate from the home page

**Blank page:**
- Check browser console for errors
- Verify the build completed successfully in GitHub Actions
- Check that the `base` path in `vite.config.js` matches your repo name

---

## Monitoring

### Backend Monitoring (Railway)

- View logs in Railway dashboard
- Monitor database usage
- Track API response times

### Frontend Monitoring

- Check GitHub Actions for build status
- Use browser dev tools to debug client-side issues

---

## Cost

- **Railway**: Free tier includes $5/month credit (enough for small projects)
- **GitHub Pages**: Free for public repositories

---

## Updating

### Backend Updates

1. Make changes to backend code
2. Commit and push to main branch
3. Railway automatically redeploys
4. No data loss - database persists

### Frontend Updates

1. Make changes to frontend code
2. Commit and push to main branch
3. GitHub Actions automatically rebuilds and redeploys

---

## Local Development

### Backend

```bash
cd backend
npm install
npm run db:migrate  # Setup local PostgreSQL database
npm run db:seed     # Seed data
npm run dev         # Start dev server on port 3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev         # Start dev server on port 3000
```

The frontend proxy in `vite.config.js` will forward API calls to `localhost:3001`.

---

## Security Notes

1. **Never commit `.env` files** - They contain secrets
2. **Use strong JWT secrets** - Generate with: `openssl rand -base64 32`
3. **Enable CORS properly** - Only allow your GitHub Pages domain
4. **Keep dependencies updated** - Run `npm audit` regularly
5. **Validate all user input** - Backend already has validation middleware

---

## Support

For issues or questions:
- Check the logs (Railway for backend, GitHub Actions for frontend)
- Review the API documentation in `backend/API_ENDPOINTS.md`
- Review the database setup in `backend/DATABASE_SETUP.md`
