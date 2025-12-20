/**
 * Fix Precipitation Scores Script
 *
 * This script fixes the precipitation scoring bug by:
 * 1. Deleting all existing station readings (which have incorrect precipRange)
 * 2. Deleting all existing scores
 * 3. Resetting all user totalPoints to zero
 * 4. Re-importing all weather readings with correct precipRange
 * 5. Recalculating all scores
 *
 * Usage: npm run fix-precipitation-scores
 * Or: node scripts/fixPrecipitationScores.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { getPrecipRange } = require('../src/services/scoringService');
const { calculateTotalScore } = require('../src/services/scoringService');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

/**
 * Step 1: Delete all existing station readings
 */
async function deleteAllReadings() {
  console.log('\n🗑️  Step 1: Deleting all existing station readings...');

  const count = await prisma.stationReading.count();
  console.log(`   Found ${count} existing reading(s)`);

  const result = await prisma.stationReading.deleteMany({});
  console.log(`   ✅ Deleted ${result.count} reading(s)`);

  return result.count;
}

/**
 * Step 2: Delete all existing scores
 */
async function deleteAllScores() {
  console.log('\n🗑️  Step 2: Deleting all existing scores...');

  const count = await prisma.score.count();
  console.log(`   Found ${count} existing score(s)`);

  const result = await prisma.score.deleteMany({});
  console.log(`   ✅ Deleted ${result.count} score(s)`);

  return result.count;
}

/**
 * Step 3: Reset all user totalPoints to zero
 */
async function resetUserPoints() {
  console.log('\n🔄 Step 3: Resetting all user totalPoints to zero...');

  const users = await prisma.user.findMany({
    where: {
      totalPoints: {
        not: 0
      }
    }
  });

  console.log(`   Found ${users.length} user(s) with non-zero points`);

  const result = await prisma.user.updateMany({
    data: {
      totalPoints: 0
    }
  });

  console.log(`   ✅ Reset ${result.count} user(s) to zero points`);

  return result.count;
}

/**
 * Step 4: Re-import all weather readings with correct precipRange
 */
async function reimportAllReadings() {
  console.log('\n📥 Step 4: Re-importing all weather readings with correct precipRange...');

  if (!fs.existsSync(DATA_DIR)) {
    console.log(`   ❌ Data directory not found: ${DATA_DIR}`);
    return { imported: 0, skipped: 0, errors: 0 };
  }

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  console.log(`   Found ${files.length} JSON file(s) in ${DATA_DIR}\n`);

  const results = { imported: 0, skipped: 0, errors: 0 };

  for (const file of files) {
    try {
      // Parse filename: STATIONID_YYYY-MM-DD.json
      const match = file.match(/^([A-Z0-9]+)_(\d{4}-\d{2}-\d{2})\.json$/);
      if (!match) {
        console.log(`   ⏭️  Skipping ${file} - invalid filename format`);
        results.skipped++;
        continue;
      }

      const [, stationId, dateStr] = match;
      const readingDate = new Date(dateStr);

      // Check if station exists
      const station = await prisma.station.findUnique({
        where: { id: stationId }
      });

      if (!station) {
        console.log(`   ⚠️  Skipping ${file} - station ${stationId} not found`);
        results.skipped++;
        continue;
      }

      // Read and parse JSON file
      const filePath = path.join(DATA_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Calculate precipitation range using the CORRECT function
      const precipTotal = Number(data.SumPrec) || 0;
      const precipRange = getPrecipRange(precipTotal);

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

      console.log(`   ✅ ${file} - imported with precipRange ${precipRange}`);
      results.imported++;

    } catch (err) {
      console.log(`   ❌ ${file} - Error: ${err.message}`);
      results.errors++;
    }
  }

  console.log('\n   📊 Import Summary:');
  console.log(`      ✅ Imported: ${results.imported}`);
  console.log(`      ⏭️  Skipped:  ${results.skipped}`);
  console.log(`      ❌ Errors:   ${results.errors}`);

  return results;
}

/**
 * Step 5: Recalculate all scores
 */
async function recalculateAllScores() {
  console.log('\n🔢 Step 5: Recalculating all scores...');

  // Get all readings
  const readings = await prisma.stationReading.findMany({
    orderBy: { readingDate: 'asc' }
  });

  console.log(`   Found ${readings.length} reading(s)\n`);

  const results = { calculated: 0, skipped: 0, errors: 0 };

  for (const reading of readings) {
    const dateStr = reading.readingDate.toISOString().split('T')[0];

    // Get all forecasts for this station and date
    const forecasts = await prisma.forecast.findMany({
      where: {
        stationId: reading.stationId,
        forecastDate: reading.readingDate
      },
      include: {
        user: {
          select: { id: true, username: true }
        }
      }
    });

    if (forecasts.length === 0) {
      continue;
    }

    console.log(`   📅 ${dateStr} (${reading.stationId}): ${forecasts.length} forecast(s)`);

    for (const forecast of forecasts) {
      try {
        // Calculate the score
        const scoreResult = calculateTotalScore(forecast, reading);

        // Create score record
        await prisma.score.create({
          data: {
            userId: forecast.userId,
            forecastId: forecast.id,
            readingId: reading.id,
            scoreDate: reading.readingDate,
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
        console.log(`      ✅ ${forecast.user.username}: ${scoreResult.totalScore} points (precip: ${scoreResult.precipScore}/5)${bonusStr}`);
        results.calculated++;

      } catch (err) {
        console.log(`      ❌ ${forecast.user.username}: ${err.message}`);
        results.errors++;
      }
    }
  }

  console.log('\n   📊 Scoring Summary:');
  console.log(`      ✅ Calculated: ${results.calculated}`);
  console.log(`      ❌ Errors:     ${results.errors}`);

  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('========================================');
  console.log('  FIX PRECIPITATION SCORING BUG');
  console.log('========================================');
  console.log('\nThis script will:');
  console.log('  1. Delete all existing station readings');
  console.log('  2. Delete all existing scores');
  console.log('  3. Reset all user totalPoints to zero');
  console.log('  4. Re-import all weather readings with correct precipRange');
  console.log('  5. Recalculate all scores');
  console.log('\n⚠️  WARNING: This operation cannot be undone!');
  console.log('\nStarting in 3 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const step1 = await deleteAllReadings();
    const step2 = await deleteAllScores();
    const step3 = await resetUserPoints();
    const step4 = await reimportAllReadings();
    const step5 = await recalculateAllScores();

    console.log('\n========================================');
    console.log('  ✅ COMPLETE!');
    console.log('========================================');
    console.log('\nSummary:');
    console.log(`  Deleted readings: ${step1}`);
    console.log(`  Deleted scores: ${step2}`);
    console.log(`  Reset users: ${step3}`);
    console.log(`  Re-imported readings: ${step4.imported}`);
    console.log(`  Recalculated scores: ${step5.calculated}`);
    console.log('');

  } catch (err) {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
