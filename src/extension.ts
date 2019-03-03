import * as vscode from 'vscode';
import * as fs from 'fs';
import * as fsx from 'fs-extra';
import * as path from "path";

import { VscodeSettings } from "./vscodeSettings";
import { GenStatOutputChannel } from "./outputChannel";
import { TextEditor, ViewColumn } from 'vscode';
import { FileItem } from './fileItem';

const status: any = {};

// method called when the extension is activated
// the extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('extension.runGenStat', async () => {
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
			wad.save();

			GenStatOutputChannel.start(`Running GenStat file ${wad.fileName}`);

			try {
				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Window,
					title: "Running GenStat...",
				}, async () => {
					await runGenStat(pathGenBatch, wad.fileName)
						.then(filename => vscode.workspace.openTextDocument(filename))
						.then(doc => vscode.window.showTextDocument(doc, (activeTextEditor.viewColumn as ViewColumn) + 1));
				});
				GenStatOutputChannel.end(`Run GenStat complete!`);
			} catch (ex) {
				GenStatOutputChannel.error(`Run GenStat failed: ${ex.message}!`);
			}

			delete status.compile;
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.createTerminal', () => {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			if (activeTextEditor.viewColumn) {
				vscode.window.showInformationMessage('Hello World 2!');
				return vscode.workspace.openTextDocument(activeTextEditor.document.fileName)
					.then(doc => vscode.window.showTextDocument(doc, (activeTextEditor.viewColumn as ViewColumn) + 1));
			}
		}
	}));

}

// method called when the extension is deactivated
export function deactivate() {}

async function runGenStat(pathGenBatch: string, filename: string): Promise<string> {
	const extension = path.extname(filename);
	const basename = path.basename(filename, extension);
	const folder = path.dirname(filename);
	const target = path.join(folder, basename + ".lis");
	if (await ensureWritableFile(target)) {
		await fsx.copy(filename, target);
		return target;
	} else {
		throw new Error(`Could not write to output file ${target}!`);
	}
}

async function ensureWritableFile(filename: string): Promise<boolean> {
	if (!fs.existsSync(filename)) {
		return true;
	}
	const message = `File '${filename}' already exists.`;
	const action = 'Overwrite';
	const overwrite = await vscode.window.showInformationMessage(message, { modal: true }, action);
	if (overwrite) {
		return true;
	}
	return false;
}
