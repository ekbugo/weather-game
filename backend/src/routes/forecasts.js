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

const router = express.Router();

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
  const window = getSubmissionWindow();

  // Add precipitation range descriptions for the form
  const precipRanges = [1, 2, 3, 4, 5, 6, 7].map(range => ({
    value: range,
    ...getPrecipRangeDescription(range)
  }));

  const response = {
    ...window,
    precipRanges,
    currentTime: nowAST().toISO()
  };

  console.log('[Forecasts API] /status response:', JSON.stringify(response, null, 2));

  res.json(response);
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

    // Get current station for the week
    const weekStart = getWeekStart(forecastDate);
    const schedule = await prisma.weeklySchedule.findFirst({
      where: {
        weekStart: weekStart.toJSDate()
      }
    });

    if (!schedule) {
      return res.status(400).json({
        error: 'No station scheduled for this week'
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
        stationId: schedule.stationId,
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
