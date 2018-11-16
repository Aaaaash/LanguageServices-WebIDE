export const LANGUAGE_STATUS = 'language/status';

export namespace Commands {
  export const APPLY_WORKSPACE_EDIT = '_typescript.applyWorkspaceEdit';
  export const APPLY_CODE_ACTION = '_typescript.applyCodeAction';
  export const APPLY_REFACTORING = '_typescript.applyRefactoring';
  export const ORGANIZE_IMPORTS = '_typescript.organizeImports';
  export const APPLY_RENAME_FILE = '_typescript.applyRenameFile';
  /** Commands below should be implemented by the client */
  export const APPLY_COMPLETION_CODE_ACTION = '_typescript.applyCompletionCodeAction';
  export const SELECT_REFACTORING = '_typescript.selectRefactoring';
}
