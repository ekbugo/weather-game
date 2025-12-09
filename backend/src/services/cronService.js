const { PrismaClient } = require('@prisma/client');
const { calculateTotalScore } = require('./scoringService');

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

module.exports = {
  calculateScores
};
