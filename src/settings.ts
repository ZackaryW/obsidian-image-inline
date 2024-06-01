import { PluginSettingTab, Setting, App } from 'obsidian';
import type ImageToBase64Plugin from './main';

export interface ImageToBase64Settings {
    convertOnPaste: boolean;
    convertOnDrop: boolean;
}

export const DEFAULT_SETTINGS: ImageToBase64Settings = {
    convertOnPaste: false,
    convertOnDrop: true
};

export class ImageToBase64SettingTab extends PluginSettingTab {
    plugin: ImageToBase64Plugin;

    constructor(app: App, plugin: ImageToBase64Plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        new Setting(containerEl)
            .setName('Convert images on paste')
            .setDesc('Automatically convert pasted images to base64 strings.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.convertOnPaste)
                .onChange(async (value) => {
                    this.plugin.settings.convertOnPaste = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName("Convert images on drop")
            .setDesc("Automatically convert dropped images to base64 strings.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.convertOnDrop)
                .onChange(async (value) => {
                    this.plugin.settings.convertOnDrop = value;
                    await this.plugin.saveSettings();
                }));
    }
}
