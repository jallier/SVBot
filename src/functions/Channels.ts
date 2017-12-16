import * as Discord from 'discord.js';

/**
 * Cast a generic channel to a text channel. Useful for getting the name and other text channel specifics
 * @param channel Channel to cast
 */
export function castToTextChannel(channel: Discord.Channel) {
  return channel as Discord.TextChannel;
}

/**
 * Return a string containing the full guild and text channel name from a message
 * @param message Message to get name from
 */
export function getFullTextChannelName(message: Discord.Message) {
  return `${message.guild}#${castToTextChannel(message.channel).name}`
}
