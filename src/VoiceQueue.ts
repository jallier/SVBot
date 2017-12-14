import { Queue } from 'typescript-collections';
import * as Discord from 'discord.js';

export class VoiceQueue {
  private _queue: Queue<{ path: string; message: Discord.Message }>;
  private _voiceConnection: Discord.VoiceConnection | null;
  private _isPlaying: boolean;

  constructor() {
    this._queue = new Queue();
    this._isPlaying = false;
  }

  public addAudio(path: string, message: Discord.Message) {
    console.log('Adding audio to queue');
    this._queue.enqueue({ path, message });
    if (!this._isPlaying) {
      console.log('playing queue');
      this.playQueue();
    }
  }

  private async playQueue() {
    let items = this._queue.dequeue();
    if (!this._voiceConnection) {
      console.log('joining channel');
      this._voiceConnection = await items.message.member.voiceChannel.join();
      console.log('joined channel');
    }
    console.log('playing file');
    this._isPlaying = true;
    let dispatcher = this._voiceConnection.playFile(items.path);
    dispatcher.on('end', reason => {
      console.log('player finished:', reason);
      if(this._queue.isEmpty()){
        this._isPlaying = false;
      }
      if (this._isPlaying) {
        this.playQueue();
      } else {
        this._voiceConnection.disconnect();
        this._voiceConnection = null;
      }
    });
  }
}
