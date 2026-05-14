const vscode = require("vscode");
const { formatCode } = require("../formatter");

function activate(context) {

  // ---------------------------------------------------------------
  //  Formatter:  full document
  // ---------------------------------------------------------------
  const fullProvider = vscode.languages.registerDocumentFormattingEditProvider(
    ["javascript", "json"],
    {
      provideDocumentFormattingEdits(document) {
        return formatDocument(document);
      }
    }
  );

  // ---------------------------------------------------------------
  //  Formatter:  selected range
  // ---------------------------------------------------------------
  const rangeProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
    ["javascript", "json"],
    {
      provideDocumentRangeFormattingEdits(document, range) {
        return formatDocument(document, range);
      }
    }
  );

  // ---------------------------------------------------------------
  //  Command:  format current line / selection
  //  Use after Prettier to "fix" only the ugly parts locally.
  // ---------------------------------------------------------------
  const fixCmd = vscode.commands.registerTextEditorCommand(
    "better-formatter.fixSelection",
    (editor) => {
      const doc = editor.document;
      const config = vscode.workspace.getConfiguration("better-formatter");
      const options = {
        compactArrays:        config.get("compactArrays", true),
        fixTrailingWhitespace: config.get("fixTrailingWhitespace", true),
        maxBlankLines:        config.get("maxBlankLines", 2),
        fixSameLineBraces:    config.get("fixSameLineBraces", true),
      };

      editor.edit((builder) => {
        for (const sel of editor.selections) {
          const range = sel.isEmpty
            ? doc.lineAt(sel.active.line).rangeIncludingLineBreak
            : sel;

          const text      = doc.getText(range);
          const formatted = formatCode(text, options);

          if (text !== formatted) {
            builder.replace(range, formatted);
          }
        }
      });
    }
  );

  context.subscriptions.push(fullProvider, rangeProvider, fixCmd);
}

function formatDocument(document, range) {
  const config = vscode.workspace.getConfiguration("better-formatter");
  const options = {
    compactArrays: config.get("compactArrays", true),
    fixTrailingWhitespace: config.get("fixTrailingWhitespace", true),
    maxBlankLines: config.get("maxBlankLines", 2),
    fixSameLineBraces: config.get("fixSameLineBraces", true),
  };

  const text = range ? document.getText(range) : document.getText();
  const formatted = formatCode(text, options);

  if (text === formatted) return [];                  // nothing to do

  if (range) {
    // Range formatting – replace only the selection
    return [vscode.TextEdit.replace(range, formatted)];
  }

  // Full-document formatting – return a single minimal-range edit
  const original = document.getText();

  // Find first char that differs
  let first = 0;
  while (
    first < original.length &&
    first < formatted.length &&
    original[first] === formatted[first]
  ) {
    first++;
  }

  // Find last char that differs (walk from the end)
  let oLast = original.length - 1;
  let fLast = formatted.length - 1;
  while (oLast >= first && fLast >= first && original[oLast] === formatted[fLast]) {
    oLast--;
    fLast--;
  }

  const startPos = document.positionAt(first);
  const endPos = document.positionAt(oLast + 1);
  const newText = formatted.slice(first, fLast + 1);

  return [vscode.TextEdit.replace(new vscode.Range(startPos, endPos), newText)];
}

function deactivate() { }

module.exports = { activate, deactivate };
