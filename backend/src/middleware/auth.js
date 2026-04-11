const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token and attach user to request
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

/**
 * Optional authentication - attaches user if token present, continues if not
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    // Token invalid but optional, so continue without user
  }

  next();
}

/**
 * Middleware to require admin privileges. Must run AFTER authenticateToken.
 * Does a fresh DB lookup so revoked admin access takes effect immediately
 * (JWTs are valid for 7 days and cannot be revoked otherwise).
 *
 * A user is considered admin if either:
 *   - users.is_admin is true in the database, OR
 *   - their email matches the ADMIN_EMAIL env var (bootstrap mechanism)
 */
async function requireAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const prisma = req.prisma;
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, isAdmin: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = user.isAdmin === true || (adminEmail && user.email === adminEmail);

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    req.adminUser = user;
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin
};
