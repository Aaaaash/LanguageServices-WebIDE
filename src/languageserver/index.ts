import { LanguageServerProfile } from '../types';
import Java from './Java';
import Python from './Python';
import ChsharpOmnisharp from './Chsharp-Omnisharp';
import TypeScript from './TypeScript';

const serverProfiles: LanguageServerProfile<any>[] = [
  { language: 'java', server: Java },
  { language: 'python', server: Python },
  { language: 'typescript', server: TypeScript },
  { language: 'javascript', server: TypeScript },
  { language: 'c#', server: ChsharpOmnisharp },
];

export default serverProfiles;
