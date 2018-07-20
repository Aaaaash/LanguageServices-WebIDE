import JavaLanguageServer from './JavaLanguageServer';
import { LanguageServerProfile } from '../types';

const serverProfiles: Array<LanguageServerProfile<typeof JavaLanguageServer>> = [
  { language: 'java', server: JavaLanguageServer },
];

export default serverProfiles;
