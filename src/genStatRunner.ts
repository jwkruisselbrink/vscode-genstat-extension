import * as cp from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from "path";

import { VscodeSettings } from "./vscodeSettings";

export class GenStatRunner {

    private _isRunning: boolean = false;

    constructor() {
    }

    public get isRunning(): boolean {
        return this._isRunning;
    }

    public async runGenStat(fileIn, fileOut): Promise<void> {
        let pathGenBatch = this.getPathGenBatch();
        if (!this._isRunning) {
            try {
                this._isRunning = true;
                let workingDirectory = path.dirname(fileIn);
                const cmd = `"${pathGenBatch}" IN="${fileIn}" ${fileOut} /D="${workingDirectory}"`;
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: "Running GenStat...",
                }, async () => {
                    await this.execPromise(cmd);
                });
            } catch (error) {
                throw error;
            } finally {
                this._isRunning = false;
            }
        }
    }

    private getPathGenBatch(): string {
        const pathGenBatch = VscodeSettings.getInstance().pathGenBatch;
        if (!pathGenBatch) {
            throw new Error(`Error: GenBatch path not specified!`);
        } else if (!fs.existsSync(pathGenBatch)) {
            throw new Error(`Error: Cannot find GenBatch.exe at ${pathGenBatch}!`);
        }
        return pathGenBatch;
    }

    private execPromise(command) {
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
}
