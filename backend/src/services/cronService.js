const { PrismaClient } = require('@prisma/client');
const { calculateTotalScore } = require('./scoringService');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Calculate scores for all pending forecasts
 * (forecasts with readings but no scores)
 */
async function calculateScores() {
  console.log('\n🔍 Finding forecasts with pending score calculations...\n');

  // Get all dates that have readings
  const readingDates = await prisma.stationReading.findMany({
    select: {
      readingDate: true,
      stationId: true
    },
    distinct: ['readingDate', 'stationId'],
    orderBy: { readingDate: 'asc' }
  });

  if (readingDates.length === 0) {
    console.log('No station readings found in database.');
    return { calculated: 0, skipped: 0, errors: 0 };
  }

  // Find dates that have unscored forecasts
  const pendingDates = new Set();

  for (const { readingDate, stationId } of readingDates) {
    const unscoredCount = await prisma.forecast.count({
      where: {
        stationId,
        forecastDate: readingDate,
        score: null
      }
    });

    if (unscoredCount > 0) {
      pendingDates.add(readingDate.toISOString().split('T')[0]);
    }
  }

  if (pendingDates.size === 0) {
    console.log('✅ All forecasts have been scored!');
    return { calculated: 0, skipped: 0, errors: 0 };
  }

  console.log(`Found ${pendingDates.size} date(s) with pending scores\n`);

  const totalResults = { calculated: 0, skipped: 0, errors: 0 };

  for (const dateStr of Array.from(pendingDates).sort()) {
    const date = new Date(dateStr);
    console.log(`📅 Calculating scores for: ${dateStr}`);

    // Get all readings for this date
    const readings = await prisma.stationReading.findMany({
      where: { readingDate: date }
    });

    for (const reading of readings) {
      // Get all forecasts for this station and date
      const forecasts = await prisma.forecast.findMany({
        where: {
          stationId: reading.stationId,
          forecastDate: date
        },
        include: {
          user: {
            select: { id: true, username: true }
          },
          score: true
        }
      });

      console.log(`  Station ${reading.stationId}: ${forecasts.length} forecast(s)`);

      for (const forecast of forecasts) {
        // Skip if already scored
        if (forecast.score) {
          totalResults.skipped++;
          continue;
        }

        try {
          // Calculate the score
          const scoreResult = calculateTotalScore(forecast, reading);

          // Create score record
          await prisma.score.create({
            data: {
              userId: forecast.userId,
              forecastId: forecast.id,
              readingId: reading.id,
              scoreDate: date,
              maxTempScore: scoreResult.maxTempScore,
              minTempScore: scoreResult.minTempScore,
              windGustScore: scoreResult.windGustScore,
              precipScore: scoreResult.precipScore,
              perfectBonus: scoreResult.perfectBonus,
              totalScore: scoreResult.totalScore
            }
          });

          // Update user's total points
          await prisma.user.update({
            where: { id: forecast.userId },
            data: {
              totalPoints: {
                increment: scoreResult.totalScore
              }
            }
          });

          const bonusStr = scoreResult.isPerfect ? ' 🌟' : '';
          console.log(`    ✅ ${forecast.user.username}: ${scoreResult.totalScore} points${bonusStr}`);
          totalResults.calculated++;

        } catch (err) {
          console.log(`    ❌ ${forecast.user.username}: ${err.message}`);
          totalResults.errors++;
        }
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Calculated: ${totalResults.calculated}`);
  console.log(`  ⏭️  Skipped: ${totalResults.skipped}`);
  console.log(`  ❌ Errors: ${totalResults.errors}`);

  return totalResults;
}

/**
 * Import weather readings from JSON files
 */
async function importReadings() {
  console.log('\n📥 Importing weather readings from JSON files...\n');

  const dataDir = path.join(__dirname, '../../data');

  if (!fs.existsSync(dataDir)) {
    console.log('❌ Data directory not found:', dataDir);
    return { imported: 0, skipped: 0, errors: 0 };
  }

  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('⚠️  No JSON files found in data directory');
    return { imported: 0, skipped: 0, errors: 0 };
  }

  console.log(`Found ${files.length} JSON file(s)\n`);

  const results = { imported: 0, skipped: 0, errors: 0 };

  for (const file of files) {
    try {
      // Parse filename: STATIONID_YYYY-MM-DD.json
      const match = file.match(/^([A-Z0-9]+)_(\d{4}-\d{2}-\d{2})\.json$/);
      if (!match) {
        console.log(`  ⏭️  Skipping ${file} - invalid filename format`);
        results.skipped++;
        continue;
      }

      const [, stationId, dateStr] = match;
      const readingDate = new Date(dateStr);

      // Check if reading already exists
      const existing = await prisma.stationReading.findUnique({
        where: {
          stationId_readingDate: {
            stationId,
            readingDate
          }
        }
      });

      if (existing) {
        console.log(`  ⏭️  ${file} - already imported`);
        results.skipped++;
        continue;
      }

      // Read and parse JSON file
      const filePath = path.join(dataDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Calculate precipitation range (1-7)
      const precipTotal = Number(data.SumPrec) || 0;
      let precipRange;
      if (precipTotal === 0) precipRange = 1;
      else if (precipTotal < 0.10) precipRange = 2;
      else if (precipTotal < 0.25) precipRange = 3;
      else if (precipTotal < 0.50) precipRange = 4;
      else if (precipTotal < 1.00) precipRange = 5;
      else if (precipTotal < 2.00) precipRange = 6;
      else precipRange = 7;

      // Create station reading
      await prisma.stationReading.create({
        data: {
          stationId,
          readingDate,
          maxTempRaw: Number(data.MaxTemp),
          maxTempRounded: Math.round(Number(data.MaxTemp)),
          minTempRaw: Number(data.MinTemp),
          minTempRounded: Math.round(Number(data.MinTemp)),
          windGustMax: Number(data.MaxGust),
          precipTotal,
          precipRange
        }
      });

      console.log(`  ✅ ${file} - imported successfully`);
      results.imported++;

    } catch (err) {
      console.log(`  ❌ ${file} - Error: ${err.message}`);
      results.errors++;
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`  ✅ Imported: ${results.imported}`);
  console.log(`  ⏭️  Skipped: ${results.skipped}`);
  console.log(`  ❌ Errors: ${results.errors}`);

  return results;
}

module.exports = {
  calculateScores,
  importReadings
};
