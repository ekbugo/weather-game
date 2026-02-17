const { DateTime } = require('luxon');
const fs = require('fs');
const path = require('path');

const AST_ZONE = 'America/Puerto_Rico';
const AST_OFFSET = -4; // AST is UTC-4

/**
 * Load the weekly schedule from config file
 * @returns {Array} Array of schedule entries [{ date, stationId, notes }]
 */
function loadSchedule() {
  const configPath = path.join(__dirname, '../../config/weekly-schedule.json');
  try {
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return configData.schedule || [];
    }
  } catch (err) {
    console.error('[TimeUtils] Error reading schedule:', err.message);
  }
  return [];
}

/**
 * Check if a forecast is scheduled for a specific date
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @returns {boolean}
 */
function isDateScheduled(date) {
  const schedule = loadSchedule();
  return schedule.some(entry => entry.date === date);
}

/**
 * Get current time in AST (Atlantic Standard Time - Puerto Rico)
 */
function nowAST() {
  const dt = DateTime.now().setZone(AST_ZONE);

  // Fallback: if timezone data isn't available, manually set offset
  if (dt.zoneName === 'UTC' || dt.offset === 0) {
    console.warn('[TimeUtils] Timezone data not available, using manual AST offset');
    return DateTime.utc().plus({ hours: AST_OFFSET });
  }

  return dt;
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
 * Returns null if submissions are closed or no forecast is scheduled
 * Schedule-aware: only returns a date if it's actually in the weekly schedule
 */
function getCurrentForecastDate() {
  const now = nowAST();

  if (now.hour < 17) {
    // Before 5pm: check if tomorrow is actually scheduled
    const tomorrow = now.plus({ days: 1 }).toISODate();
    if (isDateScheduled(tomorrow)) {
      return tomorrow;
    }
    return null;
  } else {
    // After 5pm: submissions closed for today
    return null;
  }
}

/**
 * Get submission window info for the current forecast date
 * Schedule-aware: distinguishes between "window closed" and "no forecast scheduled"
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
    const tomorrow = now.plus({ days: 1 }).toISODate();

    // Determine reason: was there a window today that closed, or no forecast at all?
    let reason;
    if (now.hour >= 17 && isDateScheduled(tomorrow)) {
      // After 5 PM and tomorrow IS scheduled — the window was open today and just closed
      reason = 'window_closed';
    } else {
      // Either before 5 PM with no scheduled forecast, or after 5 PM with nothing scheduled
      reason = 'no_forecast_scheduled';
    }

    // Find the next scheduled forecast date from the schedule
    const schedule = loadSchedule();
    const futureEntries = schedule
      .filter(entry => {
        const forecastDate = DateTime.fromISO(entry.date, { zone: AST_ZONE });
        const windowCloses = forecastDate.minus({ days: 1 }).set({ hour: 17, minute: 0, second: 0 });
        return now < windowCloses;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const nextEntry = futureEntries[0] || null;
    const nextForecastDate = nextEntry?.date || now.plus({ days: 2 }).toISODate();
    const opensAt = nextEntry
      ? DateTime.fromISO(nextEntry.date, { zone: AST_ZONE }).minus({ days: 1 }).startOf('day')
      : now.plus({ days: 1 }).startOf('day');

    return {
      isOpen: false,
      reason,
      nextForecastDate,
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
  formatDateAST,
  isDateScheduled,
  loadSchedule
};
