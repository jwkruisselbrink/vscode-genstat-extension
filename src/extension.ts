import * as vscode from 'vscode';
import * as path from "path";
import * as fs from 'fs';
import * as ncp from 'copy-paste';

import { ViewColumn } from 'vscode';
import { OutputContentProvider } from './outputContentProvider';
import { GenStatHelpProvider as GenStatHelpProvider } from './genStatHelpProvider';
import { GenStatRunner } from './genStatRunner';
import { GenStatOutputChannel } from './outputChannel';

let genStatHelpProvider: GenStatHelpProvider;
let genstatOutputContentProvider: OutputContentProvider;
let genStatRunner: GenStatRunner;

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    genstatOutputContentProvider = new OutputContentProvider();
    genStatHelpProvider = new GenStatHelpProvider();
    genStatRunner = new GenStatRunner();
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

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
            switchSourceAndOutput();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('genstat.openHelp', () => {
            genStatHelpProvider.openGenStatHelpAtCurrentLocation();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('genstat.copyTable', () => {
            copyTable();
        })
    );
}

// method called when the extension is deactivated
export function deactivate() { }

async function runGenStat(): Promise<void> {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
        vscode.window.showInformationMessage(`Error: no GenStat file in active editor window!`);
        return;
    }

    const wad = activeTextEditor.document;
    const filePath = wad.fileName;
    await wad.save();

    const basename = path.basename(filePath, path.extname(filePath));
    const outPath = path.join(path.dirname(filePath), basename + ".lis");

    GenStatOutputChannel.start(`Running GenStat file "${filePath}"`);
    if (genStatRunner.isRunning()) {
        let msg = `GenStat still running, cannot start another task.`;
        GenStatOutputChannel.error(msg);
        vscode.window.showErrorMessage(msg);
        return;
    }

    let timerStart = Date.now();
    vscode.window
        .withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Running GenStat file "${path.basename(filePath)}"`,
            cancellable: true
        }, (progress, token) => {
            statusBarItem.text = `Running GenStat...`;
            statusBarItem.show();
            token.onCancellationRequested(() => {
                genStatRunner.abortRun();
            });
            return genStatRunner.runGenStat(filePath, outPath);
        })
        .then(
            () => {
                statusBarItem.hide();
                let timerStop = Date.now();
                let msg = `GenStat run completed! Duration: ${msToHMS(timerStop - timerStart)}.`;
                GenStatOutputChannel.end(msg);
                vscode.window.showInformationMessage(msg);
                if (fs.existsSync(outPath)) {
                    showGenStatOutput(outPath);
                }
            },
            (error) => {
                statusBarItem.hide();
                GenStatOutputChannel.error(error);
                vscode.window.showErrorMessage(error);
                if (fs.existsSync(outPath)) {
                    showGenStatOutput(outPath);
                }
            }
        );
}

async function switchSourceAndOutput(): Promise<void> {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
        return;
    }
    const wad = activeTextEditor.document;

    let currentIsOutput = path.extname(wad.fileName) === '.lis';
    const basename = path.basename(wad.fileName, path.extname(wad.fileName));

    const switchToFilePath = path.join(path.dirname(wad.fileName), basename + (currentIsOutput ? ".gen" : ".lis"));
    let switchToFileBase = path.basename(switchToFilePath);
    let sourceDoc = vscode.workspace.textDocuments.find(doc => path.parse(doc.fileName).base === switchToFileBase);
    if (sourceDoc !== null && sourceDoc !== undefined) {
        let sourceTextEditor = vscode.window.visibleTextEditors.find(r => r.document === sourceDoc);
        if (sourceTextEditor === undefined) {
            await vscode.window.showTextDocument(sourceDoc, { preview: true, viewColumn: activeTextEditor.viewColumn, preserveFocus: false });
        } else {
            await vscode.window.showTextDocument(sourceDoc, { preview: true, viewColumn: sourceTextEditor.viewColumn, preserveFocus: false });
        }
    } else if (fs.existsSync(switchToFilePath)) {
        vscode.workspace.openTextDocument(switchToFilePath).then(doc => {
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
    const unique = (value, index, self) => { return self.indexOf(value) === index; };
    let viewColumns = vscode.window.visibleTextEditors.map(r => r.viewColumn).filter(unique);
    if (viewColumns.length > 1) {
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: ViewColumn.Beside, preserveFocus: false });
    } else {
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: viewColumns[0], preserveFocus: false });
    }
    genstatOutputContentProvider.onDidChangeEmitter.fire(uri);
}

function copyTable(): void {
    // Get the active text editor
    let editor = vscode.window.activeTextEditor;
    if (editor) {
        let document = editor.document;
        let selection = editor.selection;
        let word = document.getText(selection);

        let lines = word
            .split(/\r?\n/)
            .map(line => {
                return line.trimLeft().replace(/  +/g, ';');
            })
            .join("\n");

        ncp.copy(lines, function () {
            let msg = "Copied semicolon delimited string to clipboard!";
            vscode.window.showInformationMessage(msg);
        });
    }
}

function msToHMS(ms : number): string {
    let seconds = ms / 1000;
    let hours = Math.trunc(seconds / 3600);
    seconds = seconds % 3600;
    let minutes = Math.trunc(seconds / 60);
    seconds = seconds % 60;
    return hours + ":" + minutes + ":" + seconds;
}
