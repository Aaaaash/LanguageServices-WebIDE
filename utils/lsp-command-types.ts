const enum CommandTypes {
  Initialize = "initialize",
  Brace = "brace",
  BraceCompletion = "braceCompletion",
  Change = "change",
  Close = "close",
  Completions = "completions",
  CompletionDetails = "completionEntryDetails",
  CompileOnSaveAffectedFileList = "compileOnSaveAffectedFileList",
  CompileOnSaveEmitFile = "compileOnSaveEmitFile",
  Configure = "configure",
  Definition = "definition",
  Implementation = "implementation",
  Exit = "exit",
  Format = "format",
  Formatonkey = "formatonkey",
  Geterr = "geterr",
  GeterrForProject = "geterrForProject",
  SemanticDiagnosticsSync = "semanticDiagnosticsSync",
  SyntacticDiagnosticsSync = "syntacticDiagnosticsSync",
  NavBar = "navbar",
  Navto = "navto",
  NavTree = "navtree",
  NavTreeFull = "navtree-full",
  Occurrences = "occurrences",
  DocumentHighlights = "documentHighlights",
  Open = "textDocument/didOpen",
  Quickinfo = "quickinfo",
  References = "references",
  Reload = "reload",
  Rename = "rename",
  Saveto = "saveto",
  SignatureHelp = "signatureHelp",
  TypeDefinition = "typeDefinition",
  ProjectInfo = "projectInfo",
  ReloadProjects = "reloadProjects",
  Unknown = "unknown",
  OpenExternalProject = "openExternalProject",
  OpenExternalProjects = "openExternalProjects",
  CloseExternalProject = "closeExternalProject",
  TodoComments = "todoComments",
  Indentation = "indentation",
  DocCommentTemplate = "docCommentTemplate",
  CompilerOptionsForInferredProjects = "compilerOptionsForInferredProjects",
  GetCodeFixes = "textDocument/codeAction",
  GetSupportedCodeFixes = "getSupportedCodeFixes",
  GetApplicableRefactors = "getApplicableRefactors",
  GetEditsForRefactor = "getEditsForRefactor",
};

export default CommandTypes;
