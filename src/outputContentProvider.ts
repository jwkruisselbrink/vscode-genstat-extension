import vscode = require('vscode');
import fs = require('fs');
import * as path from "path";

export class OutputContentProvider implements vscode.TextDocumentContentProvider {

    // emitter and its event
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    provideTextDocumentContent(uri: vscode.Uri): string {
        const possiblePaths = vscode.workspace.workspaceFolders
            .map(r => path.join(r.uri.fsPath, uri.path))
            .filter(r => fs.existsSync(r));
        if (possiblePaths.length > 0) {
            var content = fs.readFileSync(possiblePaths[0]);
            return content.toString();
        } else {
            throw new Error("Output file not found");
        }
    }
}
