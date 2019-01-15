import { LanguageServerProfile } from '../types';
import Java from './Java';
import Python from './Python';
import CSharpOmnisharp from './CSharp-Omnisharp';
import TypeScript from './TypeScript';

const serverProfiles: LanguageServerProfile<any>[] = [
  { language: 'java', server: Java },
  { language: 'python', server: Python },
  { language: 'typescript', server: TypeScript },
  { language: 'javascript', server: TypeScript },
  { language: 'csharp', server: CSharpOmnisharp },
];

export default serverProfiles;
