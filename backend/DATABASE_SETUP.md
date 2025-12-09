# Database Setup

## Production (Railway)

The database is automatically configured when you deploy to Railway:

1. Railway provides a PostgreSQL database service
2. The `DATABASE_URL` environment variable is automatically set
3. Data persists across deployments
4. Migrations are run automatically on deployment

## Running Migrations on Railway

When you deploy to Railway, the migration will run automatically. If the database is already migrated, you can seed it with:

```bash
npm run db:seed
```

This will populate the database with sample weather stations.

## Database Persistence

✅ **Data persists on Railway** - The PostgreSQL database provided by Railway keeps all your data between deployments and restarts.

- User accounts persist
- Forecasts persist
- Scores persist
- Station data persists

You only need to run `db:seed` once to populate the initial station data.

## Local Development

For local development, you'll need to set up a local PostgreSQL database and update the `DATABASE_URL` in `.env`:

```
DATABASE_URL="postgresql://username:password@localhost:5432/hurricane_forecast?schema=public"
```

Then run:
```bash
npm run db:migrate  # Run migrations
npm run db:seed     # Seed initial data
```
