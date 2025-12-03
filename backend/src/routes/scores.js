const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getPrecipRangeDescription } = require('../services/scoringService');

const router = express.Router();

/**
 * GET /api/scores/my-scores
 * Get user's score history with detailed breakdowns
 */
router.get('/my-scores', authenticateToken, async (req, res) => {
  try {
    const prisma = req.prisma;
    const userId = req.user.userId;
    const { limit = 30, offset = 0 } = req.query;

    const scores = await prisma.score.findMany({
      where: { userId },
      include: {
        forecast: {
          include: {
            station: true
          }
        },
        reading: true
      },
      orderBy: { scoreDate: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.score.count({ where: { userId } });

    const formattedScores = scores.map(s => ({
      id: s.id,
      date: s.scoreDate,
      station: {
        id: s.forecast.station.id,
        name: s.forecast.station.name
      },
      forecast: {
        maxTemp: s.forecast.maxTemp,
        minTemp: s.forecast.minTemp,
        windGust: s.forecast.windGust,
        precipRange: s.forecast.precipRange,
        precipRangeDesc: getPrecipRangeDescription(s.forecast.precipRange).label
      },
      actual: {
        maxTemp: s.reading.maxTempRounded,
        minTemp: s.reading.minTempRounded,
        windGust: Math.round(Number(s.reading.windGustMax)),
        precipTotal: Number(s.reading.precipTotal),
        precipRange: s.reading.precipRange,
        precipRangeDesc: getPrecipRangeDescription(s.reading.precipRange).label
      },
      scores: {
        maxTemp: {
          score: s.maxTempScore,
          diff: Math.abs(s.forecast.maxTemp - s.reading.maxTempRounded)
        },
        minTemp: {
          score: s.minTempScore,
          diff: Math.abs(s.forecast.minTemp - s.reading.minTempRounded)
        },
        windGust: {
          score: s.windGustScore,
          diff: Math.abs(s.forecast.windGust - Math.round(Number(s.reading.windGustMax)))
        },
        precip: {
          score: s.precipScore,
          rangeDiff: Math.abs(s.forecast.precipRange - s.reading.precipRange)
        },
        perfectBonus: s.perfectBonus,
        total: s.totalScore
      }
    }));

    // Calculate summary stats
    const userStats = await prisma.score.aggregate({
      where: { userId },
      _sum: { totalScore: true },
      _avg: { totalScore: true },
      _count: true
    });

    const perfectCount = await prisma.score.count({
      where: { userId, perfectBonus: 5 }
    });

    res.json({
      scores: formattedScores,
      summary: {
        totalScores: userStats._count,
        totalPoints: userStats._sum.totalScore || 0,
        averageScore: Math.round((userStats._avg.totalScore || 0) * 10) / 10,
        perfectForecasts: perfectCount
      },
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + scores.length < total
      }
    });
  } catch (error) {
    console.error('Get scores error:', error);
    res.status(500).json({ error: 'Failed to get scores' });
  }
});

/**
 * GET /api/scores/date/:date
 * Get all scores for a specific date (public)
 */
router.get('/date/:date', async (req, res) => {
  try {
    const prisma = req.prisma;
    const { date } = req.params;

    // Validate date format
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Get reading for this date
    const reading = await prisma.stationReading.findFirst({
      where: {
        readingDate: dateObj
      },
      include: {
        station: true
      }
    });

    if (!reading) {
      return res.status(404).json({ error: 'No readings found for this date' });
    }

    // Get all scores for this date
    const scores = await prisma.score.findMany({
      where: {
        scoreDate: dateObj
      },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        },
        forecast: true
      },
      orderBy: {
        totalScore: 'desc'
      }
    });

    res.json({
      date,
      station: {
        id: reading.station.id,
        name: reading.station.name
      },
      actualConditions: {
        maxTemp: reading.maxTempRounded,
        maxTempRaw: Number(reading.maxTempRaw),
        minTemp: reading.minTempRounded,
        minTempRaw: Number(reading.minTempRaw),
        windGust: Math.round(Number(reading.windGustMax)),
        windGustRaw: Number(reading.windGustMax),
        precipTotal: Number(reading.precipTotal),
        precipRange: reading.precipRange,
        precipRangeDesc: getPrecipRangeDescription(reading.precipRange).label
      },
      results: scores.map((s, index) => ({
        rank: index + 1,
        user: s.user.username,
        forecast: {
          maxTemp: s.forecast.maxTemp,
          minTemp: s.forecast.minTemp,
          windGust: s.forecast.windGust,
          precipRange: s.forecast.precipRange
        },
        scores: {
          maxTemp: s.maxTempScore,
          minTemp: s.minTempScore,
          windGust: s.windGustScore,
          precip: s.precipScore,
          perfectBonus: s.perfectBonus,
          total: s.totalScore
        }
      })),
      totalParticipants: scores.length
    });
  } catch (error) {
    console.error('Get date scores error:', error);
    res.status(500).json({ error: 'Failed to get scores for date' });
  }
});

module.exports = router;
