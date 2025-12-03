const express = require('express');
const { getWeekStart, nowAST } = require('../utils/timeUtils');

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
 * Get the current active station for this week
 */
router.get('/current', async (req, res) => {
  try {
    const prisma = req.prisma;

    // Get the Monday of the current week
    const weekStart = getWeekStart(new Date());

    const schedule = await prisma.weeklySchedule.findFirst({
      where: {
        weekStart: weekStart.toJSDate()
      },
      include: {
        station: true
      }
    });

    if (!schedule) {
      return res.status(404).json({
        error: 'No station scheduled for this week',
        weekStart: weekStart.toISODate()
      });
    }

    res.json({
      station: schedule.station,
      weekStart: weekStart.toISODate(),
      announcedAt: schedule.announcedAt
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
