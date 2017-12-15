import * as fs from 'fs';

export function firstrun() {
  if (!fs.existsSync('config.json')) {
    console.log('config file does not exist. Generating basic file');
    const output = {
      "token": "Insert your token here. You can get this from the developer section on Discord",
      "command_char": "!",
      "commands": [
        {
          "name": "ping",
          "description": "test the bot is working",
          "message": "pong!"
        }
      ]
    };
    fs.writeFileSync('config.json', JSON.stringify(output, null, 2));
    console.log('Please add token to use the bot')
    process.exit(1);
  }
}
