import { Queue } from 'typescript-collections';
import { VoiceConnection } from 'discord.js';

export class VoiceQueue {
  private _queue: Queue<any>;
  // private _voiceConnection: VoiceConnection;

  constructor() {
    this._queue = new Queue();
    // this._voiceConnection = voiceConnection;
  }

  public enqueueAudio(path: string) {
    this._queue.enqueue(path);
  }

  public playQueue(voiceConnection: VoiceConnection) {
    while (!this._queue.isEmpty()) {
      let path = this._queue.dequeue();
      let dispatcher = voiceConnection.playFile(path);
    }
  }

  public isEmpty() {
    return this._queue.isEmpty();
  }
}
