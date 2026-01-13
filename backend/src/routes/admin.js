const express = require('express');

const router = express.Router();

/**
 * POST /api/admin/reset-scores
 * Reset all user totalPoints to 0
 * WARNING: This will clear the leaderboard
 */
router.post('/reset-scores', async (req, res) => {
  try {
    const prisma = req.prisma;

    // Reset all users' totalPoints to 0
    const result = await prisma.user.updateMany({
      data: {
        totalPoints: 0
      }
    });

    console.log(`✅ Reset totalPoints for ${result.count} users`);

    res.json({
      success: true,
      message: `Reset totalPoints for ${result.count} users`,
      usersUpdated: result.count
    });
  } catch (error) {
    console.error('Reset scores error:', error);
    res.status(500).json({ error: 'Failed to reset scores' });
  }
});

/**
 * DELETE /api/admin/delete-all-scores
 * Delete all scores from the scores table
 * WARNING: This is destructive and cannot be undone
 */
router.delete('/delete-all-scores', async (req, res) => {
  try {
    const prisma = req.prisma;

    // Delete all scores
    const result = await prisma.score.deleteMany({});

    console.log(`✅ Deleted ${result.count} scores`);

    res.json({
      success: true,
      message: `Deleted ${result.count} scores`,
      scoresDeleted: result.count
    });
  } catch (error) {
    console.error('Delete scores error:', error);
    res.status(500).json({ error: 'Failed to delete scores' });
  }
});

/**
 * POST /api/admin/reset-everything
 * Reset both scores table and user totalPoints
 * WARNING: This will completely reset the leaderboard
 */
router.post('/reset-everything', async (req, res) => {
  try {
    const prisma = req.prisma;

    // Delete all scores and reset user points in a transaction
    const [scoresDeleted, usersUpdated] = await prisma.$transaction([
      prisma.score.deleteMany({}),
      prisma.user.updateMany({
        data: { totalPoints: 0 }
      })
    ]);

    console.log(`✅ Deleted ${scoresDeleted.count} scores and reset ${usersUpdated.count} users`);

    res.json({
      success: true,
      message: 'Successfully reset all scores and user points',
      scoresDeleted: scoresDeleted.count,
      usersUpdated: usersUpdated.count
    });
  } catch (error) {
    console.error('Reset everything error:', error);
    res.status(500).json({ error: 'Failed to reset everything' });
  }
});

module.exports = router;
