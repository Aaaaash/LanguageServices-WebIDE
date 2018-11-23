import JavaLanguageServer from './JavaLanguageServer';
import PythonLanguageServer from './PythonLanguageServer';
import CsharpLanguageServer from './CsharpLanguageServer';

import { LanguageServerProfile } from '../types';

type LanguageServers =
  typeof JavaLanguageServer |
  typeof PythonLanguageServer |
  typeof CsharpLanguageServer;

const serverProfiles: LanguageServerProfile<LanguageServers>[] = [
  { language: 'java', server: JavaLanguageServer },
  { language: 'python', server: PythonLanguageServer },
  { language: 'csharp', server: CsharpLanguageServer },
];

export default serverProfiles;
