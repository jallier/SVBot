import * as fs from 'fs';
import { logger } from '../logger';
import { Collection, MessageAttachment, Message } from 'discord.js';
import * as path from 'path';
import * as https from 'https';
import * as request from 'request';

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

/**
 * Gets the urls of message attachments.
 * Returns collection of attachment urls with filename for key
 * @param attachements Collection of message attachments
 */
function getMessageAttachmentsUrls(attachements: Collection<string, MessageAttachment>) {
  const output = new Collection<string, string>();
  for (const i of attachements.entries()) {
    output.set(i[1].filename, i[1].url);
  }
  return output;
}

/**
 * Downloads attachments from message
 * @param attachements Attachment collention
 */
export function downloadAttachments(dir: string, inputAttachments: Collection<string, MessageAttachment>) {
  const attachments = getMessageAttachmentsUrls(inputAttachments);
  for (const attachment of attachments.entries()) {
    const path = dir + attachment[0];
    const url = attachment[1];
    logger.info(`Received file with url: ${url}. Writing to ${path}`);
    const stream = fs.createWriteStream(path, { flags: 'wx' });
    stream.on('error', (e) => {
      logger.error('File ', e);
      fs.unlink(path, () => { });
    });
    request.get(url)
      .on('error', (e) => {
        logger.error('http error', e.message);
        fs.unlink(path, () => { });
      })
      .on('response', (res) => {
        if (res.statusCode === 200) {
          res.pipe(stream).on('error', (e) => {
            logger.error('File error: ', e);
            fs.unlink(path, () => { });
          });
        }
      });
  }
}
