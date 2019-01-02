import * as vscodeUri from 'vscode-uri';
import * as lsp from 'vscode-languageserver';

import {
  CodeElement,
  ReferencesCodeLens,
  TextChange,
  SignatureHelpParameter,
  Request,
} from '../../protocol/TextDocument';
import {
  filteredSymbolNames,
  SymbolPropertyNames,
} from './protocol';

export function sum<T>(arr: T[], selector: (item: T) => number): number {
  return arr.reduce((prev, curr) => prev + selector(curr), 0);
}
/** Retrieve the length of an array. Returns 0 if the array is `undefined`. */
export function safeLength<T>(arr: T[] | undefined) {
  return arr ? arr.length : 0;
}

/* tslint:enable */
export function createUri(sourceName: string): vscodeUri.default {
  return vscodeUri.default.parse(
    `omnisharp-metadata://${sourceName
      .replace(/\\/g, '')
      .replace(/(.*)\/(.*)/g, '$1/[metadata] $2')}`,
  );
}

export function toLocationFromUri(uri: string, location: any) {
  const position = lsp.Position.create(location.Line - 1, location.Column - 1);
  const endLine = location.EndLine;
  const endColumn = location.EndColumn;

  if (endLine !== undefined && endColumn !== undefined) {
    const endPosition = lsp.Position.create(endLine - 1, endColumn - 1);
    return lsp.Location.create(uri, lsp.Range.create(position, endPosition));
  }
  return lsp.Location.create(uri, lsp.Range.create(position, position));
}

export function toRange(rangeLike: any) {
  const { Line, Column, EndLine, EndColumn } = rangeLike;
  const start = lsp.Position.create(Line - 1, Column - 1);
  const end = lsp.Position.create(EndLine - 1, EndColumn - 1);
  return lsp.Range.create(start, end);
}

export function walkCodeElements(
  elements: CodeElement[],
  action: (element: CodeElement, parentElement?: CodeElement) => void,
) {
  function walker(elements: CodeElement[], parentElement?: CodeElement) {
    for (const element of elements) {
      action(element, parentElement);

      if (element.Children) {
        walker(element.Children, element);
      }
    }
  }

  walker(elements);
}

export function isValidElementForReferencesCodeLens(element: CodeElement): boolean {
  if (element.Kind === 'namespace') {
    return false;
  }

  if (element.Kind === 'method' && filteredSymbolNames[element.Name]) {
    return false;
  }

  return true;
}

export function isValidMethodForTestCodeLens(element: CodeElement): boolean {
  if (element.Kind !== 'method') {
    return false;
  }

  if (
    !element.Properties ||
    !element.Properties[SymbolPropertyNames.TestFramework] ||
    !element.Properties[SymbolPropertyNames.TestMethodName]
  ) {
    return false;
  }

  return true;
}

export function createCodeLensesForElement(
  element: CodeElement,
  fileName: string,
): lsp.CodeLens[] {
  const results: lsp.CodeLens[] = [];

  if (isValidElementForReferencesCodeLens(element)) {
    const range = element.Ranges['name'];
    if (range) {
      results.push(new ReferencesCodeLens(range, fileName));
    }
  }

  return results;
}

export function createCodeLenses(elements: CodeElement[], fileName: string): any[] {
  const result: lsp.CodeLens[] = [];
  walkCodeElements(elements, (element) => {
    const codeLenses = createCodeLensesForElement(element, fileName);
    result.push(...codeLenses);
  });
  return result.map(codelen => ({
    data: [
      fileName,
      {
        line: codelen.range.start.line,
        character: codelen.range.start.character,
      },
      'references',
    ],
    range: codelen.range,
  }));
}

export function asEditOptionation(change: TextChange): lsp.TextEdit {
  const start = lsp.Position.create(
    change.StartLine - 1,
    change.StartColumn - 1,
  );
  const end = lsp.Position.create(change.EndLine - 1, change.EndColumn - 1);
  return lsp.TextEdit.replace(lsp.Range.create(start, end), change.NewText);
}

export function getParameterDocumentation(parameter: SignatureHelpParameter) {
  const summary = parameter.Documentation;
  if (summary.length > 0) {
    const paramText = `**${parameter.Name}**: ${summary}`;
    return lsp.MarkedString.fromPlainText(paramText);
  }
  return '';
}

export function createRequest<T extends Request>(document: lsp.TextDocument, where: any, includeBuffer: boolean = false): T {
  const line: number = where.start ? where.start.line : where.line;
  const column: number = where.end ? where.end.line : where.character;
  const fileUri = vscodeUri.default.parse(document.uri);
  const uriFileName = fileUri.fsPath;
  const fileName = fileUri.scheme === 'omnisharp-metadata'
    ? `${fileUri.authority}${uriFileName.replace('[metadata] ', '')}`
    : uriFileName;
  return <T>{
    Line: line + 1,
    Column: column + 1,
    Buffer: includeBuffer ? document.getText() : undefined,
    FileName: fileName,
  };
}
