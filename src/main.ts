import { App, Plugin, PluginSettingTab, Setting, Notice, MarkdownView, Editor } from 'obsidian';
import { convertImageFileToBase64 } from './utils';

interface ImageToBase64Settings {
    convertOnPaste: boolean;
    convertOnHotkey: boolean;
}

const DEFAULT_SETTINGS: ImageToBase64Settings = {
    convertOnPaste: false,
    convertOnHotkey: false
};

export default class ImageToBase64Plugin extends Plugin {
    settings: ImageToBase64Settings;

    async onload() {
        await this.loadSettings();

        // Add settings tab
        this.addSettingTab(new ImageToBase64SettingTab(this.app, this));

        // Add command for conversion on hotkey
        this.addCommand({
            id: 'convert-image-to-base64-hotkey',
            name: 'Convert Image to Base64 (Hotkey)',
            hotkeys: [{ modifiers: ["Ctrl", "Alt"], key: "v" }],
            callback: () => this.convertImageToBase64(),
        });

        // Event listener for paste actions
        this.registerEvent(this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor) => {
            if (this.settings.convertOnPaste && evt.clipboardData) {
                const items = Array.from(evt.clipboardData.items);
                for (const item of items) {
                    if (item.type.startsWith('image')) {
                        evt.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                            try {
                                const base64String = await convertImageFileToBase64(file);
                                editor.replaceSelection(`![](${base64String})`);
                                console.log('Pasted image converted to base64!');
                            } catch (error) {
                                console.error('Error converting image to base64:', error);
                            }
                            break;
                        }
                    }
                }
            }
        }));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async convertImageToBase64() {
        // Logic to convert an image to base64
        new Notice('Image converted to base64!');
    }
}

class ImageToBase64SettingTab extends PluginSettingTab {
    plugin: ImageToBase64Plugin;

    constructor(app: App, plugin: ImageToBase64Plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: 'Settings for Image to Base64 Plugin' });

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
            .setName('Convert images with hotkey (Ctrl+Alt+V)')
            .setDesc('Use a hotkey to convert pasted images to base64 strings.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.convertOnHotkey)
                .onChange(async (value) => {
                    this.plugin.settings.convertOnHotkey = value;
                    await this.plugin.saveSettings();
                }));
    }
}