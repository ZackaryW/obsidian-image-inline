import {
	Plugin,
} from "obsidian";
import {
    ImageToBase64Settings,
    DEFAULT_SETTINGS,
    ImageToBase64SettingTab,
} from "./settings";
import { registerAllCommands } from "./coms/__init__";


export default class ImageToBase64Plugin extends Plugin {
    settings : ImageToBase64Settings

    async onload(): Promise<void> {
        await this.loadSettings();
        this.addSettingTab(new ImageToBase64SettingTab(this.app, this));
        await registerAllCommands(this);
    }

    async loadSettings() {
        
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

    async saveSettings() {
		await this.saveData(this.settings);
	}


}
