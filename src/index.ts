/**
 * WINDOWS BRANCH: libsodium is on 2.0.1 for windows until it is fixed upstream.
 * This should be the only difference between the windows branch and the main branch.
 */
import * as fs from 'fs';
import * as Discord from 'discord.js';
import { Queue } from 'typescript-collections';
import { Config } from './interfaces/Config';
import { VoiceQueue } from './Classes/VoiceQueue';
import { firstrun, getRandomInt, getFullPath } from './functions/Misc';
import { logger } from './logger';
import { castToTextChannel } from './functions/Channels';
import { AddCommandState, AddCommandStatus } from './Classes/AddCommandState';

// Generate config file
firstrun();

const config: Config = JSON.parse(fs.readFileSync('config.json').toString());
const commandChar: string = config.command_char;

const client = new Discord.Client();
const voiceQueue = new VoiceQueue();
const userMentions: Discord.Collection<string, AddCommandState> = new Discord.Collection();

client.login(config.token);

// Log that the bot is ready to go
client.on('ready', () => {
  logger.info('Bot has successfully started');
});

// Handle received messages
client.on('message', (message) => {
  // Handle bot mentions
  if (message.mentions.users.exists('username', client.user.username)) {
    logger.info(`Bot was mentioned by ${message.author.username}`);
    // If the user already exists, read state and process accordingly
    let state;
    if (userMentions.has(message.author.username)) {
      state = userMentions.get(message.author.username);
    } else { // User does not exist, add to collection and process
      state = new AddCommandState();
      userMentions.set(message.author.username, state);
    }
    switch (state.state) {
      case AddCommandStatus.initialMessage:
        if (message.attachments.size > 0) {
          state.downloadAttachments(config.audio_path, message.attachments);
          message.reply(`you uploaded an audio file. If you want to turn this into a command, reply @${client.user.username} <command>`);
          state.advanceState();
        }
        break;
      case AddCommandStatus.awaitingCommand:
        logger.info('User is adding command');
        logger.info('User sent', message.content);
        const command = message.content.split(' ')[1];
        if (command.startsWith(commandChar)) {
          message.reply(`Adding command ${command}`);
          logger.info(`Adding command ${command} with path ${state.attachmentPaths[0]}`);
          config.commands.push({ name: command.substring(1), description: 'User added command', audio_file: state.attachmentPaths[0] });
          logger.info(`${JSON.stringify(config, undefined, 2)}`);
          userMentions.delete(message.author.username);
        }
        break;
    }
    return;
  }
  // Ignore the message if it's not a command
  if (!message.content.startsWith(commandChar) || !message.guild) {
    return;
  } else if (message.content.startsWith(commandChar) && ['desc', 'description'].indexOf(message.content.substring(1)) > -1) {
    // Print all commands and descriptions
    let output = '';
    for (const command of config.commands) {
      output += `${config.command_char}${command.name}: ${command.description}\n`;
    }
    message.channel.send(output);
    return;
  }
  const messageContents = message.content.split(' ');
  const messageCmd = messageContents[0].substring(1);
  for (const command of config.commands) {
    if (command.name === messageCmd) {
      // Send text message to channel
      if (command.message) {
        logger.info(`Sending '${command.message}' to ${message.guild.name}#${castToTextChannel(message.channel).name}`);
        message.channel.send(command.message);
      }
      // Send voice clip to channel
      if (message.member.voiceChannel && command.audio_file) {
        // If command is not a multi, ignore any args given
        if (!Array.isArray(command.audio_file)) {
          voiceQueue.addAudio(getFullPath(command.audio_file, config.audio_path), message);
        } else {
          // message doesn't contain args; get random index
          if (messageContents.length === 1) {
            const index = getRandomInt(0, command.audio_file.length - 1);
            logger.debug('index is: ' + index);
            voiceQueue.addAudio(config.audio_path + command.audio_file[index], message);
          } else {
            // Message has args; use them to get the specified audio path
            const index = Number(messageContents[1]) - 1 < command.audio_file.length ? Number(messageContents[1]) - 1 : command.audio_file.length - 1;
            voiceQueue.addAudio(config.audio_path + command.audio_file[index], message);
          }
        }
      }
      // Only loop as far as needed
      break;
    }
  }
});


/**
 * TODO:
 * - Add commands in DC itself?
 *  - Add multi commands
 * - Shards for multiple servers at once
 * - Add config file if it doesn't exist
 *    - Interactive run for first set up
 */
