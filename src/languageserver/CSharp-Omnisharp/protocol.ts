import * as lsp from 'vscode-languageserver';

export const commitCharactersWithoutSpace = [
  '{',
  '}',
  '[',
  ']',
  '(',
  ')',
  '.',
  ',',
  ':',
  ';',
  '+',
  '-',
  '*',
  '/',
  '%',
  '&',
  '|',
  '^',
  '!',
  '~',
  '=',
  '<',
  '>',
  '?',
  '@',
  '#',
  "'",
  '"',
  '\\',
];

export const allCommitCharacters = [
  ' ',
  '{',
  '}',
  '[',
  ']',
  '(',
  ')',
  '.',
  ',',
  ':',
  ';',
  '+',
  '-',
  '*',
  '/',
  '%',
  '&',
  '|',
  '^',
  '!',
  '~',
  '=',
  '<',
  '>',
  '?',
  '@',
  '#',
  "'",
  '"',
  '\\',
];
/* tslint:disable */
export const _kinds: { [kind: string]: lsp.CompletionItemKind } = Object.create(null);
/* tslint:enable */

// types
_kinds['Class'] = lsp.CompletionItemKind.Class;
_kinds['Delegate'] = lsp.CompletionItemKind.Class; // need a better option for this.
_kinds['Enum'] = lsp.CompletionItemKind.Enum;
_kinds['Interface'] = lsp.CompletionItemKind.Interface;
_kinds['Struct'] = lsp.CompletionItemKind.Struct;

// variables
_kinds['Local'] = lsp.CompletionItemKind.Variable;
_kinds['Parameter'] = lsp.CompletionItemKind.Variable;
_kinds['RangeVariable'] = lsp.CompletionItemKind.Variable;

// members
_kinds['Const'] = lsp.CompletionItemKind.Constant;
_kinds['EnumMember'] = lsp.CompletionItemKind.EnumMember;
_kinds['Event'] = lsp.CompletionItemKind.Event;
_kinds['Field'] = lsp.CompletionItemKind.Field;
_kinds['Method'] = lsp.CompletionItemKind.Method;
_kinds['Property'] = lsp.CompletionItemKind.Property;

// other stuff
_kinds['Label'] = lsp.CompletionItemKind.Unit; // need a better option for this.
_kinds['Keyword'] = lsp.CompletionItemKind.Keyword;
_kinds['Namespace'] = lsp.CompletionItemKind.Module;

/* tslint:disable */
export namespace SymbolPropertyNames {
  export const Accessibility = "accessibility";
  export const Static = "static";
  export const TestFramework = "testFramework";
  export const TestMethodName = "testMethodName";
}
export namespace SymbolRangeNames {
  export const Attributes = "attributes";
  export const Full = "full";
  export const Name = "name";
}

export const filteredSymbolNames: { [name: string]: boolean } = {
  Equals: true,
  Finalize: true,
  GetHashCode: true,
  ToString: true
};
