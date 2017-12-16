import * as fs from 'fs';
import { logger } from '../logger';

export function firstrun() {
  if (!fs.existsSync('config.json')) {
    logger.info('config file does not exist. Generating basic file');
    const output = {
      token: 'Insert your token here. You can get this from the developer section on Discord',
      command_char: '!',
      commands: [
        {
          name: 'ping',
          description: 'test the bot is working',
          message: 'pong!',
        },
      ],
    };
    fs.writeFileSync('config.json', JSON.stringify(output, undefined, 2));
    logger.info('Please add token to use the bot');
    // If the config was generated, it won't have any associated info; exit.
    // Would be cool to add interactive process here to get user to input the needed info.
    process.exit(1);
  }
}

/**
 * Copied from MDN.
 *
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
export function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
