import * as vscode from "vscode";
import * as path from "path";

const configKeys = {
    GENSTAT_PATH: "vsgenstat.path.genbatch",
    GENSTAT_HELP_PATH: "vsgenstat.path.genstat.help",
    BIOMETRIS_HELP_PATH: "vsgenstat.path.biometris.help"
};

export interface IVscodeSettings {
    pathGenBatch: string;
    pathGenHelp: string;
    pathBiometrisHelp: string;
}

export class VscodeSettings implements IVscodeSettings {

    private static _instance: IVscodeSettings;

    public constructor() { }

    public static getInstance(): IVscodeSettings {
        if (!VscodeSettings._instance) {
            VscodeSettings._instance = new VscodeSettings();
        }
        return VscodeSettings._instance;
    }

    public get pathGenBatch(): string {
        return this.getConfigValue<string>(configKeys.GENSTAT_PATH);
    }

    private getConfigValue<T>(key: string): T {
        const workspaceConfig = vscode.workspace.getConfiguration();
        return workspaceConfig.get<T>(key) as T;
    }

    public get pathGenHelp(): string {
        let chmPath = this.getConfigValue<string>(configKeys.GENSTAT_HELP_PATH);
        if (!path.isAbsolute(chmPath)) {
            let pathGenStat = VscodeSettings.getInstance().pathGenBatch.replace("Bin/GenBatch.exe","");
            chmPath = path.normalize(path.join(pathGenStat, chmPath));
        }
        return chmPath;
    }

    public get pathBiometrisHelp(): string {
        let chmPath = this.getConfigValue<string>(configKeys.BIOMETRIS_HELP_PATH);
        if (!path.isAbsolute(chmPath)) {
            let pathGenStat = VscodeSettings.getInstance().pathGenBatch.replace("Bin/GenBatch.exe","");
            chmPath = path.normalize(path.join(pathGenStat, chmPath));
        }
        return chmPath;
    }

    private async setConfigValue(key: string, value: any, global: boolean = true) {
        const workspaceConfig = vscode.workspace.getConfiguration();
        await workspaceConfig.update(key, value, global);
    }
}
