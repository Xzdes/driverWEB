/**
 * Logger - Централизованное логирование движка
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

let currentLevel = LOG_LEVELS.DEBUG;

function formatTime() {
  return new Date().toLocaleTimeString();
}

function log(level, tag, ...args) {
  if (level < currentLevel) return;

  const prefix = `[${formatTime()}] [${tag.padEnd(8)}]`;

  switch (level) {
    case LOG_LEVELS.DEBUG:
      console.log(`%c${prefix}`, 'color: #888', ...args);
      break;
    case LOG_LEVELS.INFO:
      console.log(`%c${prefix}`, 'color: #4a9eff', ...args);
      break;
    case LOG_LEVELS.WARN:
      console.warn(`${prefix}`, ...args);
      break;
    case LOG_LEVELS.ERROR:
      console.error(`${prefix}`, ...args);
      break;
  }
}

export const Logger = {
  debug: (tag, ...args) => log(LOG_LEVELS.DEBUG, tag, ...args),
  info: (tag, ...args) => log(LOG_LEVELS.INFO, tag, ...args),
  warn: (tag, ...args) => log(LOG_LEVELS.WARN, tag, ...args),
  error: (tag, ...args) => log(LOG_LEVELS.ERROR, tag, ...args),

  setLevel(level) {
    if (typeof level === 'string') {
      currentLevel = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.DEBUG;
    } else {
      currentLevel = level;
    }
  },

  LEVELS: LOG_LEVELS
};

export default Logger;
