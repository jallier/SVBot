export interface Config {
  token: string;
  command_char: string;
  audio_path: string;
  commands: {
    name: string;
    description: string;
    message?: string;
    audio_file?: string | string[];
  }[];
}
