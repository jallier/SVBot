import winston = require('winston');
import * as moment from 'moment';

const level: string = 'verbose';

export const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      colorize: true,
      level,
      timestamp: () => `[${moment().format('ddd MMM DD HH:mm:ss')}]`,
    }),
  ],
});
