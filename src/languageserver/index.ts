import { LanguageServerProfile } from '../types';
import JavaLanguageServer from './JavaLanguageServer';
import PythonLanguageServer from './PythonLanguageServer';
import TypeScriptLanguageServer from './TypeScriptLanguageServer';
import CppLanguageServer from './CppLanguageServer';

const serverProfiles: LanguageServerProfile<any>[] = [
  { language: 'java', server: JavaLanguageServer },
  { language: 'python', server: PythonLanguageServer },
  { language: 'c', server: CppLanguageServer },
  { language: 'cpp', server: CppLanguageServer },
  // { language: 'typescript', server: TypeScriptLanguageServer },
  // { language: 'javascript', server: TypeScriptLanguageServer },
];

export default serverProfiles;
