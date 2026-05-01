import { App, Editor, Modal, Notice, Plugin, TFile } from "obsidian";
import { Base64File, createImageFile } from "../utils/conversion";

const CONVERT_DEBUG_PREFIX = "[image-inline:convert-images]";

/**
 * Writes a scoped debug message to the Obsidian developer console.
 */
function logConvertDebug(message: string, details?: unknown): void {
    if (details === undefined) {
        console.debug(CONVERT_DEBUG_PREFIX, message);
        return;
    }

    console.debug(CONVERT_DEBUG_PREFIX, message, details);
}

/**
 * Writes a scoped warning message to the Obsidian developer console.
 */
function logConvertWarning(message: string, details?: unknown): void {
    if (details === undefined) {
        console.warn(CONVERT_DEBUG_PREFIX, message);
        return;
    }

    console.warn(CONVERT_DEBUG_PREFIX, message, details);
}

/**
 * Writes a scoped error message to the Obsidian developer console.
 */
function logConvertError(message: string, details?: unknown): void {
    if (details === undefined) {
        console.error(CONVERT_DEBUG_PREFIX, message);
        return;
    }

    console.error(CONVERT_DEBUG_PREFIX, message, details);
}

/**
 * Drives batch conversion of note, folder, or vault image references between file and inline formats.
 */
class ConvertImagesModal extends Modal {
    private plugin: Plugin;
    private conversionScope: 'note' | 'folder' | 'vault';
    private conversionType: 'toBase64' | 'toImage';

    /**
     * Stores the plugin reference and default conversion options for the modal session.
     */
    constructor(app: App, plugin: Plugin) {
        super(app);
        this.plugin = plugin;
        this.conversionScope = 'note';
        this.conversionType = 'toBase64';
    }

    /**
     * Builds the modal UI for choosing conversion scope and direction.
     */
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Convert Images' });

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

        // Conversion type selection
        const typeContainer = contentEl.createEl('div', { cls: 'setting-item' });
        typeContainer.createEl('label', { text: 'Conversion Type' });
        const typeSelect = typeContainer.createEl('select');
        
        const types = [
            { value: 'toBase64', text: 'Image Files → Base64' },
            { value: 'toImage', text: 'Base64 → Image Files' }
        ];

        types.forEach(type => {
            typeSelect.createEl('option', {
                value: type.value,
                text: type.text
            });
        });

        // Convert button
        const buttonContainer = contentEl.createEl('div', { cls: 'setting-item' });
        const convertButton = buttonContainer.createEl('button', {
            text: 'Convert',
            cls: 'mod-cta'
        });

        convertButton.addEventListener('click', async () => {
            this.conversionScope = scopeSelect.value as 'note' | 'folder' | 'vault';
            this.conversionType = typeSelect.value as 'toBase64' | 'toImage';
            
            await this.performConversion();
            this.close();
        });
    }

    /**
     * Runs the requested batch conversion over the selected note scope.
     */
    async performConversion() {
        const files = await this.getFilesInScope();
        let converted = 0;

        logConvertDebug('Starting batch conversion', {
            scope: this.conversionScope,
            conversionType: this.conversionType,
            fileCount: files.length,
        });

        for (const file of files) {
            if (this.conversionType === 'toBase64') {
                const modified = await this.convertToBase64(file);
                if (modified) {
                    converted++;
                }
            } else {
                const modified = await this.convertToImages(file);
                if (modified) {
                    converted++;
                }
            }
        }

        logConvertDebug('Completed batch conversion', {
            scope: this.conversionScope,
            conversionType: this.conversionType,
            converted,
            totalFiles: files.length,
        });

        new Notice(`Converted ${converted} files`);
    }

    /**
     * Collects markdown files for the currently selected conversion scope.
     */
    async getFilesInScope(): Promise<TFile[]> {
        switch (this.conversionScope) {
            case 'note':
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    logConvertWarning('No active file was available for note-scoped conversion');
                    return [];
                }

                return [activeFile];
            
            case 'folder':
                const currentFile = this.app.workspace.getActiveFile();
                if (!currentFile?.parent) {
                    logConvertWarning('No active folder was available for folder-scoped conversion');
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
     * Returns the active editor when the target file is currently open, otherwise null.
     */
    getActiveEditorForFile(file: TFile): Editor | null {
        const activeFile = this.app.workspace.getActiveFile();
        const activeEditor = this.app.workspace.activeEditor?.editor ?? null;

        if (!activeFile || activeFile.path !== file.path || !activeEditor) {
            return null;
        }

        return activeEditor;
    }

    /**
     * Updates a markdown file atomically in the vault or through the active editor when it is open.
     */
    async updateMarkdownFile(file: TFile, updater: (content: string) => string): Promise<boolean> {
        const activeEditor = this.getActiveEditorForFile(file);
        if (activeEditor) {
            const currentContent = activeEditor.getValue();
            const updatedContent = updater(currentContent);

            if (updatedContent === currentContent) {
                logConvertDebug('Skipped editor update because content did not change', {
                    file: file.path,
                });
                return false;
            }

            activeEditor.setValue(updatedContent);
            logConvertDebug('Updated open note through active editor', {
                file: file.path,
            });
            return true;
        }

        let modified = false;
        await this.app.vault.process(file, (content) => {
            const updatedContent = updater(content);
            modified = updatedContent !== content;
            return updatedContent;
        });

        if (modified) {
            logConvertDebug('Updated closed note through vault.process', {
                file: file.path,
            });
        } else {
            logConvertDebug('Skipped vault.process update because content did not change', {
                file: file.path,
            });
        }

        return modified;
    }

    /**
     * Applies exact-string replacements to markdown content in a deterministic sequence.
     */
    applyReplacements(content: string, replacements: Array<{ from: string; to: string }>): string {
        let updatedContent = content;

        for (const replacement of replacements) {
            updatedContent = updatedContent.replace(replacement.from, replacement.to);
        }

        return updatedContent;
    }

    /**
     * Rewrites local image embeds in a note into MIME-aware inline data URLs.
     */
    async convertToBase64(file: TFile): Promise<boolean> {
        const content = await this.app.vault.read(file);
        const imageRegex = /!\[\[([^\]]+\.(png|jpg|jpeg))\]\]/g;
        const replacements: Array<{ from: string; to: string }> = [];
        let match: RegExpExecArray | null;

        while ((match = imageRegex.exec(content)) !== null) {
            const imagePath = match[1];
            const imageFile = this.app.metadataCache.getFirstLinkpathDest(imagePath, file.path);

            if (!(imageFile instanceof TFile)) {
                logConvertWarning('Skipped image embed because the linked file could not be resolved', {
                    note: file.path,
                    imagePath,
                });
                continue;
            }

            try {
                replacements.push({
                    from: match[0],
                    to: (await Base64File.fromTFile(imageFile)).to64Link(),
                });
            } catch (error) {
                logConvertError('Failed to convert image embed to base64', {
                    note: file.path,
                    imagePath: imageFile.path,
                    error,
                });
                continue;
            }
        }

        logConvertDebug('Prepared base64 replacements', {
            file: file.path,
            replacements: replacements.length,
        });

        return this.updateMarkdownFile(file, (currentContent) => {
            return this.applyReplacements(currentContent, replacements);
        });
    }

	/**
	 * Writes inline data URLs back to vault attachments while preserving their image metadata.
	 */
    async convertToImages(file: TFile): Promise<boolean> {
        const content = await this.app.vault.read(file);
        const base64Regex = /!\[.*?\]\(data:image\/[^;]+;base64,[^)]+\)/g;
        const replacements: Array<{ from: string; to: string }> = [];
        let match: RegExpExecArray | null;

        while ((match = base64Regex.exec(content)) !== null) {
            const base64File = Base64File.from64Link(match[0]);
            if (!base64File) {
                logConvertWarning('Skipped inline image because the data URL could not be parsed', {
                    note: file.path,
                });
                continue;
            }

            try {
                const targetPath = await this.app.fileManager.getAvailablePathForAttachment(
                    base64File.filename,
                    file.path
                );

                const imageFile = createImageFile(base64File);
                await this.app.vault.createBinary(targetPath, await imageFile.arrayBuffer());

                const newFile = this.app.vault.getAbstractFileByPath(targetPath);
                if (newFile instanceof TFile) {
                    replacements.push({
                        from: match[0],
                        to: this.app.fileManager.generateMarkdownLink(newFile, file.path),
                    });
                    continue;
                }

                logConvertWarning('Created an attachment but could not resolve it back from the vault', {
                    note: file.path,
                    targetPath,
                });
            } catch (error) {
                logConvertError('Failed to materialize inline image as an attachment', {
                    note: file.path,
                    filename: base64File.filename,
                    error,
                });
            }
        }

        logConvertDebug('Prepared attachment replacements', {
            file: file.path,
            replacements: replacements.length,
        });

        return this.updateMarkdownFile(file, (currentContent) => {
            return this.applyReplacements(currentContent, replacements);
        });
    }

    /**
     * Clears modal contents after the batch conversion dialog closes.
     */
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

    /**
     * Registers the batch conversion command in the command palette.
     */
export function registerConvertCommand(plugin: Plugin) {
    plugin.addCommand({
        id: 'convert-images',
        name: 'Convert Images',
        callback: () => {
            new ConvertImagesModal(plugin.app, plugin).open();
        }
    });
}

export {};
