import { LanguageServerProfile } from '../types';
import Java from './Java';
import PythonLanguageServer from './PythonLanguageServer';
import ChsharpOmnisharp from './Chsharp-Omnisharp';
import TypeScript from './TypeScript';

const serverProfiles: LanguageServerProfile<any>[] = [
  { language: 'java', server: Java },
  { language: 'python', server: PythonLanguageServer },
  { language: 'typescript', server: TypeScript },
  { language: 'javascript', server: TypeScript },
  { language: 'c#', server: ChsharpOmnisharp },
];

export default serverProfiles;
