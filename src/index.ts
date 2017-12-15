/**
 * WINDOWS BRANCH: libsodium is on 2.0.1 for windows until it is fixed upstream.
 * This should be the only difference between the windows branch and the main branch.
 */
import * as fs from 'fs';
import * as Discord from 'discord.js';
import { Queue } from 'typescript-collections';
import { Config } from './interfaces/Config';
import { VoiceQueue } from './VoiceQueue';
import { firstrun } from './functions/Misc';
import { logger } from './logger';
import { castToTextChannel } from './functions/Channels';

// Generate config file
firstrun();

const config: Config = JSON.parse(fs.readFileSync('config.json').toString());
const commandChar: string = config.command_char;

const client = new Discord.Client();
const voiceQueue = new VoiceQueue();

client.login(config.token);

// Log that the bot is ready to go
client.on('ready', () => {
  logger.info('Bot has successfully started');
});

// Handle received messages
client.on('message', async (message) => {
  // Ignore the message if it's not a command
  if (!message.content.startsWith(commandChar) || !message.guild) {
    return;
  } else if (message.content.startsWith(commandChar) && message.content.substring(1) === 'desc') {
    // Print all commands and descriptions
    let output = '';
    for (const command of config.commands) {
      output += `${config.command_char}${command.name}: ${command.description}\n`;
    }
    message.channel.send(output);
    return;
  }
  // Loop through all the saved commands, break on one that matches.
  const messageStr = message.content.substring(1);
  for (const command of config.commands) {
    if (command.name === messageStr) {
      // Send text message to channel
      if (command.message) {
        logger.info(`Sending '${command.message}' to ${message.guild.name}#${castToTextChannel(message.channel).name}`);
        message.channel.send(command.message);
      }
      // Send voice clip to channel
      if (message.member.voiceChannel && command.audio_path) {
        voiceQueue.addAudio(command.audio_path, message);
      }
      // Only loop as far as needed
      break;
    }
  }
});


/**
 * TODO:
 * - Add config file if it doesn't exist
 *    - Interactive run for first set up
 * - Add multiple audio for one command
 * - Add commands in DC itself?
 */
