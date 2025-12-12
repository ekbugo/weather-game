const express = require('express');
const { calculateScores, importReadings, recalculateScoresForDate } = require('../services/cronService');

const router = express.Router();

/**
 * Middleware to validate cron secret
 */
function validateCronSecret(req, res, next) {
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;

  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

/**
 * POST/GET /api/cron/calculate-scores
 * Trigger score calculation (protected endpoint)
 */
router.all('/calculate-scores', validateCronSecret, async (req, res) => {
  try {
    console.log('🔄 Score calculation triggered via API');

    const results = await calculateScores();

    res.json({
      success: true,
      message: 'Score calculation completed',
      results
    });
  } catch (error) {
    console.error('Score calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Score calculation failed',
      message: error.message
    });
  }
});

/**
 * POST/GET /api/cron/import-readings
 * Trigger weather data import (protected endpoint)
 */
router.all('/import-readings', validateCronSecret, async (req, res) => {
  try {
    console.log('📥 Weather data import triggered via API');

    const results = await importReadings();

    res.json({
      success: true,
      message: 'Weather data import completed',
      results
    });
  } catch (error) {
    console.error('Import readings error:', error);
    res.status(500).json({
      success: false,
      error: 'Import failed',
      message: error.message
    });
  }
});

/**
 * POST/GET /api/cron/recalculate-date/:date
 * Recalculate scores for a specific date (deletes and recreates)
 */
router.all('/recalculate-date/:date', validateCronSecret, async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    console.log(`🔄 Recalculating scores for ${date} via API`);

    const results = await recalculateScoresForDate(date);

    res.json({
      success: true,
      message: `Scores recalculated for ${date}`,
      results
    });
  } catch (error) {
    console.error('Recalculate scores error:', error);
    res.status(500).json({
      success: false,
      error: 'Recalculation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/cron/debug-dates
 * Check forecast and reading dates (for debugging)
 */
router.get('/debug-dates', validateCronSecret, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const forecasts = await prisma.forecast.findMany({
      select: {
        id: true,
        forecastDate: true,
        stationId: true,
        user: { select: { username: true } }
      },
      orderBy: { forecastDate: 'desc' }
    });

    const readings = await prisma.stationReading.findMany({
      select: {
        id: true,
        readingDate: true,
        stationId: true
      },
      orderBy: { readingDate: 'desc' }
    });

    res.json({
      forecasts: forecasts.map(f => ({
        date: f.forecastDate.toISOString().split('T')[0],
        station: f.stationId,
        user: f.user.username
      })),
      readings: readings.map(r => ({
        date: r.readingDate.toISOString().split('T')[0],
        station: r.stationId
      })),
      summary: {
        totalForecasts: forecasts.length,
        totalReadings: readings.length,
        forecastDates: [...new Set(forecasts.map(f => f.forecastDate.toISOString().split('T')[0]))],
        readingDates: [...new Set(readings.map(r => r.readingDate.toISOString().split('T')[0]))]
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cron/debug-reading/:stationId/:date
 * Check a specific reading's data
 */
router.get('/debug-reading/:stationId/:date', validateCronSecret, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const { stationId, date } = req.params;
    const readingDate = new Date(date);

    const reading = await prisma.stationReading.findUnique({
      where: {
        stationId_readingDate: {
          stationId,
          readingDate
        }
      }
    });

    if (!reading) {
      return res.json({ error: 'Reading not found', stationId, date });
    }

    res.json({
      reading: {
        stationId: reading.stationId,
        date: reading.readingDate.toISOString().split('T')[0],
        maxTempRaw: Number(reading.maxTempRaw),
        maxTempRounded: reading.maxTempRounded,
        minTempRaw: Number(reading.minTempRaw),
        minTempRounded: reading.minTempRounded,
        windGustMax: Number(reading.windGustMax),
        precipTotal: Number(reading.precipTotal),
        precipRange: reading.precipRange
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cron/debug-scores/:username
 * Check all scores for a specific user
 */
router.get('/debug-scores/:username', validateCronSecret, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, totalPoints: true }
    });

    if (!user) {
      return res.json({ error: 'User not found', username });
    }

    const scores = await prisma.score.findMany({
      where: { userId: user.id },
      include: {
        forecast: {
          select: {
            forecastDate: true,
            stationId: true,
            maxTemp: true,
            minTemp: true,
            windGust: true,
            precipRange: true
          }
        },
        reading: {
          select: {
            readingDate: true,
            maxTempRounded: true,
            minTempRounded: true,
            windGustMax: true,
            precipRange: true
          }
        }
      },
      orderBy: { scoreDate: 'desc' }
    });

    res.json({
      username,
      totalPoints: user.totalPoints,
      scoresCount: scores.length,
      scores: scores.map(s => ({
        scoreId: s.id,
        scoreDate: s.scoreDate.toISOString().split('T')[0],
        forecastDate: s.forecast.forecastDate.toISOString().split('T')[0],
        readingDate: s.reading.readingDate.toISOString().split('T')[0],
        station: s.forecast.stationId,
        forecast: {
          maxTemp: s.forecast.maxTemp,
          minTemp: s.forecast.minTemp,
          windGust: s.forecast.windGust,
          precipRange: s.forecast.precipRange
        },
        actual: {
          maxTemp: s.reading.maxTempRounded,
          minTemp: s.reading.minTempRounded,
          windGust: Math.round(Number(s.reading.windGustMax)),
          precipRange: s.reading.precipRange
        },
        points: {
          maxTemp: s.maxTempScore,
          minTemp: s.minTempScore,
          windGust: s.windGustScore,
          precip: s.precipScore,
          bonus: s.perfectBonus,
          total: s.totalScore
        }
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST/GET /api/cron/reimport-reading/:stationId/:date
 * Delete and re-import a specific reading from JSON file
 */
router.all('/reimport-reading/:stationId/:date', validateCronSecret, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const fs = require('fs');
    const path = require('path');

    const { stationId, date } = req.params;
    const readingDate = new Date(date);

    console.log(`🔄 Re-importing reading for ${stationId} on ${date}`);

    // First, find the reading to get its ID
    const existingReading = await prisma.stationReading.findUnique({
      where: {
        stationId_readingDate: {
          stationId,
          readingDate
        }
      }
    });

    if (!existingReading) {
      return res.status(404).json({
        error: 'Reading not found in database',
        stationId,
        date
      });
    }

    // Delete related scores first (to avoid foreign key constraint)
    const deletedScores = await prisma.score.deleteMany({
      where: { readingId: existingReading.id }
    });

    console.log(`🗑️  Deleted ${deletedScores.count} related score(s)`);

    // Now delete the reading
    const deletedReading = await prisma.stationReading.delete({
      where: {
        stationId_readingDate: {
          stationId,
          readingDate
        }
      }
    });

    console.log(`🗑️  Deleted reading`);

    // Re-import from JSON file
    const dataDir = path.join(__dirname, '../../data');
    const fileName = `${stationId}_${date}.json`;
    const filePath = path.join(dataDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'JSON file not found',
        expectedFile: fileName,
        path: filePath
      });
    }

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

    // Create new reading
    const reading = await prisma.stationReading.create({
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

    console.log(`✅ Re-imported reading successfully`);

    res.json({
      success: true,
      message: `Reading re-imported for ${stationId} on ${date}`,
      deletedScores: deletedScores.count,
      reading: {
        stationId: reading.stationId,
        date: reading.readingDate.toISOString().split('T')[0],
        maxTempRaw: Number(reading.maxTempRaw),
        maxTempRounded: reading.maxTempRounded,
        minTempRaw: Number(reading.minTempRaw),
        minTempRounded: reading.minTempRounded,
        windGustMax: Number(reading.windGustMax),
        precipTotal: Number(reading.precipTotal),
        precipRange: reading.precipRange
      }
    });

  } catch (error) {
    console.error('Reimport reading error:', error);
    res.status(500).json({
      success: false,
      error: 'Reimport failed',
      message: error.message
    });
  }
});

/**
 * POST/GET /api/cron/recalculate-user-total/:username
 * Recalculate a user's total points from their scores
 */
router.all('/recalculate-user-total/:username', validateCronSecret, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const { username } = req.params;

    console.log(`🔄 Recalculating total points for ${username}`);

    // Find the user
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found', username });
    }

    // Sum all scores for this user
    const scores = await prisma.score.findMany({
      where: { userId: user.id },
      select: { totalScore: true }
    });

    const totalPoints = scores.reduce((sum, score) => sum + score.totalScore, 0);
    const oldTotal = user.totalPoints;

    // Update user's total points
    await prisma.user.update({
      where: { id: user.id },
      data: { totalPoints }
    });

    console.log(`✅ Updated ${username}: ${oldTotal} → ${totalPoints} points`);

    res.json({
      success: true,
      message: `Total points recalculated for ${username}`,
      username,
      oldTotal,
      newTotal: totalPoints,
      scoresCount: scores.length
    });

  } catch (error) {
    console.error('Recalculate user total error:', error);
    res.status(500).json({
      success: false,
      error: 'Recalculation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/cron/health
 * Check cron service health
 */
router.get('/health', validateCronSecret, (req, res) => {
  res.json({
    status: 'ok',
    service: 'cron',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
