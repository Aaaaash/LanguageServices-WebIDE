import * as fs from 'fs';
import { func } from './is';

const stat = fs.statSync;

export function findMonoHome(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (process.env.LSP_HOME && stat(`${process.env.LSP_HOME}/runtimes/csharp/run`).isFile()) {
      resolve(`${process.env.LSP_HOME}/runtimes/csharp/run`);
    }
    reject('mono not found');
  });
}

export function findRazor(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (process.env.LSP_HOME && stat(`${process.env.LSP_HOME}/lsp-csharp-server/razor/OmniSharpPlugin/Microsoft.AspNetCore.Razor.OmniSharpPlugin.dll`).isFile()) {
      resolve(`${process.env.LSP_HOME}/lsp-csharp-server/razor/OmniSharpPlugin/Microsoft.AspNetCore.Razor.OmniSharpPlugin.dll`);
    }
    reject('razor not found');
  });
}
