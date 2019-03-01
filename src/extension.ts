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

			GenStatOutputChannel.show();
			GenStatOutputChannel.start(`Running GenStat file ${wad.fileName}`);

			try {
				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Window,
					title: "Running GenStat...",
				}, async (progress, token) => {
					token.onCancellationRequested(() => {
						console.log("User canceled the long running operation")
					});
					return await runGenStat(pathGenBatch, wad.fileName);
				});
				GenStatOutputChannel.end(`Run GenStat complete!`);
			} catch (ex) {
				GenStatOutputChannel.end(`Run GenStat failed: \n${ex.error}`);
			}

			delete status.compile;
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.createTerminal', () => {
		vscode.window.showInformationMessage('Hello World 2!');
	}));

}

// this method is called when the extension is deactivated
export function deactivate() {}

async function runGenStat(pathGenBatch: string, filename: string): Promise<void> {

	const extension = path.extname(filename);
	const basename = path.basename(filename, extension);
	const folder = path.dirname(filename);
	const target = path.join(folder, basename + "_cp" + extension);
	vscode.window.showInformationMessage(target);

	var canWriteToTarget = await ensureWritableFile(target);
	if (canWriteToTarget) {
		await fsx.copy(filename, target);
		openFileInEditor(target);
	}
}

async function getSourcePath(): Promise<string> {
	// Attempting to get the fileName from the activeTextEditor.
	// Works for text files only.
	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor && activeEditor.document && activeEditor.document.fileName) {
		return Promise.resolve(activeEditor.document.fileName);
	}
	throw new Error();
}

async function openFileInEditor(filename: string): Promise<TextEditor> {
	const isDir = fs.statSync(filename).isDirectory();
	if (isDir) {
		throw new Error('Could not open file!');
	}

	const textDocument = await vscode.workspace.openTextDocument(filename);
	if (!textDocument) {
		throw new Error('Could not open file!');
	}

	const editor = await vscode.window.showTextDocument(textDocument, ViewColumn.Active);
	if (!editor) {
		throw new Error('Could not show document!');
	}

	return editor;
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
