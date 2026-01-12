const express = require('express');
const { getWeekStart, nowAST, getCurrentForecastDate } = require('../utils/timeUtils');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

const router = express.Router();

/**
 * Helper function to find the next scheduled forecast date from config
 * @param {string} afterDate - ISO date string to search after (exclusive)
 * @returns {object|null} - { date, stationId, opensAt } or null if none found
 */
function findNextScheduledForecast(afterDate) {
  const configPath = path.join(__dirname, '../../config/weekly-schedule.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Find all dates after the given date, sorted chronologically
    const futureDates = configData.schedule
      ?.filter(entry => entry.date > afterDate)
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
 * GET /api/stations/debug
 * Debug endpoint to check config file status
 */
router.get('/debug', (req, res) => {
  const configPath = path.join(__dirname, '../../config/weekly-schedule.json');
  const now = nowAST();
  const forecastDate = getCurrentForecastDate();

  const debug = {
    currentTime: now.toISO(),
    currentHour: now.hour,
    forecastDate: forecastDate,
    timezone: now.zoneName,
    offset: now.offset,
    __dirname: __dirname,
    cwd: process.cwd(),
    configPath: configPath,
    configExists: fs.existsSync(configPath),
    configDirExists: fs.existsSync(path.join(__dirname, '../../config')),
    configDirContents: null,
    configFileSize: null,
    configData: null
  };

  try {
    if (fs.existsSync(path.join(__dirname, '../../config'))) {
      debug.configDirContents = fs.readdirSync(path.join(__dirname, '../../config'));
    }
  } catch (err) {
    debug.configDirError = err.message;
  }

  try {
    if (fs.existsSync(configPath)) {
      const stats = fs.statSync(configPath);
      debug.configFileSize = stats.size;
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      debug.configEntriesCount = configData.schedule?.length || 0;
      debug.hasForecastDate = configData.schedule?.some(e => e.date === forecastDate);
      debug.forecastDateEntry = configData.schedule?.find(e => e.date === forecastDate);
    }
  } catch (err) {
    debug.configReadError = err.message;
  }

  res.json(debug);
});

/**
 * GET /api/stations
 * Get all weather stations
 */
router.get('/', async (req, res) => {
  try {
    const prisma = req.prisma;

    const stations = await prisma.station.findMany({
      orderBy: { name: 'asc' }
    });

    res.json({ stations });
  } catch (error) {
    console.error('Get stations error:', error);
    res.status(500).json({ error: 'Failed to get stations' });
  }
});

/**
 * GET /api/stations/current
 * Get the current active station for today's forecast
 * Reads ONLY from config/weekly-schedule.json (database fallback removed)
 */
router.get('/current', async (req, res) => {
  try {
    const prisma = req.prisma;

    // Get the current forecast date (tomorrow's date if before 5pm)
    const now = nowAST();
    const forecastDate = getCurrentForecastDate();

    console.log('=== GET /api/stations/current DEBUG ===');
    console.log(`Current AST time: ${now.toISO()}`);
    console.log(`Current AST hour: ${now.hour}`);
    console.log(`Forecast date: ${forecastDate}`);

    if (!forecastDate) {
      // After 5pm - submissions are closed for today
      console.log('⏰ After 5pm - submissions closed for today');
      console.log('🔍 Looking for next scheduled forecast...');

      // Find the next scheduled forecast after today
      const today = now.toISODate();
      const nextForecast = findNextScheduledForecast(today);

      if (nextForecast) {
        console.log(`📅 Next forecast: ${nextForecast.date}, opens at ${nextForecast.opensAt}`);

        return res.json({
          station: null,
          forecastDate: null,
          isOpen: false,
          reason: 'window_closed',
          message: 'Forecast submissions are closed for today.',
          nextForecast: {
            date: nextForecast.date,
            opensAt: nextForecast.opensAt,
            stationId: nextForecast.stationId
          }
        });
      } else {
        console.log(`❌ No future forecasts found`);
        return res.json({
          station: null,
          forecastDate: null,
          isOpen: false,
          reason: 'no_forecasts_available',
          message: 'No upcoming forecasts scheduled.'
        });
      }
    }

    // Try to read from config file first
    const configPath = path.join(__dirname, '../../config/weekly-schedule.json');
    let stationId = null;
    let source = 'database';

    console.log(`Config path: ${configPath}`);
    console.log(`Config exists: ${fs.existsSync(configPath)}`);

    if (fs.existsSync(configPath)) {
      try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        console.log(`Config entries count: ${configData.schedule?.length || 0}`);

        const scheduleEntry = configData.schedule?.find(
          entry => entry.date === forecastDate
        );

        console.log(`Schedule entry for ${forecastDate}:`, scheduleEntry || 'NOT FOUND');

        if (scheduleEntry) {
          stationId = scheduleEntry.stationId;
          source = 'config';
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

    // If not found in config, find the next scheduled forecast
    if (!stationId) {
      console.log(`❌ No station scheduled in config for date ${forecastDate}`);
      console.log('🔍 Looking for next scheduled forecast...');

      const nextForecast = findNextScheduledForecast(forecastDate);

      if (nextForecast) {
        console.log(`📅 Next forecast: ${nextForecast.date}, opens at ${nextForecast.opensAt}`);

        return res.json({
          station: null,
          forecastDate: null,
          isOpen: false,
          reason: 'no_forecast_scheduled',
          message: `No forecast scheduled for ${forecastDate}. Next forecast is for ${nextForecast.date}.`,
          nextForecast: {
            date: nextForecast.date,
            opensAt: nextForecast.opensAt,
            stationId: nextForecast.stationId
          }
        });
      } else {
        console.log(`❌ No future forecasts found in config`);
        return res.status(404).json({
          error: 'No forecasts scheduled',
          message: 'There are no upcoming forecasts scheduled. Please check back later.',
          reason: 'no_forecasts_available'
        });
      }
    }

    console.log(`🔍 Looking up station details for: ${stationId}`);

    const station = await prisma.station.findUnique({
      where: { id: stationId }
    });

    if (!station) {
      console.log(`❌ Station ${stationId} not found in database`);
      return res.status(404).json({
        error: 'Station not found',
        stationId
      });
    }

    console.log(`✅ Returning station: ${station.name} (${station.id})`);
    console.log(`Source: ${source}`);
    console.log('=== END DEBUG ===\n');

    res.json({
      station,
      forecastDate,
      source // 'config' or 'database'
    });
  } catch (error) {
    console.error('Get current station error:', error);
    res.status(500).json({ error: 'Failed to get current station' });
  }
});

/**
 * GET /api/stations/:id
 * Get a specific station by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { id } = req.params;

    const station = await prisma.station.findUnique({
      where: { id }
    });

    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    res.json({ station });
  } catch (error) {
    console.error('Get station error:', error);
    res.status(500).json({ error: 'Failed to get station' });
  }
});

/**
 * GET /api/stations/schedule/upcoming
 * Get upcoming weekly schedules
 */
router.get('/schedule/upcoming', async (req, res) => {
  try {
    const prisma = req.prisma;
    const now = nowAST();

    const schedules = await prisma.weeklySchedule.findMany({
      where: {
        weekStart: {
          gte: now.minus({ weeks: 1 }).startOf('week').toJSDate()
        }
      },
      include: {
        station: true
      },
      orderBy: {
        weekStart: 'asc'
      },
      take: 4
    });

    res.json({ schedules });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Failed to get schedule' });
  }
});

module.exports = router;
