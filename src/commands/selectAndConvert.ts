import { App, Modal, Notice, Plugin, TFile } from "obsidian";
import { Base64File, createImageFile } from "../utils/conversion";

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
        console.log('Files in scope:', files.length);
        let converted = 0;

        for (const file of files) {
            if (this.conversionType === 'toBase64') {
                // For base64 conversion, we need markdown files that contain image embeds
                const content = await this.app.vault.read(file);
                const imageRegex = /!\[\[([^\]]+\.(png|jpg|jpeg))\]\]/g;
                const matches = content.match(imageRegex);
                
                if (matches) {
                    console.log('Found image embeds in:', file.path);
                    await this.convertToBase64(file);
                    converted++;
                }
            } else {
                // Convert base64 to image files
                const content = await this.app.vault.read(file);
                const base64Regex = /!\[.*?\]\(data:image\/[^;]+;base64,[^)]+\)/g;
                const matches = content.match(base64Regex);
                
                if (matches) {
                    console.log('Found base64 images in:', file.path);
                    await this.convertToImages(file, matches);
                    converted++;
                }
            }
        }

        new Notice(`Converted ${converted} files`);
    }

    /**
     * Collects markdown files for the currently selected conversion scope.
     */
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

    /**
     * Rewrites local image embeds in a note into MIME-aware inline data URLs.
     */
    async convertToBase64(file: TFile) {
        const content = await this.app.vault.read(file);
        const imageRegex = /!\[\[([^\]]+\.(png|jpg|jpeg))\]\]/g;
        let newContent = content;
        let modified = false;

        // Find all matches first
        const matches = Array.from(content.matchAll(imageRegex));
        
        // Process each match
        for (const match of matches) {
            const imagePath = match[1];
            const imageFile = this.app.metadataCache.getFirstLinkpathDest(imagePath, file.path);
            
            if (imageFile instanceof TFile) {
                try {
                    const markdown = `![[${imageFile.name}]]`;
                    const newMarkdown = (await Base64File.fromTFile(imageFile)).to64Link();
                    newContent = newContent.replace(markdown, newMarkdown);
                    modified = true;
                } catch {
                    continue;
                }
            }
        }

        if (modified) {
            await this.app.vault.modify(file, newContent);
        }
    }

	/**
	 * Writes inline data URLs back to vault attachments while preserving their image metadata.
	 */
    async convertToImages(file: TFile, matches: string[]) {
        const content = await this.app.vault.read(file);
        let newContent = content;

        for (const match of matches) {
            const base64File = Base64File.from64Link(match);
            if (!base64File) continue;
            
            const targetPath = await this.app.fileManager.getAvailablePathForAttachment(
                base64File.filename,
                file.path
            );
            
            const imageFile = createImageFile(base64File);
            await this.app.vault.createBinary(targetPath, await imageFile.arrayBuffer());
            
            const newFile = this.app.vault.getAbstractFileByPath(targetPath);
            if (newFile instanceof TFile) {
                const link = this.app.fileManager.generateMarkdownLink(newFile, file.path);
                newContent = newContent.replace(match, link);
            }
        }

        if (newContent !== content) {
            await this.app.vault.modify(file, newContent);
        }
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
