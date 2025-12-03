const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { getWeekStart, nowAST } = require('../utils/timeUtils');
const { DateTime } = require('luxon');

const router = express.Router();

/**
 * GET /api/leaderboard
 * Get leaderboard rankings
 * Query params:
 *   - type: 'all-time' | 'weekly' | 'monthly' (default: 'all-time')
 *   - limit: number (default: 50)
 *   - offset: number (default: 0)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const prisma = req.prisma;
    const { type = 'all-time', limit = 50, offset = 0 } = req.query;
    const userId = req.user?.userId;

    let rankings;
    let userRank = null;

    if (type === 'all-time') {
      // All-time leaderboard from denormalized totalPoints
      rankings = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          totalPoints: true
        },
        orderBy: { totalPoints: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      });

      // Get user's rank if authenticated
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { totalPoints: true }
        });

        if (user) {
          const higherRanked = await prisma.user.count({
            where: { totalPoints: { gt: user.totalPoints } }
          });
          userRank = higherRanked + 1;
        }
      }
    } else {
      // Weekly or monthly - aggregate from scores table
      const now = nowAST();
      let startDate;

      if (type === 'weekly') {
        startDate = getWeekStart(now.toJSDate()).toJSDate();
      } else if (type === 'monthly') {
        startDate = now.startOf('month').toJSDate();
      } else {
        return res.status(400).json({ error: 'Invalid type. Use: all-time, weekly, or monthly' });
      }

      // Aggregate scores for the period
      const aggregated = await prisma.score.groupBy({
        by: ['userId'],
        where: {
          scoreDate: { gte: startDate }
        },
        _sum: {
          totalScore: true
        },
        orderBy: {
          _sum: {
            totalScore: 'desc'
          }
        },
        take: parseInt(limit),
        skip: parseInt(offset)
      });

      // Get usernames for the ranked users
      const userIds = aggregated.map(a => a.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true }
      });

      const usernameMap = Object.fromEntries(users.map(u => [u.id, u.username]));

      rankings = aggregated.map(a => ({
        id: a.userId,
        username: usernameMap[a.userId],
        totalPoints: a._sum.totalScore || 0
      }));

      // Get user's rank for the period
      if (userId) {
        const userTotal = await prisma.score.aggregate({
          where: {
            userId,
            scoreDate: { gte: startDate }
          },
          _sum: {
            totalScore: true
          }
        });

        if (userTotal._sum.totalScore) {
          const higherRanked = await prisma.score.groupBy({
            by: ['userId'],
            where: {
              scoreDate: { gte: startDate }
            },
            _sum: {
              totalScore: true
            },
            having: {
              totalScore: {
                _sum: {
                  gt: userTotal._sum.totalScore
                }
              }
            }
          });
          userRank = higherRanked.length + 1;
        }
      }
    }

    // Add rank numbers to results
    const rankedResults = rankings.map((r, index) => ({
      rank: parseInt(offset) + index + 1,
      ...r
    }));

    // Get total count for pagination
    const totalUsers = await prisma.user.count({
      where: { totalPoints: { gt: 0 } }
    });

    res.json({
      type,
      rankings: rankedResults,
      userRank: userId ? {
        rank: userRank,
        username: req.user?.username
      } : null,
      pagination: {
        total: totalUsers,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + rankings.length < totalUsers
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

/**
 * GET /api/leaderboard/stats
 * Get overall competition statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const prisma = req.prisma;

    const [totalUsers, totalForecasts, totalScores, perfectForecasts] = await Promise.all([
      prisma.user.count(),
      prisma.forecast.count(),
      prisma.score.aggregate({
        _sum: { totalScore: true },
        _avg: { totalScore: true }
      }),
      prisma.score.count({
        where: { perfectBonus: 5 }
      })
    ]);

    // Top scorer
    const topScorer = await prisma.user.findFirst({
      orderBy: { totalPoints: 'desc' },
      select: { username: true, totalPoints: true }
    });

    res.json({
      stats: {
        totalUsers,
        totalForecasts,
        totalPoints: totalScores._sum.totalScore || 0,
        averageScore: Math.round((totalScores._avg.totalScore || 0) * 10) / 10,
        perfectForecasts,
        topScorer
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
