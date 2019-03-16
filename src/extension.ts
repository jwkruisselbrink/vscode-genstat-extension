import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from "path";
const cp = require('child_process');

import { ViewColumn } from 'vscode';
import { VscodeSettings } from "./vscodeSettings";
import { GenStatOutputChannel } from "./outputChannel";
import { outputContentProvider } from './outputContentProvider';

const status: any = {};

// method called when the extension is activated
// the extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const myScheme = 'genstatOutput';
	const myOutputContentProvider = new outputContentProvider();

	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider(myScheme, myOutputContentProvider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('genstat.runGenStat', () => runGenStat())
	);

	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand('genstat.openHelp', () => openGenStatHelp())
	);
}

// method called when the extension is deactivated
export function deactivate() { }

async function openGenStatHelp(): Promise<void> {
	const pathGenHelp = `C:/Program Files/Gen19Ed/Doc/Genstat.chm`;
	const topic = "ACONFIDE";
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
		GenStatOutputChannel.start(`Running GenStat file ${wad.fileName}`);

		try {
			await wad.save();
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Window,
				title: "Running GenStat...",
			}, async () => {
				const inPath = wad.fileName;
				const basename = path.basename(inPath, path.extname(inPath));
				const outPath = path.join(path.dirname(inPath), basename + ".lis");
				const cmd = `"${pathGenBatch}" IN="${inPath}" "${outPath}"`;
				cp.execSync(cmd);
				const doc = await vscode.workspace.openTextDocument(outPath);
				await vscode.window.showTextDocument(doc, (activeTextEditor.viewColumn as ViewColumn) + 1, true);
			});
			GenStatOutputChannel.end(`Run GenStat complete!`);
		} catch (ex) {
			GenStatOutputChannel.error(`Run GenStat failed: ${ex.message}!`);
		}

		delete status.compile;
	}
}
