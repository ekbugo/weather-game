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
