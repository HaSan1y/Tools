const vscode = require("vscode");
const { formatCode } = require("./formatter");

function activate(context) {

    const provider =
        vscode.languages.registerDocumentFormattingEditProvider(
            ["javascript", "json"],
            {
                provideDocumentFormattingEdits(document) {

                    const text =
                        document.getText();

                    const formatted =
                        formatCode(text);

                    const fullRange =
                        new vscode.Range(
                            document.positionAt(0),
                            document.positionAt(text.length)
                        );

                    return [
                        vscode.TextEdit.replace(
                            fullRange,
                            formatted
                        )
                    ];
                }
            }
        );

    context.subscriptions.push(provider);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};