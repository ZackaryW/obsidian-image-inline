
import { App, Plugin, PluginSettingTab, Setting, Editor, getBlobArrayBuffer, Notice} from 'obsidian';

interface ImageToBase64Settings {
    convertOnPaste: boolean;
    appendNewLineAfterPaste: boolean;
}

const DEFAULT_SETTINGS: ImageToBase64Settings = {
    convertOnPaste: false,
    appendNewLineAfterPaste: false,
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export default class ImageToBase64Plugin extends Plugin {
    settings: ImageToBase64Settings;

    async onload() {
        await this.loadSettings();

        // Add settings tab
        this.addSettingTab(new ImageToBase64SettingTab(this.app, this));

        // add command palatte
        this.addCommand({
            id: 'toggle-convert-on-paste',
            name: 'Enable/disable convert to base64 on paste',
            callback: () => {
                this.settings.convertOnPaste = !this.settings.convertOnPaste;
                this.saveSettings();
                new Notice(`Convert on paste is now ${this.settings.convertOnPaste ? 'enabled' : 'disabled'}`);
            }
        });

        // > this adds a manual paste command
        this.addCommand({
            id: 'paste-image-as-base64',
            name: 'Paste Image as Base64',
            editorCallback: async (editor: Editor) => {
              navigator.clipboard.read().then(async (items) => {

                for (const clipboardItem of items) {
                  for (const type of clipboardItem.types) {
                    if (!(type.indexOf("image") === 0)) {
                      continue;
                    }
                    const blob = await clipboardItem.getType(type);
                    const arrayBuffer = await new Response(blob).arrayBuffer();
                    const base64 = arrayBufferToBase64(arrayBuffer);
                    
                    // Determine where to insert the new line with the image
                    const cursor = editor.getCursor();
                    const imgMarkdown = `![](data:image/jpeg;base64,${base64})\n`;

                    // Insert the base64 image on a new line at the current cursor position
                    editor.replaceRange(imgMarkdown, cursor);
                    
                      
                    const newCursorPos = {
                        line: cursor.line,
                        ch: imgMarkdown.length
                    };

                    editor.setCursor(newCursorPos);

                  }
                }
              }).catch(err => {
                console.error("Failed to read clipboard contents: ", err);
                new Notice('Error accessing clipboard.');
              });

            }
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
                                const base64String = arrayBufferToBase64(await getBlobArrayBuffer(file));
                                editor.replaceSelection(`![](data:image/png;base64,${base64String})${this.settings.appendNewLineAfterPaste ? '\n' : ''}`);
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
        // Removed header with plugin name
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
