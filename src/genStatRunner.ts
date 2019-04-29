import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from "path";

import { VscodeSettings } from "./vscodeSettings";

export class GenStatRunner {

    private _genBatchHook: any;
    private _isRunning: boolean = false;

    constructor() {
    }

    public isRunning(): boolean {
        return this._isRunning;
    }

    public runGenStat(fileIn, fileOut): Promise<void> {
        if (this._isRunning) {
            throw new Error(`GenStat still running, cannot start another task!`);
        }
        this._isRunning = true;
        let pathGenBatch = this.getPathGenBatch();
        let workingDirectory = path.dirname(fileIn);
        this.clearOutputFile(fileOut);
        const cmd = `${pathGenBatch}`;
        const args = [`IN=${fileIn}`, `${fileOut}`];
        this._genBatchHook = cp.spawn(cmd, args, {cwd: workingDirectory});
        return this.promiseFromChildProcess(this._genBatchHook)
            .then(
                (code: any) => {
                    this._genBatchHook = null;
                    this._isRunning = false;
                    if (code === null) {
                        throw new Error("GenStat run aborted!");
                    }
                },
                (err) => {
                    this._genBatchHook = null;
                    this._isRunning = false;
                    throw err;
                }
            );
    }

    public abortRun() {
        if (this._isRunning) {
            if (this._genBatchHook) {
                this._genBatchHook.kill('SIGKILL');
            }
        }
    }

    private promiseFromChildProcess(child : cp.ChildProcess): Promise<void> {
        return new Promise((resolve, reject) => {
            child.addListener("error", reject);
            child.addListener("exit", resolve);
        });
    }

    private clearOutputFile(fileOut: string) {
        if (fs.existsSync(fileOut)) {
            fs.writeFileSync(fileOut, '');
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
}
