export interface Config {
    token: string;
    command_char: string;
    commands: {
      name: string;
      description: string;
      message?: string;
      audio_path?: string;
    }[];
  }