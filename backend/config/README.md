# Weekly Station Schedule Configuration

This directory contains the configuration file for managing which weather station is active each week.

## File: `weekly-schedule.json`

This file controls the weekly rotation of weather stations. The system checks this file first before falling back to the database.

### Format

```json
{
  "schedule": [
    {
      "weekStart": "2025-12-08",
      "stationId": "IMAYAG30",
      "notes": "Optional notes about this week"
    }
  ]
}
```

### Fields

- **weekStart**: The Monday of the week (format: `YYYY-MM-DD`)
  - Must always be a Monday
  - Example: `2025-12-08` for the week of Dec 8-14

- **stationId**: The ID of the weather station to use
  - Valid values: `IMAYAG30`, `ICAYEY43`, `IAGUAD73`, `ICABOR73`

- **notes**: Optional description for your reference

### Available Stations

| Station ID | Name | Location |
|------------|------|----------|
| IMAYAG30 | Mayagüez Station | Western coastal city |
| ICAYEY43 | Cayey Station | Mountainous region |
| IAGUAD73 | Aguadilla Station | Northwest coast |
| ICABOR73 | Cabo Rojo Station | Southwest coast |

## How to Change Stations

### Quick Change (Emergency)

If a station goes offline:

1. Go to GitHub: `backend/config/weekly-schedule.json`
2. Click the edit (pencil) icon
3. Find the current week's entry
4. Change the `stationId` to another station
5. Commit the change
6. Railway will automatically redeploy (takes ~2 minutes)

### Adding Future Weeks

To add more weeks to the schedule:

1. Edit `weekly-schedule.json`
2. Add new entries to the `schedule` array
3. Make sure `weekStart` is always a Monday
4. Commit and push

### Example: Emergency Station Change

**Before** (Mayagüez is offline):
```json
{
  "weekStart": "2025-12-08",
  "stationId": "IMAYAG30",
  "notes": "Mayagüez Station - OFFLINE"
}
```

**After** (Switch to Cayey):
```json
{
  "weekStart": "2025-12-08",
  "stationId": "ICAYEY43",
  "notes": "Changed to Cayey - Mayagüez offline"
}
```

## How It Works

1. When someone visits the forecast page, the backend reads `weekly-schedule.json`
2. It looks for an entry matching the current week's Monday
3. If found, uses that station
4. If not found, falls back to the database schedule
5. The response includes a `source` field showing where the station came from (`config` or `database`)

## Tips

- **Plan ahead**: Add 4-8 weeks at a time
- **Document changes**: Use the `notes` field to explain why you changed a station
- **Check Mondays**: Use a calendar to ensure `weekStart` dates are Mondays
- **Test first**: After editing, check `/api/stations/current` to verify the change

## Troubleshooting

**Station not changing?**
- Check that `weekStart` matches the current week's Monday exactly
- Verify the `stationId` is spelled correctly (case-sensitive)
- Wait 2-3 minutes for Railway to redeploy after committing

**Invalid JSON error?**
- Check for missing commas between entries
- Ensure all quotes are double quotes (`"` not `'`)
- Use a JSON validator: https://jsonlint.com/
