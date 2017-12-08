import * as fs from 'fs';
import * as Discord from 'discord.js';
import {Config} from './Config';

// Create the Discord client and parse the config
const client = new Discord.Client();
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
  if (!message.content.startsWith(commandChar)) {
    return;
  }
  // Ignore the command char, then loop the commands in the config
  const messageStr = message.content.substring(1);
  for (let command of config.commands) {
    if (command.name === messageStr) {
      if (command.message) {
        message.channel.send(command.message);
      }
      if (command.audio_path) {
        // Send the audio clip to the voice channel user was in
        const connection = await message.member.voiceChannel.join();
        const dispatcher = connection.playFile(command.audio_path);
        // Leave channel after command is played
        dispatcher.on('end', () => {
          connection.disconnect();
        });
      }
    }
  }
});
