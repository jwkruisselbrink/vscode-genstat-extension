import * as vscode from 'vscode';
import { biometrisKeywords } from "./biometrisKeywords";
import { genstatKeywords } from "./genstatKeywords";
import { VscodeSettings } from "./vscodeSettings";

const cp = require('child_process');
export class GenStatHelpProvider {

    private _keyWordMap: Map<string, string>;
    private _helpChildProcess: any;
    private _pathGenStatChm: string;

    constructor() {
        this._pathGenStatChm = VscodeSettings.getInstance().pathGenBatch.replace("Bin/GenBatch.exe", "Doc/Genstat.chm");
    }

    public get KeywordMap(): Map<string, string> {
        if (!this._keyWordMap) {
            let map = new Map<string, string>();
            genstatKeywords.forEach(r => map.set(r.substr(0,4), r));
            biometrisKeywords.forEach(r => map.set(r.substr(0,4), r));
            this._keyWordMap = map;
        }
        return this._keyWordMap;
    }

    public tryFindKeyword(str: string) {
        let upper = str.toUpperCase();
        if (this.KeywordMap.has(upper)) {
            return this.KeywordMap.get(upper);
        }
        return null;
    }

    public openGenStatHelp(): void {
        const activeTextEditor = vscode.window.activeTextEditor;
        let position = activeTextEditor.selection.start;
        let lineText = activeTextEditor.document.lineAt(position.line).text.trim();

        let keyword = "";
        let matchFirstWord = lineText.match(/^(\S+)(\s*)(.*)/);
        if (matchFirstWord) {
            keyword = matchFirstWord.slice(1)[0];
        }
        if (keyword.length > 8) {
            keyword = keyword.substr(0,8);
        }

        let cmd = "hh.exe";
        let args = [];
        if (!keyword) {
            args = [`${this._pathGenStatChm}`];
        } else {
            args = [`${this._pathGenStatChm}::/html/server/${keyword}.htm`];
        }

        if (this._helpChildProcess) {
            this._helpChildProcess.kill('SIGKILL');
        }

        this._helpChildProcess = cp.spawn(cmd, args);
        this._helpChildProcess.on('exit', function (code, signal) {
            this._helpChildProcess = null;
        });
    }
}
