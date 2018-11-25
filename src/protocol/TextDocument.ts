import * as lsp from 'vscode-languageserver';

export function applyEdits(before: string, edits: lsp.TextEdit[]): string {
  const sorted = edits.sort((a, b) => {
    if (a.range.start.line === b.range.start.line) {
      return a.range.start.character - b.range.start.character;
    }
    return a.range.start.line - b.range.start.line;
  });
  const doc = lsp.TextDocument.create('', '', 0, before);
  let currentDoc = '';
  let offset = 0;
  for (const edit of sorted) {
    const startOffset = doc.offsetAt(edit.range.start);
    currentDoc += before.substr(offset, startOffset - offset) + edit.newText;
    offset = doc.offsetAt(edit.range.end);
  }
  return currentDoc + before.substr(offset);
}

export function getPosition(offset: number): lsp.Position {
  if (offset > this.text.length) {
    throw new Error('offset ' + offset + ' is out of bounds.');
  }
  const lines = this.lines;
  let currentOffSet = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const l =  lines[i];
    if (currentOffSet + l.length + 1 > offset) {
      return {
        line: i,
        character: offset - currentOffSet,
      };
      /* tslint:disable */
    } else {
      /* tslint:enable */
      currentOffSet += l.length + 1;
    }
  }
  throw new Error('Programming Error.');
}


/* tslint:disable */
export interface Line {
  text: string;
}

export interface FileBasedRequest {
  FileName: string;
}

export interface LinePositionSpanTextChange {
  NewText: string;
  StartLine: number;
  StartColumn: number;
  EndLine: number;
  EndColumn: number;
}

export interface Request extends FileBasedRequest {
  Line?: number;
  Column?: number;
  Buffer?: string;
  Changes?: LinePositionSpanTextChange[];
}


export interface AutoCompleteRequest extends Request {
  WordToComplete: string;
  WantDocumentationForEveryCompletionResult?: boolean;
  WantImportableTypes?: boolean;
  WantMethodHeader?: boolean;
  WantSnippet?: boolean;
  WantReturnType?: boolean;
  WantKind?: boolean;
  TriggerCharacter?: string;
}

export class LspDocument {
  uri: string;
  text: string;
  version: number = 0;
  lastAccessed: number = new Date().getTime();

  constructor(doc: lsp.TextDocumentItem) {
    this.text = doc.text;
    this.uri = doc.uri;
    if (lsp.VersionedTextDocumentIdentifier.is(doc)) {
      this.version = doc.version;
    }
  }

  private get lines() {
    return this.text.split('\n');
  }

  lineAt(line: number): Line {
    return {
      text: this.lines[line]
    };
  }

  markAccessed(): void {
    this.lastAccessed = new Date().getTime();
  }

  getPosition(offset: number): lsp.Position {
    if (offset > this.text.length) {
      throw new Error(
        'offset ' +
          offset +
          ' is out of bounds. Document length was ' +
          this.text.length,
      );
    }
    const lines = this.lines;
    let currentOffSet = 0;
    for (let i = 0; i < lines.length; i += 1) {
      const l = lines[i];
      if (currentOffSet + l.length + 1 > offset) {
        return {
          line: i,
          character: offset - currentOffSet,
        };
      } else {
        currentOffSet += l.length + 1;
      }
    }
    throw new Error('Programming Error.');
  }

  offsetAt(position: lsp.Position): number {
    const lines = this.text.split('\n');
    let currentOffSet = 0;
    for (let i = 0; i < lines.length; i += 1) {
      const l = lines[i];
      if (position.line === i) {
        if (l.length < position.character) {
          throw new Error(
            `Position ${JSON.stringify(
              position,
            )} is out of range. Line [${i}] only has length ${l.length}.`,
          );
        }
        return currentOffSet + position.character;
      } else {
        currentOffSet += l.length + 1;
      }
    }
    throw new Error(
      `Position ${JSON.stringify(
        position,
      )} is out of range. Document only has ${lines.length} lines.`,
    );
  }

  apply(contentChanges: lsp.TextDocumentContentChangeEvent[], version: number) {
    this.applyEdits(
      contentChanges.map((e) => {
        const range =
          e.range ||
          lsp.Range.create(
            lsp.Position.create(0, 0),
            this.getPosition(e.rangeLength || 0),
          );
        return lsp.TextEdit.replace(range, e.text);
      }),
    );
    this.version = version;
  }

  applyEdits(edits: lsp.TextEdit[]) {
    this.text = applyEdits(this.text, edits);
    this.lastAccessed = new Date().getTime();
  }

  async save(): Promise<void> {
    // TODO sync with disc?
  }
}

export interface DocumentationItem {
  Name: string;
  Documentation: string;
}

export interface DocumentationComment {
  SummaryText: string;
  TypeParamElements: DocumentationItem[];
  ParamElements: DocumentationItem[];
  ReturnsText: string;
  RemarksText: string;
  ExampleText: string;
  ValueText: string;
  Exception: DocumentationItem[];
}

export function getDocumentationString(structDoc: DocumentationComment) {
  let newLine = "\n\n";
  let indentSpaces = "\t\t";
  let documentation = "";
  
  if (structDoc) {
      if (structDoc.SummaryText) {
          documentation += structDoc.SummaryText + newLine;
      }

      if (structDoc.TypeParamElements && structDoc.TypeParamElements.length > 0) {
          documentation += "Type Parameters:" + newLine;
          documentation += indentSpaces + structDoc.TypeParamElements.map(displayDocumentationObject).join("\n" + indentSpaces) + newLine;
      }

      if (structDoc.ParamElements && structDoc.ParamElements.length > 0) {
          documentation += "Parameters:" + newLine;
          documentation += indentSpaces + structDoc.ParamElements.map(displayDocumentationObject).join("\n" + indentSpaces) + newLine;
      }

      if (structDoc.ReturnsText) {
          documentation += structDoc.ReturnsText + newLine;
      }

      if (structDoc.RemarksText) {
          documentation += structDoc.RemarksText + newLine;
      }

      if (structDoc.ExampleText) {
          documentation += structDoc.ExampleText + newLine;
      }

      if (structDoc.ValueText) {
          documentation += structDoc.ValueText + newLine;
      }

      if (structDoc.Exception && structDoc.Exception.length > 0) {
          documentation += "Exceptions:" + newLine;
          documentation += indentSpaces + structDoc.Exception.map(displayDocumentationObject).join("\n" + indentSpaces) + newLine;
      }

      documentation = documentation.trim();
  }
  
  return documentation;
}

const summaryStartTag = /<summary>/i;
const summaryEndTag = /<\/summary>/i;

export function displayDocumentationObject(obj: DocumentationItem): string {
  return obj.Name + ": " + obj.Documentation;
}


export function extractSummaryText(xmlDocComment: string): string {
  if (!xmlDocComment) {
      return xmlDocComment;
  }

  let summary = xmlDocComment;

  let startIndex = summary.search(summaryStartTag);
  if (startIndex < 0) {
      return summary;
  }

  summary = summary.slice(startIndex + '<summary>'.length);

  let endIndex = summary.search(summaryEndTag);
  if (endIndex < 0) {
      return summary;
  }

  return summary.slice(0, endIndex);
}

export interface MetadataSource {
  AssemblyName: string;
  ProjectName: string;
  VersionNumber: string;
  Language: string;
  TypeName: string;
}

export interface ResourceLocation {
  FileName: string;
  Line: number;
  Column: number;
}

export interface GoToDefinitionResponse extends ResourceLocation {
  MetadataSource?: MetadataSource;
}

export interface MetadataResponse {
  SourceName: string;
  Source: string;
}

export interface QuickFix {
  LogLevel: string;
  FileName: string;
  Line: number;
  Column: number;
  EndLine: number;
  EndColumn: number;
  Text: string;
  Projects: string[];
}

export interface QuickFixResponse {
  QuickFixes: QuickFix[];
}


export interface Point {
  Line: number;
  Column: number;
}

export interface Range {
  Start: Point;
  End: Point;
}

export interface CodeElement {
  Kind: string;
  Name: string;
  DisplayName: string;
  Children?: CodeElement[];
  Ranges: { [name: string]: Range };
  Properties?: { [name: string]: any };
}


abstract class OmniSharpCodeLens {
  range: lsp.Range;
  constructor(
    range: Range,
    public fileName: string) {

    const start = lsp.Position.create(range.Start.Line - 1, range.Start.Column - 1);
    const end = lsp.Position.create(range.End.Line - 1, range.End.Column - 1);
    this.range = lsp.Range.create(start, end)
  }
}

export class ReferencesCodeLens extends OmniSharpCodeLens {
  constructor(
    range: Range,
    fileName: string) {
    super(range, fileName);
  }
}
