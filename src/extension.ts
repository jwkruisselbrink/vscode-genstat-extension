import * as vscode from 'vscode';
import * as path from "path";
const cp = require('child_process');
const fs = require('fs');

import { ViewColumn } from 'vscode';
import { VscodeSettings } from "./vscodeSettings";
import { GenStatOutputChannel } from "./outputChannel";
import { OutputContentProvider } from './outputContentProvider';
import { genstatKeywords } from './genstatKeywords';

const status: any = {};

// method called when the extension is activated
// the extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const myScheme = 'genstatOutput';
	const myOutputContentProvider = new OutputContentProvider();

	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider(myScheme, myOutputContentProvider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('genstat.runGenStat', () => runGenStat())
	);

	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand('genstat.openHelp', async () => {
			openGenStatHelp();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand('genstat.openGenStatOutput', async () => {
			openGenStatOutput();
		})
	);
}

// method called when the extension is deactivated
export function deactivate() { }

async function openGenStatHelp(): Promise<void> {
	const activeTextEditor = vscode.window.activeTextEditor;
	let position = activeTextEditor.selection.start;
	let wordRange = activeTextEditor.document.getWordRangeAtPosition(position);
	let word = wordRange ? activeTextEditor.document.getText(wordRange) : '';
	let lineText = activeTextEditor.document.lineAt(position.line).text;
	let lineTillCurrentPosition = lineText.substr(0, wordRange.start.character);

	let topic = "";
	let wordPart = word.substr(0,4);
	if (/^\s*$/.test(lineTillCurrentPosition)) {
		var keywords = genstatKeywords.filter(r => r.substr(0,4) === wordPart);
		if (keywords.length > 0) {
			topic = keywords[0].substr(0, 8);
		}
	}

	const pathGenHelp = `C:/Program Files/Gen19Ed/Doc/Genstat.chm`;
	let cmd = "";
	if (!topic) {
		cmd = `hh.exe ${pathGenHelp}`;
	} else {
		cmd = `hh.exe ${pathGenHelp}::/html/server/${topic}.htm`;
	}
	return cp.execSync(cmd);
}

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

async function showGenStatOutput(fileName): Promise<void> {
	const basename = path.basename(fileName);
	let uri = vscode.Uri.parse(`genstatOutput:${basename}`);
	let doc = await vscode.workspace.openTextDocument(uri);
	await vscode.window.showTextDocument(doc, { preview: false, viewColumn: ViewColumn.Beside, preserveFocus: true });
}

async function openGenStatOutput(): Promise<void> {
	const activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor) {
		vscode.window.showInformationMessage(`Error: no GenStat file in active editor window!`);
		delete status.compile;
		return;
	}

	const wad = activeTextEditor.document;
	GenStatOutputChannel.start(`Running GenStat file ${wad.fileName}`);

	const basename = path.basename(wad.fileName);

	let uri = vscode.Uri.parse(`genstatOutput:${basename}`);
	let doc = await vscode.workspace.openTextDocument(uri);
	await vscode.window.showTextDocument(doc, { preview: false });
}
