import { PluginSettingTab, Setting, App } from 'obsidian';
import type ImageToBase64Plugin from './main';

export interface ImageToBase64Settings {
    convertOnPaste: boolean;
    appendNewLineAfterPaste: boolean;
}

export const DEFAULT_SETTINGS: ImageToBase64Settings = {
    convertOnPaste: false,
    appendNewLineAfterPaste: true,
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
            .setName('Append new line after paste')
            .setDesc('Prevent immediate expansion of base64 link by appending a new line after the image is pasted.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.appendNewLineAfterPaste)
                .onChange(async (value) => {
                    this.plugin.settings.appendNewLineAfterPaste = value;
                    await this.plugin.saveSettings();
                }));
    }
}
