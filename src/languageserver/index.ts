import { LanguageServerProfile } from '../types';
import JavaLanguageServer from './JavaLanguageServer';
import PythonLanguageServer from './PythonLanguageServer';
import CsharpLanguageServer from './CsharpLanguageServer';
import TypeScript from './TypeScript';
import AbstractLanguageServer from './AbstractLanguageServer';

const serverProfiles: LanguageServerProfile<any>[] = [
  { language: 'java', server: JavaLanguageServer },
  { language: 'python', server: PythonLanguageServer },
  { language: 'typescript', server: TypeScript },
  { language: 'javascript', server: TypeScript },
  { language: 'c#', server: CsharpLanguageServer },
];

export default serverProfiles;
