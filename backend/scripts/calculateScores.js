/**
 * Calculate Scores Script
 *
 * Compares forecasts against actual station readings and calculates scores.
 * Should be run daily after weather readings have been imported.
 *
 * Usage: npm run calculate-scores
 * Or: node scripts/calculateScores.js [optional: YYYY-MM-DD date]
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { calculateTotalScore } = require('../src/services/scoringService');
const { DateTime } = require('luxon');

const prisma = new PrismaClient();
const AST_ZONE = 'America/Puerto_Rico';

/**
 * Calculate scores for a specific date
 */
async function calculateScoresForDate(dateStr) {
  const date = new Date(dateStr);
  console.log(`\n📅 Calculating scores for: ${dateStr}\n`);

  // Get all readings for this date
  const readings = await prisma.stationReading.findMany({
    where: {
      readingDate: date
    }
  });

  if (readings.length === 0) {
    console.log(`⚠️  No station readings found for ${dateStr}`);
    return { calculated: 0, skipped: 0, errors: 0 };
  }

  console.log(`Found ${readings.length} station reading(s)`);

  const results = { calculated: 0, skipped: 0, errors: 0 };

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

    console.log(`\n🌤️  Station ${reading.stationId}: ${forecasts.length} forecast(s)`);

    for (const forecast of forecasts) {
      // Skip if score already calculated
      if (forecast.score) {
        console.log(`   ⏭️  ${forecast.user.username} - already scored`);
        results.skipped++;
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

        const bonusStr = scoreResult.isPerfect ? ' 🌟 PERFECT!' : '';
        console.log(`   ✅ ${forecast.user.username} - ${scoreResult.totalScore} points${bonusStr}`);
        results.calculated++;

      } catch (err) {
        console.log(`   ❌ ${forecast.user.username} - Error: ${err.message}`);
        results.errors++;
      }
    }
  }

  return results;
}

/**
 * Calculate scores for all pending dates
 * (dates with readings but no calculated scores)
 */
async function calculateAllPending() {
  console.log('\n🔍 Finding dates with pending score calculations...\n');

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
    return;
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
    return;
  }

  console.log(`Found ${pendingDates.size} date(s) with pending scores\n`);

  const totalResults = { calculated: 0, skipped: 0, errors: 0 };

  for (const dateStr of Array.from(pendingDates).sort()) {
    const results = await calculateScoresForDate(dateStr);
    totalResults.calculated += results.calculated;
    totalResults.skipped += results.skipped;
    totalResults.errors += results.errors;
  }

  console.log('\n📊 Total Summary:');
  console.log(`   ✅ Calculated: ${totalResults.calculated}`);
  console.log(`   ⏭️  Skipped:    ${totalResults.skipped}`);
  console.log(`   ❌ Errors:     ${totalResults.errors}`);
}

/**
 * Get yesterday's date in AST
 */
function getYesterdayAST() {
  return DateTime.now()
    .setZone(AST_ZONE)
    .minus({ days: 1 })
    .toISODate();
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.length > 0) {
      // Calculate for specific date
      const dateStr = args[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        console.log('❌ Invalid date format. Use YYYY-MM-DD');
        process.exit(1);
      }
      await calculateScoresForDate(dateStr);
    } else {
      // Calculate all pending
      await calculateAllPending();
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
