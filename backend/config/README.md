# Daily Station Schedule Configuration

This directory contains the configuration file for managing which weather station is active each day.

## File: `weekly-schedule.json`

This file controls the daily assignment of weather stations. The system checks this file first before falling back to the database.

### Format

```json
{
  "schedule": [
    {
      "date": "2025-12-13",
      "stationId": "IMAYAG30",
      "notes": "Optional notes"
    }
  ]
}
```

### Fields

- **date**: The forecast date (format: `YYYY-MM-DD`)
  - This is the date users are forecasting FOR
  - Example: `2025-12-13` means forecasts submitted on Dec 12 for Dec 13

- **stationId**: The ID of the weather station to use
  - Can be any station ID that exists in your database
  - No validation - the system will use whatever station ID you provide

- **notes**: Optional description for your reference

### Current Stations in Database

These are the stations currently available. You can add more stations to the database and use them here.

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
3. Find the date entry (or add it if missing)
4. Change the `stationId` to another station
5. Commit the change
6. Railway will automatically redeploy (takes ~2 minutes)

### Adding Future Dates

To add more dates to the schedule:

1. Edit `weekly-schedule.json`
2. Add new entries to the `schedule` array
3. Use the forecast date (the date users are predicting FOR)
4. Commit and push

### Example: Emergency Station Change

**Before** (Mayagüez is offline on Dec 13):
```json
{ "date": "2025-12-13", "stationId": "IMAYAG30", "notes": "Mayagüez - OFFLINE" }
```

**After** (Switch to Cayey):
```json
{ "date": "2025-12-13", "stationId": "ICAYEY43", "notes": "Changed to Cayey - Mayagüez offline" }
```

## How It Works

1. When someone visits the forecast page, the backend calculates today's forecast date
   - Before 5 PM: Forecast date is **tomorrow**
   - After 5 PM: Submissions closed until midnight

2. The backend reads `weekly-schedule.json`
3. It looks for an entry matching the forecast date
4. If found, uses that station
5. If not found, falls back to the database weekly schedule
6. The response includes a `source` field showing where the station came from (`config` or `database`)

## Forecast Dates vs Submission Dates

**Important:** The `date` field is the **forecast date**, not the submission date!

- **Dec 12 (before 5 PM)**: Users submit forecasts FOR Dec 13
  - Config entry needed: `"date": "2025-12-13"`

- **Dec 12 (after 5 PM)**: Submissions closed
  - Window opens at midnight for Dec 14 forecasts

## Tips

- **Plan ahead**: Add 1-2 weeks at a time
- **Document changes**: Use the `notes` field to explain why you changed a station
- **Date format**: Always use `YYYY-MM-DD` format
- **Test first**: After editing, check `/api/stations/current` to verify the change

## Example Schedule (Week of Dec 8-14)

```json
{
  "schedule": [
    { "date": "2025-12-08", "stationId": "IMAYAG30", "notes": "Mayagüez" },
    { "date": "2025-12-09", "stationId": "IMAYAG30", "notes": "Mayagüez" },
    { "date": "2025-12-10", "stationId": "IMAYAG30", "notes": "Mayagüez" },
    { "date": "2025-12-11", "stationId": "IMAYAG30", "notes": "Mayagüez" },
    { "date": "2025-12-12", "stationId": "IMAYAG30", "notes": "Mayagüez" },
    { "date": "2025-12-13", "stationId": "IMAYAG30", "notes": "Mayagüez" },
    { "date": "2025-12-14", "stationId": "IMAYAG30", "notes": "Mayagüez" }
  ]
}
```

## Troubleshooting

**Station not changing?**
- Check that the `date` matches the **forecast date** (not today's date)
- Verify the `stationId` is spelled correctly (case-sensitive)
- Wait 2-3 minutes for Railway to redeploy after committing
- Check `/api/stations/current` to see what date and station it's returning

**Invalid JSON error?**
- Check for missing commas between entries
- Ensure all quotes are double quotes (`"` not `'`)
- Use a JSON validator: https://jsonlint.com/

**How do I know what date to use?**
- Check `/api/stations/current` - it shows the current forecast date
- Or check the forecast page - it displays "Forecast for: YYYY-MM-DD"
