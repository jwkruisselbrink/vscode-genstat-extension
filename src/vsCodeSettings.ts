import * as vscode from "vscode";

const configKeys = {
    GENSTAT_PATH: "path.genbatch",
};

export interface IVscodeSettings {
    pathGenBatch: string;
}

export class VscodeSettings implements IVscodeSettings {

    private static _instance: IVscodeSettings;

    private constructor() {
    }

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

    private async setConfigValue(key: string, value: any, global: boolean = true) {
        const workspaceConfig = vscode.workspace.getConfiguration();
        await workspaceConfig.update(key, value, global);
    }
}
