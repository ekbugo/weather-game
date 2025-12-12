const express = require('express');
const { getWeekStart, nowAST, getCurrentForecastDate } = require('../utils/timeUtils');
const fs = require('fs');
const path = require('path');

const router = express.Router();

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
 * Reads from config/weekly-schedule.json first, then falls back to database
 */
router.get('/current', async (req, res) => {
  try {
    const prisma = req.prisma;

    // Get the current forecast date (tomorrow's date if before 5pm)
    const forecastDate = getCurrentForecastDate();

    if (!forecastDate) {
      // After 5pm - submissions are closed
      const now = nowAST();
      const nextForecastDate = now.plus({ days: 2 }).toISODate();

      return res.json({
        station: null,
        forecastDate: nextForecastDate,
        isOpen: false,
        message: 'Submissions are closed. Opens at midnight AST.'
      });
    }

    // Try to read from config file first
    const configPath = path.join(__dirname, '../../config/weekly-schedule.json');
    let stationId = null;
    let source = 'database';

    if (fs.existsSync(configPath)) {
      try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const scheduleEntry = configData.schedule?.find(
          entry => entry.date === forecastDate
        );

        if (scheduleEntry) {
          stationId = scheduleEntry.stationId;
          source = 'config';
          console.log(`📅 Using station from config file: ${stationId} for date ${forecastDate}`);
        }
      } catch (err) {
        console.warn('⚠️ Failed to read config file, falling back to database:', err.message);
      }
    }

    // If not found in config, fall back to database (weekly schedule)
    if (!stationId) {
      const weekStart = getWeekStart(new Date(forecastDate));
      const schedule = await prisma.weeklySchedule.findFirst({
        where: {
          weekStart: weekStart.toJSDate()
        },
        include: {
          station: true
        }
      });

      if (schedule) {
        stationId = schedule.stationId;
        console.log(`📅 Using station from database: ${stationId} for week ${weekStart.toISODate()}`);
      }
    }

    // Get the station details
    if (!stationId) {
      return res.status(404).json({
        error: 'No station scheduled for this date',
        forecastDate
      });
    }

    const station = await prisma.station.findUnique({
      where: { id: stationId }
    });

    if (!station) {
      return res.status(404).json({
        error: 'Station not found',
        stationId
      });
    }

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
