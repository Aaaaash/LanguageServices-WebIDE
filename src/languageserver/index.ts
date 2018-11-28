import { LanguageServerProfile } from '../types';
import JavaLanguageServer from './JavaLanguageServer';
import PythonLanguageServer from './PythonLanguageServer';
import TypeScript from './TypeScript';

const serverProfiles: LanguageServerProfile<any>[] = [
  { language: 'java', server: JavaLanguageServer },
  { language: 'python', server: PythonLanguageServer },
  { language: 'typescript', server: TypeScript },
  { language: 'javascript', server: TypeScript },
];

export default serverProfiles;
