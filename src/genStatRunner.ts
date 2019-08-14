import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as tk from 'tree-kill';

import { VscodeSettings } from "./vscodeSettings";

export class GenStatRunner {

    private _genBatchHook: any;
    private _isRunning: boolean = false;
    private _isAborted: boolean = false;

    constructor() {
    }

    public isRunning(): boolean {
        return this._isRunning;
    }

    public runGenStat(fileIn: string, fileOut: string): Promise<void> {
        if (this._isRunning) {
            throw new Error(`GenStat still running, cannot start another task!`);
        }
        let lineLengthGen = VscodeSettings.getInstance().lineLengthGen;
        let lineLengthLis = VscodeSettings.getInstance().lineLengthLis;
        this._isRunning = true;
        this._isAborted = false;
        let pathGenBatch = this.getPathGenBatch();
        let workingDirectory = path.dirname(fileIn);
        this.clearOutputFile(fileOut);
        const cmd = `"${pathGenBatch}"`;
        const args = [
            `IN="${fileIn}"/${lineLengthGen}`,
            `"${fileOut}"/${lineLengthLis}`,
            `/d="${workingDirectory}"`
        ];
        let execCmd = `${cmd} ${args.join(" ")}`;
        return new Promise<any>((resolve, reject) => {
            this._genBatchHook = cp.exec(execCmd, (error, stdout, stderr) => {
                this._genBatchHook = null;
                this._isRunning = false;
                if (this._isAborted) {
                    return reject(`GenStat run cancelled`);
                }
                if (error) {
                    return reject(`GenStat run failed (error code ${error.code}).`);
                }
                if (stderr) {
                    return reject(`GenStat run failed (error code ${error.code}).`);
                }
                resolve(stdout);
            });
          });
    }

    public abortRun() {
        if (this._isRunning) {
            if (this._genBatchHook) {
                // Sending the kill signal does not work, apparently
                //this._genBatchHook.kill('SIGTERM');
                tk(this._genBatchHook.pid);
                this._isAborted = true;
            }
        }
    }

    private clearOutputFile(fileOut: string) {
        if (fs.existsSync(fileOut)) {
            fs.writeFileSync(fileOut, '');
        }
    }

    public getPathGenBatch(): string {
        const pathGenBatch = VscodeSettings.getInstance().pathGenBatch;
        if (!pathGenBatch) {
            throw new Error(`Error: GenBatch path not specified!`);
        } else if (!fs.existsSync(pathGenBatch)) {
            throw new Error(`Error: Cannot find GenBatch.exe at ${pathGenBatch}!`);
        }
        return pathGenBatch;
    }
}
