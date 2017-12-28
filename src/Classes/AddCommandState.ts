import { Collection, MessageAttachment, User, Attachment } from 'discord.js';
import { logger } from '../logger';
import * as fs from 'fs';
import * as request from 'request';
import { WriteStream } from 'fs';
import * as pathm from 'path';

export enum AddCommandStatus {
  initialMessage,
  awaitingCommand,
}

export class AddCommandState {
  public state: AddCommandStatus;
  public user: User;
  public urls: string[];
  public attachmentPaths: string[];

  constructor(user: User) {
    this.state = AddCommandStatus.initialMessage;
    this.user = user;
    this.urls = [];
    this.attachmentPaths = [];
  }

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

  private isAudio(attachment: string) {
    const attachmentExtention = attachment.split('.');
    if (['mp3', 'wav'].indexOf(attachmentExtention[attachmentExtention.length - 1]) > -1) {
      return true;
    }
    return false;
  }

  public async downloadAttachments(dir: string, inputAttachments: Collection<string, MessageAttachment>) {
    const attachments = await this._downloadAttachments(dir, inputAttachments);
    logger.info('Message attachments: ', attachments);
    this.attachmentPaths = this.attachmentPaths.concat(attachments);
  }

  /*
  * Downloads attachments from message
  * @param attachments Attachment collention
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

  private _downloadFileAsync(path: string, url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.open(path, 'wx', (err, fd) => {
        if (err) {
          if (err.code === 'EEXIST') {
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
            if (res.statusCode === 200) {
              res.pipe(stream)
                .on('error', (e) => {
                  logger.error('File error: ', e);
                  fs.unlink(path, () => { });
                  reject(e);
                })
                .on('finish', () => {
                  stream.end();
                });
            }
          });
      });
    }).then((data: string) => {
      logger.info('Resolved');
      return data === path ? data : this._downloadFileAsync(data, url);
    });
  }
}
