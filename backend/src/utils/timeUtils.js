const { DateTime } = require('luxon');

const AST_ZONE = 'America/Puerto_Rico';

/**
 * Get current time in AST (Atlantic Standard Time - Puerto Rico)
 */
function nowAST() {
  return DateTime.now().setZone(AST_ZONE);
}

/**
 * Convert a date string or Date object to AST
 */
function toAST(date) {
  if (typeof date === 'string') {
    return DateTime.fromISO(date, { zone: AST_ZONE });
  }
  return DateTime.fromJSDate(date).setZone(AST_ZONE);
}

/**
 * Get the start of day in AST for a given date
 */
function startOfDayAST(date) {
  return toAST(date).startOf('day');
}

/**
 * Check if forecast submission is open for a given date
 * Submissions open: day before at 12:00 AM AST
 * Submissions close: day before at 5:00 PM AST
 */
function canSubmitForecast(forecastDate) {
  const now = nowAST();
  const forecastDateObj = typeof forecastDate === 'string'
    ? DateTime.fromISO(forecastDate, { zone: AST_ZONE })
    : DateTime.fromJSDate(forecastDate).setZone(AST_ZONE);

  // Submissions open: day before at 12:00 AM AST
  const opensAt = forecastDateObj.minus({ days: 1 }).startOf('day');

  // Submissions close: day before at 5:00 PM AST
  const closesAt = forecastDateObj.minus({ days: 1 }).set({ hour: 17, minute: 0, second: 0 });

  return now >= opensAt && now <= closesAt;
}

/**
 * Get the forecast date that's currently accepting submissions
 * Returns null if submissions are closed
 */
function getCurrentForecastDate() {
  const now = nowAST();

  if (now.hour < 17) {
    // Before 5pm: accepting forecasts for tomorrow
    return now.plus({ days: 1 }).toISODate();
  } else {
    // After 5pm: submissions closed for today
    return null;
  }
}

/**
 * Get submission window info for the current forecast date
 */
function getSubmissionWindow() {
  const now = nowAST();
  const currentForecastDate = getCurrentForecastDate();

  if (currentForecastDate) {
    const forecastDateObj = DateTime.fromISO(currentForecastDate, { zone: AST_ZONE });
    const closesAt = forecastDateObj.minus({ days: 1 }).set({ hour: 17, minute: 0, second: 0 });

    return {
      isOpen: true,
      forecastDate: currentForecastDate,
      closesAt: closesAt.toISO(),
      remainingMinutes: Math.floor(closesAt.diff(now, 'minutes').minutes)
    };
  } else {
    // After 5pm - next window opens at midnight
    const opensAt = now.plus({ days: 1 }).startOf('day');
    const nextForecastDate = now.plus({ days: 2 }).toISODate();

    return {
      isOpen: false,
      nextForecastDate: nextForecastDate,
      opensAt: opensAt.toISO(),
      minutesUntilOpen: Math.floor(opensAt.diff(now, 'minutes').minutes)
    };
  }
}

/**
 * Get the Monday of the week for a given date
 */
function getWeekStart(date) {
  const dt = toAST(date);
  const dayOfWeek = dt.weekday; // 1 = Monday, 7 = Sunday
  return dt.minus({ days: dayOfWeek - 1 }).startOf('day');
}

/**
 * Check if it's time to announce the next week's station (Friday 6pm AST)
 */
function isAnnouncementTime() {
  const now = nowAST();
  return now.weekday === 5 && now.hour >= 18; // Friday after 6pm
}

/**
 * Format a date for display
 */
function formatDateAST(date, format = 'MMMM d, yyyy') {
  return toAST(date).toFormat(format);
}

module.exports = {
  AST_ZONE,
  nowAST,
  toAST,
  startOfDayAST,
  canSubmitForecast,
  getCurrentForecastDate,
  getSubmissionWindow,
  getWeekStart,
  isAnnouncementTime,
  formatDateAST
};
