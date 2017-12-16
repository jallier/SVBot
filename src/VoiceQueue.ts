import { Queue } from 'typescript-collections';
import * as Discord from 'discord.js';
import { logger } from './logger';
import { getFullTextChannelName } from './functions/Channels';

/**
 * Class to manage queuing and playing of audio clips
 */
export class VoiceQueue {
  private _queue: Queue<{ path: string; message: Discord.Message }>;
  private _voiceConnection: Discord.VoiceConnection | null;
  private _isPlaying: boolean;

  constructor() {
    this._queue = new Queue();
    this._isPlaying = false;
  }

  /**
   * Add an audio path to the internal queue for playing.
   * If the clip is the only thing in the queue, start playing.
   * @param path absolute path to the file to play
   * @param message Discord message that requested the clip
   */
  public addAudio(path: string, message: Discord.Message) {
    logger.info(`Received ${message.content}. Adding ${path} to queue`);
    this._queue.enqueue({ path, message });
    if (!this._isPlaying) {
      logger.info('Playing queue');
      this.playQueue();
    }
  }

  /**
   * Play the queue. When the end is reached, recursively call function on remaining items
   */
  private async playQueue() {
    const items = this._queue.dequeue();
    if (!this._voiceConnection) {
      logger.info(`joining channel ${getFullTextChannelName(items.message)}`);
      this._voiceConnection = await items.message.member.voiceChannel.join();
      logger.info(`joined channel ${getFullTextChannelName(items.message)}`);
    }
    logger.info(`Playing file ${items.path}`);
    this._isPlaying = true;
    const dispatcher = this._voiceConnection.playFile(items.path);
    dispatcher.on('end', (reason) => {
      logger.info('player finished:', reason);
      if (this._queue.isEmpty()) {
        this._isPlaying = false;
      }
      if (this._isPlaying) {
        this.playQueue();
      } else {
        logger.info(`Queue empty; Leaving channel ${getFullTextChannelName(items.message)}`);
        this._voiceConnection.disconnect();
        this._voiceConnection = undefined;
      }
    });
  }
}
