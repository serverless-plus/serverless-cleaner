const winston = require('winston');
const path = require('path');
const { format } = winston;

const printFormat = (info) =>
  `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
const defaultPath = `${process.cwd()}/logs`;

const runLog = path.join(defaultPath, 'run.log');
const errorLog = path.join(defaultPath, 'error.log');

const logger = winston.createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.printf(printFormat)),
  defaultMeta: { service: 'Cleaner' },
  transports: [
    new winston.transports.File({ filename: errorLog, level: 'error' }),
    new winston.transports.File({ filename: runLog }),
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf((info) => `[${info.level}]: ${info.message}`),
      ),
    }),
  ],
});

module.exports = logger;
