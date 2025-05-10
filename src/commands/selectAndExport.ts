import { App, Modal, Notice, Plugin, TFile } from "obsidian";

class ExportImagesModal extends Modal {
    private plugin: Plugin;
    private conversionScope: 'note' | 'folder' | 'vault';

    constructor(app: App, plugin: Plugin) {
        super(app);
        this.plugin = plugin;
        this.conversionScope = 'note';
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Export Images' });

        // Scope selection
        const scopeContainer = contentEl.createEl('div', { cls: 'setting-item' });
        scopeContainer.createEl('label', { text: 'Scope' });
        const scopeSelect = scopeContainer.createEl('select');
        
        const scopes = [
            { value: 'note', text: 'Current Note' },
            { value: 'folder', text: 'Current Folder' },
            { value: 'vault', text: 'Entire Vault' }
        ];

        scopes.forEach(scope => {
            scopeSelect.createEl('option', {
                value: scope.value,
                text: scope.text
            });
        });

        // Export button
        const buttonContainer = contentEl.createEl('div', { cls: 'setting-item' });
        const exportButton = buttonContainer.createEl('button', {
            text: 'Export',
            cls: 'mod-cta'
        });

        exportButton.addEventListener('click', async () => {
            this.conversionScope = scopeSelect.value as 'note' | 'folder' | 'vault';
            await this.exportImages();
            this.close();
        });
    }

    async exportImages() {
        const files = await this.getFilesInScope();
        console.log('Files in scope:', files.length);
        let exportedCount = 0;
        let skippedCount = 0;

        for (const file of files) {
            const content = await this.app.vault.read(file);
            
            // Find base64 images
            const base64Regex = /!\[.*?\]\(data:image\/[^;]+;base64,([^)]+)\)/g;
            const base64Matches = Array.from(content.matchAll(base64Regex));
            
            // Find image embeds
            const imageRegex = /!\[\[([^\]]+\.(png|jpg|jpeg))\]\]/g;
            const imageMatches = Array.from(content.matchAll(imageRegex));

            // Process base64 images
            for (const match of base64Matches) {
                try {
                    const base64Data = match[1];
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const filename = `base64_image_${timestamp}_${exportedCount}.png`;
                    
                    // Convert base64 to binary
                    const binary = atob(base64Data);
                    const array = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        array[i] = binary.charCodeAt(i);
                    }

                    const targetPath = await this.app.fileManager.getAvailablePathForAttachment(
                        filename,
                        file.path
                    );

                    // Check if file exists and has same size
                    const existingFile = this.app.vault.getAbstractFileByPath(targetPath);
                    if (existingFile instanceof TFile) {
                        const existingSize = (await this.app.vault.readBinary(existingFile)).byteLength;
                        if (existingSize === array.buffer.byteLength) {
                            skippedCount++;
                            continue;
                        }
                    }
                    
                    await this.app.vault.createBinary(targetPath, array.buffer);
                    exportedCount++;
                } catch (error) {
                    console.error('Error processing base64 image:', error);
                }
            }

            // Process image embeds
            for (const match of imageMatches) {
                try {
                    const imagePath = match[1];
                    const imageFile = this.app.metadataCache.getFirstLinkpathDest(imagePath, file.path);
                    
                    if (imageFile instanceof TFile) {
                        const arrayBuffer = await this.app.vault.readBinary(imageFile);
                        const targetPath = await this.app.fileManager.getAvailablePathForAttachment(
                            imageFile.name,
                            file.path
                        );

                        // Check if file exists and has same size
                        const existingFile = this.app.vault.getAbstractFileByPath(targetPath);
                        if (existingFile instanceof TFile) {
                            const existingSize = (await this.app.vault.readBinary(existingFile)).byteLength;
                            if (existingSize === arrayBuffer.byteLength) {
                                skippedCount++;
                                continue;
                            }
                        }

                        await this.app.vault.createBinary(targetPath, arrayBuffer);
                        exportedCount++;
                    }
                } catch (error) {
                    console.error('Error processing image embed:', error);
                }
            }
        }

        if (exportedCount > 0 || skippedCount > 0) {
            new Notice(`Exported ${exportedCount} images, skipped ${skippedCount} duplicates`);
        } else {
            new Notice('No images found to export');
        }
    }

    async getFilesInScope(): Promise<TFile[]> {
        switch (this.conversionScope) {
            case 'note':
                const activeFile = this.app.workspace.getActiveFile();
                return activeFile ? [activeFile] : [];
            
            case 'folder':
                const currentFile = this.app.workspace.getActiveFile();
                if (!currentFile?.parent) return [];
                return this.app.vault.getMarkdownFiles().filter(f => f.parent === currentFile.parent);
            
            case 'vault':
                return this.app.vault.getMarkdownFiles();
            
            default:
                return [];
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export function registerExportCommand(plugin: Plugin) {
    plugin.addCommand({
        id: 'export-images',
        name: 'Export Images',
        callback: () => {
            new ExportImagesModal(plugin.app, plugin).open();
        }
    });
}