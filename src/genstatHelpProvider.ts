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
        let upper = str.substr(0,4).toUpperCase();
        if (this.KeywordMap.has(upper)) {
            return this.KeywordMap.get(upper);
        }
        return null;
    }

    public openGenStatHelpAtCurrentLocation(): void {
        const activeTextEditor = vscode.window.activeTextEditor;
        let position = activeTextEditor.selection.start;

        let line = position.line;
        while (line > 0 && activeTextEditor.document.lineAt(line - 1).text.indexOf('\\') >= 0) {
            line = line -1;
        }
        let lineText = activeTextEditor.document.lineAt(line).text.trim();

        let matchFirstWord = lineText.match(/^(\S+)(\s*)(.*)/);
        let matchedWord = "";
        if (matchFirstWord) {
            matchedWord = matchFirstWord.slice(1)[0];
        } else {
            vscode.window.showErrorMessage(`No keyword found!`);
            return;
        }
        let keyword = matchedWord;

        keyword = this.tryFindKeyword(keyword);
        if (!keyword || keyword.length === 0) {
            vscode.window.showErrorMessage(`Unknown keyword ${matchedWord}!`);
            return;
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
