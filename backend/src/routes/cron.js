const express = require('express');
const { calculateScores, importReadings } = require('../services/cronService');

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
