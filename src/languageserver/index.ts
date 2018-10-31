import { LanguageServerProfile } from '../types';
import JavaLanguageServer from './JavaLanguageServer';
import PythonLanguageServer from './PythonLanguageServer';
import TypeScriptLanguageServer from './TypeScriptLanguageServer';

const serverProfiles: LanguageServerProfile<any>[] = [
  { language: 'java', server: JavaLanguageServer },
  { language: 'python', server: PythonLanguageServer },
  { language: 'typescript', server: TypeScriptLanguageServer },
  { language: 'javascript', server: TypeScriptLanguageServer },
];

export default serverProfiles;
