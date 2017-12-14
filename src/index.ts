import * as fs from 'fs';
import * as Discord from 'discord.js';
import { Queue } from 'typescript-collections';
import { Config } from './Config';
import { VoiceQueue } from './VoiceQueue';

const client = new Discord.Client();
let voiceQueue = new VoiceQueue();

const config: Config = JSON.parse(fs.readFileSync('config.json').toString());
const commandChar: string = config.command_char;

client.login(config.token);

// Log that the bot is ready to go
client.on('ready', () => {
  console.log('I am ready');
});

// Handle received messages
client.on('message', async message => {
  // Ignore the message if it's not a command
  if (!message.content.startsWith(commandChar) || !message.guild) {
    return;
  }
  const messageStr = message.content.substring(1);
  for (let command of config.commands) {
    if (command.name === messageStr) {
      if (command.message) {
        message.channel.send(command.message);
      }
      if (message.member.voiceChannel && command.audio_path) {
        voiceQueue.addAudio(command.audio_path, message);
      }
    }
  }
});


/**
 * TODO: 
 * - Clean up the code
 * - Add a proper logging lib (Winston)
 * - Add file watching to reload on config change
 * - Add commands in DC itself?
 */
