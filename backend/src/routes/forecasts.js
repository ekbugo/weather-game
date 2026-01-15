const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  canSubmitForecast,
  getCurrentForecastDate,
  getSubmissionWindow,
  getWeekStart,
  nowAST
} = require('../utils/timeUtils');
const { getPrecipRangeDescription } = require('../services/scoringService');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

const router = express.Router();

/**
 * Helper function to find the next scheduled forecast date from config
 * @param {DateTime} currentTime - Current time in AST (Luxon DateTime object)
 * @returns {object|null} - { date, stationId, opensAt } or null if none found
 */
function findNextScheduledForecast(currentTime) {
  const configPath = path.join(__dirname, '../../config/weekly-schedule.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Find all scheduled forecasts whose submission window hasn't closed yet
    const futureDates = configData.schedule
      ?.filter(entry => {
        const forecastDate = DateTime.fromISO(entry.date, { zone: 'America/Puerto_Rico' });
        // Window closes at 5:00 PM AST on the day before the forecast
        const windowCloses = forecastDate.minus({ days: 1 }).set({ hour: 17, minute: 0, second: 0 });

        // Only include forecasts whose window hasn't closed yet
        return currentTime < windowCloses;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!futureDates || futureDates.length === 0) {
      return null;
    }

    const nextEntry = futureDates[0];

    // Calculate when submissions open (midnight on the day before)
    const forecastDate = DateTime.fromISO(nextEntry.date, { zone: 'America/Puerto_Rico' });
    const opensAt = forecastDate.minus({ days: 1 }).startOf('day');

    return {
      date: nextEntry.date,
      stationId: nextEntry.stationId,
      opensAt: opensAt.toISO()
    };
  } catch (err) {
    console.error('Error finding next forecast:', err);
    return null;
  }
}

/**
 * Check if a forecast is scheduled for a specific date
 * @param {string} date - ISO date string
 * @returns {boolean}
 */
function isForecastScheduled(date) {
  const configPath = path.join(__dirname, '../../config/weekly-schedule.json');

  if (!fs.existsSync(configPath)) {
    return false;
  }

  try {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return configData.schedule?.some(entry => entry.date === date) || false;
  } catch (err) {
    console.error('Error checking forecast schedule:', err);
    return false;
  }
}

// Validation for forecast submission
const forecastValidation = [
  body('maxTemp')
    .isInt({ min: 50, max: 120 })
    .withMessage('Max temperature must be between 50°F and 120°F'),
  body('minTemp')
    .isInt({ min: 40, max: 100 })
    .withMessage('Min temperature must be between 40°F and 100°F'),
  body('windGust')
    .isInt({ min: 0, max: 200 })
    .withMessage('Wind gust must be between 0 and 200 mph'),
  body('precipRange')
    .isInt({ min: 1, max: 7 })
    .withMessage('Precipitation range must be between 1 and 7')
];

/**
 * GET /api/forecasts/status
 * Get current submission window status
 */
router.get('/status', (req, res) => {
  const now = nowAST();
  const forecastDate = getCurrentForecastDate();

  console.log('=== GET /api/forecasts/status DEBUG ===');
  console.log(`Current AST time: ${now.toISO()}`);
  console.log(`Current AST hour: ${now.hour}`);
  console.log(`Forecast date: ${forecastDate}`);
  console.log(`Timezone: ${now.zoneName}, Offset: ${now.offset}`);

  // Add precipitation range descriptions for the form
  const precipRanges = [1, 2, 3, 4, 5, 6, 7].map(range => ({
    value: range,
    ...getPrecipRangeDescription(range)
  }));

  // Check if submissions are open based on time
  if (!forecastDate) {
    // After 5pm - window closed for today
    console.log('⏰ After 5pm - window closed');
    const nextForecast = findNextScheduledForecast(now);

    console.log(`Next forecast:`, nextForecast);
    console.log('=== END DEBUG ===\n');

    return res.json({
      isOpen: false,
      reason: 'window_closed',
      message: 'Forecast submissions are closed for today.',
      nextForecast: nextForecast || undefined,
      precipRanges,
      currentTime: now.toISO()
    });
  }

  // Check if a forecast is actually scheduled for this date
  const isScheduled = isForecastScheduled(forecastDate);
  console.log(`Forecast scheduled for ${forecastDate}: ${isScheduled}`);

  if (!isScheduled) {
    // No forecast scheduled for tomorrow
    console.log('❌ No forecast scheduled for tomorrow');
    const nextForecast = findNextScheduledForecast(now);

    console.log(`Next forecast:`, nextForecast);
    console.log('=== END DEBUG ===\n');

    return res.json({
      isOpen: false,
      reason: 'no_forecast_scheduled',
      message: `No forecast scheduled for ${forecastDate}.`,
      nextForecast: nextForecast || undefined,
      precipRanges,
      currentTime: now.toISO()
    });
  }

  // Forecast is scheduled and time window is open
  console.log('✅ Forecast window is open');
  const window = getSubmissionWindow();
  console.log(`Window closes at: ${window.closesAt}`);
  console.log('=== END DEBUG ===\n');

  res.json({
    ...window,
    precipRanges,
    currentTime: now.toISO()
  });
});

/**
 * POST /api/forecasts
 * Submit a forecast
 */
router.post('/', authenticateToken, forecastValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { maxTemp, minTemp, windGust, precipRange } = req.body;
    const prisma = req.prisma;
    const userId = req.user.userId;

    // Validate min < max temp
    if (minTemp >= maxTemp) {
      return res.status(400).json({
        error: 'Minimum temperature must be less than maximum temperature'
      });
    }

    // Check if submissions are open
    const forecastDate = getCurrentForecastDate();
    if (!forecastDate) {
      return res.status(400).json({
        error: 'Submission window is closed',
        window: getSubmissionWindow()
      });
    }

    // Get current station for this date
    // Try to read from config file first
    const configPath = path.join(__dirname, '../../config/weekly-schedule.json');
    let stationId = null;

    if (fs.existsSync(configPath)) {
      try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const scheduleEntry = configData.schedule?.find(
          entry => entry.date === forecastDate
        );

        if (scheduleEntry) {
          stationId = scheduleEntry.stationId;
          console.log(`✅ Using station from config file: ${stationId} for date ${forecastDate}`);
        } else {
          console.log(`⚠️ No config entry found for ${forecastDate}`);
        }
      } catch (err) {
        console.warn('⚠️ Failed to read config file:', err.message);
      }
    } else {
      console.log('⚠️ Config file does not exist');
    }

    // If not found in config, return error (do NOT fall back to database)
    if (!stationId) {
      console.log(`❌ No station scheduled in config for date ${forecastDate}`);
      console.log('⚠️ Database fallback has been disabled - config file is the single source of truth');
      return res.status(400).json({
        error: 'No station scheduled for this date. Please ensure weekly-schedule.json is up to date.',
        forecastDate,
        message: 'The weekly schedule configuration file does not have an entry for this date.'
      });
    }

    // Check for existing forecast (only one per user per day)
    const existingForecast = await prisma.forecast.findUnique({
      where: {
        userId_forecastDate: {
          userId,
          forecastDate: new Date(forecastDate)
        }
      }
    });

    if (existingForecast) {
      return res.status(400).json({
        error: 'You have already submitted a forecast for this date. Only one forecast per day is allowed.',
        existingForecast: {
          id: existingForecast.id,
          submittedAt: existingForecast.submittedAt
        }
      });
    }

    // Create forecast
    const forecast = await prisma.forecast.create({
      data: {
        userId,
        stationId: stationId,
        forecastDate: new Date(forecastDate),
        maxTemp,
        minTemp,
        windGust,
        precipRange
      },
      include: {
        station: true
      }
    });

    res.status(201).json({
      message: 'Forecast submitted successfully',
      forecast: {
        id: forecast.id,
        forecastDate: forecast.forecastDate,
        station: forecast.station.name,
        maxTemp: forecast.maxTemp,
        minTemp: forecast.minTemp,
        windGust: forecast.windGust,
        precipRange: forecast.precipRange,
        precipRangeDesc: getPrecipRangeDescription(forecast.precipRange).label,
        submittedAt: forecast.submittedAt
      }
    });
  } catch (error) {
    console.error('Submit forecast error:', error);
    res.status(500).json({ error: 'Failed to submit forecast' });
  }
});

/**
 * GET /api/forecasts/my-history
 * Get user's forecast history
 */
router.get('/my-history', authenticateToken, async (req, res) => {
  try {
    const prisma = req.prisma;
    const userId = req.user.userId;
    const { limit = 30, offset = 0 } = req.query;

    const forecasts = await prisma.forecast.findMany({
      where: { userId },
      include: {
        station: true,
        score: true
      },
      orderBy: { forecastDate: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.forecast.count({ where: { userId } });

    const formattedForecasts = forecasts.map(f => ({
      id: f.id,
      forecastDate: f.forecastDate,
      station: {
        id: f.station.id,
        name: f.station.name
      },
      prediction: {
        maxTemp: f.maxTemp,
        minTemp: f.minTemp,
        windGust: f.windGust,
        precipRange: f.precipRange,
        precipRangeDesc: getPrecipRangeDescription(f.precipRange).label
      },
      score: f.score ? {
        maxTempScore: f.score.maxTempScore,
        minTempScore: f.score.minTempScore,
        windGustScore: f.score.windGustScore,
        precipScore: f.score.precipScore,
        perfectBonus: f.score.perfectBonus,
        totalScore: f.score.totalScore
      } : null,
      submittedAt: f.submittedAt
    }));

    res.json({
      forecasts: formattedForecasts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + forecasts.length < total
      }
    });
  } catch (error) {
    console.error('Get forecast history error:', error);
    res.status(500).json({ error: 'Failed to get forecast history' });
  }
});

/**
 * GET /api/forecasts/today
 * Get user's forecast for today (if any)
 */
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const prisma = req.prisma;
    const userId = req.user.userId;
    const forecastDate = getCurrentForecastDate();

    if (!forecastDate) {
      return res.json({
        forecast: null,
        window: getSubmissionWindow()
      });
    }

    const forecast = await prisma.forecast.findUnique({
      where: {
        userId_forecastDate: {
          userId,
          forecastDate: new Date(forecastDate)
        }
      },
      include: {
        station: true
      }
    });

    res.json({
      forecast: forecast ? {
        id: forecast.id,
        forecastDate: forecast.forecastDate,
        station: forecast.station.name,
        maxTemp: forecast.maxTemp,
        minTemp: forecast.minTemp,
        windGust: forecast.windGust,
        precipRange: forecast.precipRange,
        precipRangeDesc: getPrecipRangeDescription(forecast.precipRange).label,
        submittedAt: forecast.submittedAt
      } : null,
      window: getSubmissionWindow()
    });
  } catch (error) {
    console.error('Get today forecast error:', error);
    res.status(500).json({ error: 'Failed to get today forecast' });
  }
});

module.exports = router;
