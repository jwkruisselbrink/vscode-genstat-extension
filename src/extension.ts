import * as vscode from 'vscode';
import * as path from "path";

const cp = require('child_process');
const fs = require('fs');

import { ViewColumn } from 'vscode';
import { VscodeSettings } from "./vscodeSettings";
import { GenStatOutputChannel } from "./outputChannel";
import { OutputContentProvider } from './outputContentProvider';
import { GenStatHelpProvider as GenStatHelpProvider } from './genstatHelpProvider';

const status: any = {};
let genStatHelpProvider: GenStatHelpProvider;
let genstatOutputContentProvider: OutputContentProvider;

// method called when the extension is activated
// the extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    genstatOutputContentProvider = new OutputContentProvider();
    genStatHelpProvider = new GenStatHelpProvider();

    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider('genstatOutput', genstatOutputContentProvider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('genstat.runGenStat', () => {
            runGenStat();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('genstat.switchToSource', () => {
            switchToSource();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('genstat.openHelp', () => {
            genStatHelpProvider.openGenStatHelpAtCurrentLocation();
        })
    );
}

// method called when the extension is deactivated
export function deactivate() { }

async function runGenStat(): Promise<void> {
    if (!status.compile) {
        status.compile = "run";

        const pathGenBatch = VscodeSettings.getInstance().pathGenBatch;
        if (!pathGenBatch) {
            vscode.window.showInformationMessage(`Error: GenBatch path not specified!`);
            delete status.compile;
            return;
        }

        const activeTextEditor = vscode.window.activeTextEditor;
        if (!activeTextEditor) {
            vscode.window.showInformationMessage(`Error: no GenStat file in active editor window!`);
            delete status.compile;
            return;
        }

        const wad = activeTextEditor.document;
        const filePath = wad.fileName;
        GenStatOutputChannel.start(`Running GenStat file ${filePath}`);

        await wad.save();
        const basename = path.basename(filePath, path.extname(filePath));
        const outPath = path.join(path.dirname(filePath), basename + ".lis");
        const cmd = `"${pathGenBatch}" IN="${filePath}" "${outPath}"`;
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
                title: "Running GenStat...",
            }, async () => {
                await execPromise(cmd);
                GenStatOutputChannel.end(`Run GenStat complete!`);
            });
        } catch (ex) {
            GenStatOutputChannel.error(`Run GenStat failed: ${ex.message}!`);
        } finally {
            if (fs.existsSync(outPath)) {
                await showGenStatOutput(outPath);
            }
        }

        delete status.compile;
    }
}

async function switchToSource(): Promise<void> {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
        return;
    }
    const wad = activeTextEditor.document;
    const basename = path.basename(wad.fileName, path.extname(wad.fileName));
    const sourcePath = path.join(path.dirname(wad.fileName), basename + ".gen");

    let sourceDoc = vscode.workspace.textDocuments.find(doc => path.parse(doc.fileName).base === sourcePath);
    if (sourceDoc !== null) {
        let sourceTextEditor = vscode.window.visibleTextEditors.find(r => r.document == sourceDoc);
        await vscode.window.showTextDocument(sourceDoc,  { preview: false, viewColumn: sourceTextEditor.viewColumn, preserveFocus: false });
    } else if (fs.existsSync(sourcePath)) {
        vscode.workspace.openTextDocument(sourcePath).then(doc => {
            vscode.window.showTextDocument(doc);
         });
    } else {
        vscode.window.showErrorMessage(`Source file not found for this GenStat output file!`);
    }
}

async function showGenStatOutput(fileName: string): Promise<void> {
    const basename = path.basename(fileName);
    let uri = vscode.Uri.parse(`genstatOutput:${basename}`);
    let doc = await vscode.workspace.openTextDocument(uri);
    const unique = (value, index, self) => { return self.indexOf(value) === index; }
    let viewColumns = vscode.window.visibleTextEditors.map(r => r.viewColumn).filter(unique);
    if (viewColumns.length > 1) {
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: ViewColumn.Beside, preserveFocus: false });
    } else {
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: viewColumns[0], preserveFocus: false });
    }
    genstatOutputContentProvider.onDidChangeEmitter.fire(uri);
}

function execPromise(command) {
    return new Promise(function(resolve, reject) {
        cp.exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}
