import * as vscode from 'vscode';
import * as path from "path";
import * as fs from 'fs';
import * as ncp from 'copy-paste';

import { ViewColumn } from 'vscode';
import { OutputContentProvider } from './outputContentProvider';
import { GenStatHelpProvider as GenStatHelpProvider } from './genStatHelpProvider';
import { GenStatRunner } from './genStatRunner';
import { GenStatOutputChannel } from './outputChannel';

const inputFileExtensions: string[] = ['.gen', '.Gen', '.gpi', '.Gpi'];
const outputFileExtensions: string[] = ['.Gout', '.gout', '.lis', '.Lis'];

let genStatHelpProvider: GenStatHelpProvider;
let genstatOutputContentProvider: OutputContentProvider;

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    genstatOutputContentProvider = new OutputContentProvider();
    genStatHelpProvider = new GenStatHelpProvider();
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
        vscode.window.showInformationMessage(`Error: no GenStat file in active editor window.`);
        return;
    }

    const wad = activeTextEditor.document;
    const filePath = wad.fileName;
    const viewColumn = vscode.window.activeTextEditor.viewColumn;
    await wad.save();

    let genStatRunner = new GenStatRunner();
    try {
        genStatRunner.getPathGenBatch();
    } catch (error) {
        let msg = error.message;
        GenStatOutputChannel.error(msg);
        vscode.window.showErrorMessage(msg);
        return;
    }

    const basename = path.basename(filePath, path.extname(filePath));
    const outPath = path.join(path.dirname(filePath), basename + ".Gout");

    if (genStatRunner.isRunning()) {
        let msg = `GenStat still running, cannot start another task.`;
        GenStatOutputChannel.error(msg);
        vscode.window.showErrorMessage(msg);
        return;
    }
    GenStatOutputChannel.start(`Running GenStat file "${filePath}".`);

    let timerStart = Date.now();
    vscode.window
        .withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Running GenStat file "${path.basename(filePath)}".`,
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
                    openOutputFile(outPath, viewColumn);
                }
            },
            (error) => {
                statusBarItem.hide();
                GenStatOutputChannel.error(error);
                vscode.window.showErrorMessage(error);
                if (fs.existsSync(outPath)) {
                    openOutputFile(outPath, viewColumn);
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
    let switchToFilePath = findSwitchFile(wad.fileName);
    let sourceDoc = vscode.workspace.textDocuments.find(doc => doc.fileName.toLowerCase() === switchToFilePath.toLowerCase());
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
        vscode.window.showErrorMessage(`Error: source file not found for this GenStat output file.`);
    }
}

function findSwitchFile(filename: string) {
    let fileExt = path.extname(filename);
    let switchExtensions = outputFileExtensions.some(r => r === fileExt) ? inputFileExtensions : outputFileExtensions;
    for (var ext of switchExtensions) {
        let switchFile = path.join(path.dirname(filename), `${path.basename(filename, fileExt)}${ext}`);
        if (fs.existsSync(switchFile)) {
            return switchFile;
        }
    }
    return null; // not found!
}

async function showGenStatOutput(fileName: string, sourceViewColumn: ViewColumn): Promise<void> {
    const basename = path.basename(fileName);
    let uri = vscode.Uri.parse(`genstatOutput:${basename}`);
    let doc = await vscode.workspace.openTextDocument(uri);
    const unique = (value, index, self) => { return self.indexOf(value) === index; };
    let viewColumns = vscode.window.visibleTextEditors.map(r => r.viewColumn).filter(unique);
    if (viewColumns.length > 1) {
        let vc = viewColumns.some(r => r > sourceViewColumn) ? viewColumns.find(r => r > sourceViewColumn) : sourceViewColumn - 1;
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vc, preserveFocus: false });
    } else {
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: viewColumns[0], preserveFocus: false });
    }
    genstatOutputContentProvider.onDidChangeEmitter.fire(uri);
}

async function openOutputFile(fileName: string, sourceViewColumn: vscode.ViewColumn): Promise<void> {
    const unique = (value, index, self) => { return self.indexOf(value) === index; };
    let viewColumns = vscode.window.visibleTextEditors.map(r => r.viewColumn).filter(unique);
    if (viewColumns.length > 1) {
        let vc = viewColumns.some(r => r > sourceViewColumn) ? viewColumns.find(r => r > sourceViewColumn) : sourceViewColumn - 1;
        await vscode.workspace.openTextDocument(fileName).then(doc => {
            vscode.window.showTextDocument(doc, { preview: false, viewColumn: vc, preserveFocus: false });
        });
    } else {
        await vscode.workspace.openTextDocument(fileName).then(doc => {
            vscode.window.showTextDocument(doc, { preview: false, viewColumn: viewColumns[0], preserveFocus: false });
        });
    }
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
            let msg = "Copied semicolon delimited string to clipboard.";
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
