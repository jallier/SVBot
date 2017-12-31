import { Collection, MessageAttachment, User, Attachment } from 'discord.js';
import { logger } from '../logger';
import * as fs from 'fs';
import * as request from 'request';
import * as pathm from 'path';

/**
 * Represents state of the newly added command
 */
export enum AddCommandStatus {
  initialMessage,
  awaitingCommand,
}

/**
 * Class to handle adding a new command dynamically through discord using commands and mentions
 */
export class AddCommandState {
  public state: AddCommandStatus;
  public urls: string[];
  public attachmentPaths: string[];

  constructor() {
    this.state = AddCommandStatus.initialMessage;
    this.urls = [];
    this.attachmentPaths = [];
  }

  /**
   * Advance the internal state of the object to the next step of adding a command
   */
  public advanceState() {
    if (this.state !== AddCommandStatus.awaitingCommand) {
      this.state++;
    } else {
      this.state = AddCommandStatus.initialMessage;
    }
  }

  /**
   * Gets the urls of message attachments.
   * Returns collection of attachment urls with filename for key
   * @param attachements Collection of message attachments
   */
  private getMessageAttachmentsUrls(attachements: Collection<string, MessageAttachment>) {
    const output = new Collection<string, string>();
    for (const i of attachements.entries()) {
      output.set(i[1].filename, i[1].url);
    }
    return output;
  }

  /**
   * Checks if a given path is audio, using the file extention. Currently only checks for wav and mp3
   * @param attachment Path of the attachment to check
   */
  private isAudio(attachment: string) {
    const attachmentExtention = attachment.split('.');
    if (['mp3', 'wav'].indexOf(attachmentExtention[attachmentExtention.length - 1]) > -1) {
      return true;
    }
    return false;
  }

  /**
   * Downloads all the attachments of a message to the given directory.
   * @param dir path to download the attachments to
   * @param inputAttachments Collection of MessageAttachments with filename as key
   */
  public async downloadAttachments(dir: string, inputAttachments: Collection<string, MessageAttachment>) {
    const attachments = await this._downloadAttachments(dir, inputAttachments);
    logger.info('Message attachments: ', attachments);
    this.attachmentPaths = this.attachmentPaths.concat(attachments);
  }

  /**
   * Private method to download the attachments of a message to the given directory.
   * @param dir Path to download the attachments to
   * @param inputAttachments Collection of MessageAttachments with filename as key
   */
  private async _downloadAttachments(dir: string, inputAttachments: Collection<string, MessageAttachment>) {
    logger.info('Downloading attachments');
    const attachments = this.getMessageAttachmentsUrls(inputAttachments);
    const paths: string[] = [];
    for (const attachment of attachments.entries()) {
      if (!this.isAudio(attachment[0])) {
        // If the given file isn't audio, just skip it
        continue;
      }
      const path = dir + attachment[0]; // TODO: Fix this breaking the path in the config
      const url = attachment[1];
      logger.info(`Received file with url: ${url}`);
      let filePath: string;
      try {
        filePath = await this._downloadFileAsync(path, url);
      } catch (e) {
        logger.error(e);
      }
      logger.info(`Downloaded file to ${filePath}`);
      paths.push(filePath);
    }
    return paths;
  }

  /**
   * Downloads the individual files of the message to the given dir. Note, uses recursive promise. If the file already exists,
   * will append _new to the new file, and use that instead.
   * @param path path to download the file to
   * @param url url of the attachment
   */
  private _downloadFileAsync(path: string, url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.open(path, 'wx', (err, fd) => {
        if (err) {
          if (err.code === 'EEXIST') { // If the file already exists, generate a new path, resolve the promise and handle in the .then() block underneath
            logger.info('File already exists');
            const newPath = pathm.parse(path);
            newPath.name += '_new';
            newPath.base = newPath.name + newPath.ext;
            return resolve(pathm.format(newPath));
          }
          throw err;
        }
        const stream = fs.createWriteStream('', { fd });
        stream
          .on('error', (e) => {
            logger.error('File ', e);
            fs.unlink(path, () => { });
            reject(e);
          })
          .on('finish', () => {
            logger.info(`File written to ${path}`);
            resolve(path); // Return the path where the file was downloaded to.
          });
        request.get(url)
          .on('error', (e) => {
            logger.error('http error', e.message);
            fs.unlink(path, () => { });
            reject(e);
          })
          .on('response', (res) => {
            if (res.statusCode === 200) { // Only write data if request was successfull.
              res.pipe(stream)
                .on('error', (e) => {
                  logger.error('File error: ', e);
                  fs.unlink(path, () => { });
                  reject(e);
                })
                .on('finish', () => {
                  stream.end(); // End the file stream to complete the promise properly
                });
            }
          });
      });
    }).then((data: string) => {
      return data === path ? data : this._downloadFileAsync(data, url); // If the file already exists, call the function again until a new filename is found.
    });
  }
}
