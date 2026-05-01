import { App, Modal, Notice, Plugin, TFile } from "obsidian";

const EXPORT_DEBUG_PREFIX = "[image-inline:export-images]";

/**
 * Writes a scoped debug message to the Obsidian developer console.
 */
function logExportDebug(message: string, details?: unknown): void {
    if (details === undefined) {
        console.debug(EXPORT_DEBUG_PREFIX, message);
        return;
    }

    console.debug(EXPORT_DEBUG_PREFIX, message, details);
}

/**
 * Writes a scoped warning message to the Obsidian developer console.
 */
function logExportWarning(message: string, details?: unknown): void {
    if (details === undefined) {
        console.warn(EXPORT_DEBUG_PREFIX, message);
        return;
    }

    console.warn(EXPORT_DEBUG_PREFIX, message, details);
}

/**
 * Writes a scoped error message to the Obsidian developer console.
 */
function logExportError(message: string, details?: unknown): void {
    if (details === undefined) {
        console.error(EXPORT_DEBUG_PREFIX, message);
        return;
    }

    console.error(EXPORT_DEBUG_PREFIX, message, details);
}

/**
 * Drives batch export of inline and linked note images into vault attachments.
 */
class ExportImagesModal extends Modal {
    private plugin: Plugin;
    private conversionScope: 'note' | 'folder' | 'vault';

    /**
     * Stores the plugin reference and default export scope for the modal session.
     */
    constructor(app: App, plugin: Plugin) {
        super(app);
        this.plugin = plugin;
        this.conversionScope = 'note';
    }

    /**
     * Builds the modal UI for choosing which notes should be exported.
     */
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

    /**
     * Exports inline and linked images from the selected note scope into attachments.
     */
    async exportImages() {
        const files = await this.getFilesInScope();
        let exportedCount = 0;
        let skippedCount = 0;

        logExportDebug('Starting image export', {
            scope: this.conversionScope,
            fileCount: files.length,
        });

        for (const file of files) {
            const content = await this.app.vault.read(file);
            
            // Find base64 images
            const base64Regex = /!\[.*?\]\(data:image\/[^;]+;base64,([^)]+)\)/g;
            
            // Find image embeds
            const imageRegex = /!\[\[([^\]]+\.(png|jpg|jpeg))\]\]/g;
            let base64Match: RegExpExecArray | null;
            let imageMatch: RegExpExecArray | null;

            // Process base64 images
            while ((base64Match = base64Regex.exec(content)) !== null) {
                try {
                    const base64Data = base64Match[1];
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
                            logExportDebug('Skipped exporting base64 image because a matching attachment already exists', {
                                note: file.path,
                                targetPath,
                            });
                            continue;
                        }
                    }
                    
                    await this.app.vault.createBinary(targetPath, array.buffer);
                    exportedCount++;
                    logExportDebug('Exported inline base64 image to attachment', {
                        note: file.path,
                        targetPath,
                    });
                } catch (error) {
                    logExportError('Failed to export inline base64 image', {
                        note: file.path,
                        error,
                    });
                }
            }

            // Process image embeds
            while ((imageMatch = imageRegex.exec(content)) !== null) {
                try {
                    const imagePath = imageMatch[1];
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
                                logExportDebug('Skipped exporting linked image because a matching attachment already exists', {
                                    note: file.path,
                                    sourceImage: imageFile.path,
                                    targetPath,
                                });
                                continue;
                            }
                        }

                        await this.app.vault.createBinary(targetPath, arrayBuffer);
                        exportedCount++;
                        logExportDebug('Exported linked image to attachment', {
                            note: file.path,
                            sourceImage: imageFile.path,
                            targetPath,
                        });
                    } else {
                        logExportWarning('Skipped linked image export because the embed target could not be resolved', {
                            note: file.path,
                            imagePath,
                        });
                    }
                } catch (error) {
                    logExportError('Failed to export linked image embed', {
                        note: file.path,
                        error,
                    });
                }
            }
        }

        logExportDebug('Completed image export', {
            scope: this.conversionScope,
            exportedCount,
            skippedCount,
            totalFiles: files.length,
        });

        if (exportedCount > 0 || skippedCount > 0) {
            new Notice(`Exported ${exportedCount} images, skipped ${skippedCount} duplicates`);
        } else {
            new Notice('No images found to export');
        }
    }

    /**
     * Collects markdown files for the currently selected export scope.
     */
    async getFilesInScope(): Promise<TFile[]> {
        switch (this.conversionScope) {
            case 'note':
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    logExportWarning('No active file was available for note-scoped export');
                    return [];
                }

                return [activeFile];
            
            case 'folder':
                const currentFile = this.app.workspace.getActiveFile();
                if (!currentFile?.parent) {
                    logExportWarning('No active folder was available for folder-scoped export');
                    return [];
                }

                return this.app.vault.getMarkdownFiles().filter(f => f.parent === currentFile.parent);
            
            case 'vault':
                return this.app.vault.getMarkdownFiles();
            
            default:
                return [];
        }
    }

    /**
     * Clears modal contents after the export dialog closes.
     */
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Registers the batch image export command in the command palette.
 */
export function registerExportCommand(plugin: Plugin) {
    plugin.addCommand({
        id: 'export-images',
        name: 'Export Images',
        callback: () => {
            new ExportImagesModal(plugin.app, plugin).open();
        }
    });
}