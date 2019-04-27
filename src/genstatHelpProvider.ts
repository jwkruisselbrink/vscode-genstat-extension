import * as vscode from 'vscode';
import { biometrisKeywords } from "./biometrisKeywords";
import { genstatKeywords } from "./genstatKeywords";
import { VscodeSettings } from "./vscodeSettings";

const cp = require('child_process');
export class GenStatHelpProvider {

    private _keyWordsMapGenStat: Map<string, string>;
    private _keyWordsMapBiometris: Map<string, string>;

    private _helpChildProcess: any;

    private _pathGenStatChm: string;
    private _pathBiometrisChm: string;

    constructor() {
        this._pathGenStatChm = VscodeSettings.getInstance().pathGenHelp;
        this._pathBiometrisChm = VscodeSettings.getInstance().pathBiometrisHelp;
    }

    public get KeywordsMapGenStat(): Map<string, string> {
        if (!this._keyWordsMapGenStat) {
            let map = new Map<string, string>();
            genstatKeywords.forEach(r => map.set(r.substr(0,4), r));
            this._keyWordsMapGenStat = map;
        }
        return this._keyWordsMapGenStat;
    }

    public get KeywordsMapBiometris(): Map<string, string> {
        if (!this._keyWordsMapBiometris) {
            let map = new Map<string, string>();
            biometrisKeywords.forEach(r => map.set(r.substr(0,4), r));
            this._keyWordsMapBiometris = map;
        }
        return this._keyWordsMapBiometris;
    }

    public tryFindKeywordGenStat(str: string) {
        let upper = str.substr(0,4).toUpperCase();
        if (this.KeywordsMapGenStat.has(upper)) {
            return this.KeywordsMapGenStat.get(upper);
        }
        return null;
    }

    public tryFindKeywordBiometris(str: string) {
        let upper = str.substr(0,4).toUpperCase();
        if (this.KeywordsMapBiometris.has(upper)) {
            return this.KeywordsMapBiometris.get(upper);
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

        let keyword = this.tryFindKeywordGenStat(matchedWord);
        let foundGenStatKeyword = keyword !== null && keyword.length > 0;
        if (foundGenStatKeyword) {
            if (keyword.length > 8) {
                keyword = keyword.substr(0,8);
            }
        } else {
            keyword = this.tryFindKeywordBiometris(matchedWord);
        }

        if (!keyword || keyword.length === 0) {
            vscode.window.showErrorMessage(`Unknown keyword ${matchedWord}!`);
            return;
        }

        let cmd = "hh.exe";
        let args = [];
        if (!keyword) {
            args = [`${this._pathGenStatChm}`];
        } else if (foundGenStatKeyword) {
            args = [`${this._pathGenStatChm}::/html/server/${keyword}.htm`];
        } else {
            args = [`${this._pathBiometrisChm}::${keyword}.htm`];
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
