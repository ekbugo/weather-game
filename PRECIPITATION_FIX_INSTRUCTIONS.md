# Precipitation Scoring Fix - Instructions

## Problem Summary

There was a bug in the precipitation range calculation that caused users to receive incorrect scores. Two functions were calculating precipitation ranges differently:

- **Incorrect (in cronService.js and cron.js)**: Used `<` (less than) instead of `<=` (less than or equal)
- **Correct (in scoringService.js)**: Used `<=` properly

### Example Issues

- **Dec 18**: Actual 0.01" should be Range 1, but was calculated as Range 2
  - User forecasted Range 1, got 4 points instead of 5
- **Dec 16**: Actual 0.17" should be Range 2, but was calculated as Range 3
  - User forecasted Range 2, got 4 points instead of 5

## Files Fixed

1. `backend/src/services/cronService.js` - Now uses `getPrecipRange()` function
2. `backend/src/routes/cron.js` - Now uses `getPrecipRange()` function

## How to Apply the Fix

### Step 1: Deploy the Code Changes

The code has been fixed in the following files:
- `backend/src/services/cronService.js`
- `backend/src/routes/cron.js`
- `backend/package.json` (added new script)
- `backend/scripts/fixPrecipitationScores.js` (new file)

### Step 2: Run the Fix Script in Production

**⚠️ IMPORTANT**: This script will:
1. Delete all existing station readings
2. Delete all existing scores
3. Reset all user totalPoints to zero
4. Re-import all weather readings with correct precipRange
5. Recalculate all scores with correct values

**Before running**, ensure you have:
- A backup of your database
- All weather JSON files in the `backend/data` directory

**To run the fix**:

```bash
cd backend
npm run fix-precipitation-scores
```

### Step 3: Verify the Fix

After running the script, check a few users' scores to verify they're now correct.

Example verification for ed_burgos:
```bash
# Check Dec 18 score (0.01" actual, Range 1 forecast should get 5 points)
# Check Dec 16 score (0.17" actual, Range 2 forecast should get 5 points)
```

## What Changed

### Before (Incorrect)
```javascript
if (precipTotal === 0) precipRange = 1;
else if (precipTotal < 0.10) precipRange = 2;  // ❌ Wrong!
else if (precipTotal < 0.25) precipRange = 3;  // ❌ Wrong!
// etc.
```

### After (Correct)
```javascript
const precipRange = getPrecipRange(precipTotal);
// Uses: if (inches <= 0.10) return 1; ✓
```

## Impact

All users who had forecasts with precipitation values at or near range boundaries will have their scores recalculated correctly. Users who got lower scores than they deserved will now see their correct (higher) scores and total points.

## Testing

To test without affecting production:
1. Use a staging/test database
2. Run the fix script
3. Verify scores are calculated correctly
4. Then run in production
