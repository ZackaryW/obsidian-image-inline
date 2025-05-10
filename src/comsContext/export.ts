import { App, Editor, Modal, Notice, Plugin, TFile } from "obsidian";

class ExportToVaultModal extends Modal {
    private filename: string;
    private buffer: ArrayBuffer;

    constructor(app: App, filename: string, buffer: ArrayBuffer) {
        super(app);
        this.filename = filename;
        this.buffer = buffer;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Export to Vault' });

        // Create form
        const form = contentEl.createEl('form');
        
        // Filename input
        const filenameContainer = form.createEl('div', { cls: 'setting-item' });
        filenameContainer.createEl('label', { text: 'Filename' });
        const filenameInput = filenameContainer.createEl('input', {
            type: 'text',
            value: this.filename
        });

        // Export button
        const buttonContainer = form.createEl('div', { cls: 'setting-item' });
        const exportButton = buttonContainer.createEl('button', {
            text: 'Save to Vault',
            cls: 'mod-cta'
        });

        // Handle export
        exportButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const filename = filenameInput.value || 'image.png';
            const activeFile = this.app.workspace.getActiveFile();
            
            if (activeFile) {
                const targetPath = await this.app.fileManager.getAvailablePathForAttachment(
                    filename,
                    activeFile.path
                );
                
                await this.app.vault.createBinary(
                    targetPath,
                    this.buffer
                ) as TFile;
                
                new Notice(`Image saved to ${targetPath}`);
            }
            
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export async function registerExportToLocal(plugin: Plugin) {
    plugin.registerEvent(
        plugin.app.workspace.on('editor-menu', (menu, editor) => {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            
            // Check if cursor is on a base64 image link
            const base64Regex = /!\[.*?\]\(data:image\/[^;]+;base64,[^)]+\)/;
            const isBase64Image = base64Regex.test(line);
            
            if (isBase64Image) {
                // Add Export to Vault option
                menu.addItem((item) => {
                    item
                        .setTitle("Export to Vault")
                        .setIcon("vault")
                        .onClick(async () => {
                            const base64Match = line.match(/data:image\/[^;]+;base64,([^)]+)/);
                            if (!base64Match) return;

                            const base64Data = base64Match[1];
                            const buffer = Buffer.from(base64Data, 'base64');
                            
                            new ExportToVaultModal(plugin.app, 'image.png', buffer).open();
                        });
                });
            }
        })
    );
}
