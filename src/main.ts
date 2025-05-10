import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { Base64Conversion, Base64File } from './utils/conversion';
import { linkDecorations } from './coms/antiLinkExpand';
import { registerExportToLocal } from './comsContext/export';
import { registerConvertImage } from './comsContext/convert';
// Remember to rename these classes and interfaces!

export interface ImageInlineSettings {
	// General settings
	convertOnPaste: boolean;
	convertOnDrop: boolean;
	
	// Resizing settings
	enableResizing: boolean;
	resizeStrategy: 'smaller' | 'larger';
	// For smaller strategy
	smallerThreshold: number; // in KB
	// For larger strategy
	largerThreshold: number; // in KB
	resizePercentage: number;
	backupOriginalImage: boolean;
	resizeSmallerFiles: boolean; // New option for larger strategy
}

const DEFAULT_SETTINGS: ImageInlineSettings = {
	convertOnPaste: true,
	convertOnDrop: true,
	enableResizing: false,
	resizeStrategy: 'smaller',
	smallerThreshold: 1000, // 1MB default
	largerThreshold: 1000, // 1MB default
	resizePercentage: 80,
	backupOriginalImage: true,
	resizeSmallerFiles: false // Default to false
}

export default class ImageInlinePlugin extends Plugin {
	settings: ImageInlineSettings;
	conversion: Base64Conversion;

	async onload() {
		await this.loadSettings();
		this.conversion = new Base64Conversion();

		// Register the anti-link expansion view plugin
		this.registerEditorExtension(linkDecorations);

		// Register export to local functionality
		await registerExportToLocal(this);

		await registerConvertImage(this);

		// Register paste event
		this.registerEvent(
			this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor) => {
				if (!this.settings.convertOnPaste) return;
				
				const items = evt.clipboardData?.items;
				if (!items) return;

				// Check if all items are images
				const allImages = Array.from(items).every(item => item.type.startsWith('image/'));
				if (!allImages) return; // Let the app handle mixed content

				evt.preventDefault();
				const base64Files: Base64File[] = [];

				for (const item of Array.from(items)) {
					if (item.type.startsWith('image/')) {
						const file = item.getAsFile();
						if (file) {
							const base64File = await this.conversion.fromFile(file);
							base64Files.push(base64File);
						}
					}
				}

				if (base64Files.length > 0) {
					await this.handleImages(base64Files, editor);
				}
			})
		);

		// Register drop event
		this.registerEvent(
			this.app.workspace.on('editor-drop', async (evt: DragEvent, editor: Editor) => {
				if (!this.settings.convertOnDrop) return;
				
				const files = evt.dataTransfer?.files;
				if (!files || files.length === 0) return;

				// Check if all files are images
				const allImages = Array.from(files).every(file => file.type.startsWith('image/'));
				if (!allImages) return; // Let the app handle mixed content

				evt.preventDefault();
				const base64Files: Base64File[] = [];

				for (const file of Array.from(files)) {
					if (file.type.startsWith('image/')) {
						const base64File = await this.conversion.fromFile(file);
						base64Files.push(base64File);
					}
				}

				if (base64Files.length > 0) {
					await this.handleImages(base64Files, editor);
				}
			})
		);

		// Add settings tab
		this.addSettingTab(new ImageInlineSettingTab(this.app, this));
	}

	async handleImages(base64Files: Base64File[], editor: Editor) {
		try {
			if (!this.settings.enableResizing) {
				// If resizing is disabled, convert all to base64
				const markdown = base64Files.map(file => file.to64Link()).join('\n');
				editor.replaceSelection(markdown);
				return;
			}

			const processedFiles: Base64File[] = [];
			const attachments: Base64File[] = [];

			for (const base64File of base64Files) {
				const sizeInKB = base64File.size / 1024;
				
				if (this.settings.resizeStrategy === 'smaller') {
					// Smaller strategy: convert small files to base64, save large ones as attachments
					if (sizeInKB <= this.settings.smallerThreshold) {
						processedFiles.push(base64File);
					} else {
						attachments.push(base64File);
					}
				} else {
					// Larger strategy: resize large files, convert small ones to base64
					if (sizeInKB > this.settings.largerThreshold) {
						const resizedFile = await this.conversion.resize(base64File, this.settings.resizePercentage);
						processedFiles.push(resizedFile);
						
						if (this.settings.backupOriginalImage) {
							const activeFile = this.app.workspace.getActiveFile();
							if (activeFile) {
								const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
								const backupFilename = `${base64File.filename.replace('.png', '')}_original_${timestamp}.png`;
								
								const targetPath = await this.app.fileManager.getAvailablePathForAttachment(
									backupFilename,
									activeFile.path
								);
								
								const file = new File([base64File.buffer], backupFilename, { type: 'image/png' });
								await this.app.vault.createBinary(
									targetPath,
									await file.arrayBuffer()
								) as TFile;
							}
						}
					} else {
						// Small files are directly converted to base64
						processedFiles.push(base64File);
					}
				}
			}

			// Insert all processed files as base64
			if (processedFiles.length > 0) {
				const markdown = processedFiles.map(file => file.to64Link()).join('\n');
				editor.replaceSelection(markdown);
			}

			// Handle attachments
			if (attachments.length > 0) {
				new Notice(`${attachments.length} image(s) will be saved as attachments`);
				for (const attachment of attachments) {
					const activeFile = this.app.workspace.getActiveFile();
					if (activeFile) {
						const file = new File([attachment.buffer], attachment.filename, { type: 'image/png' });
						const targetPath = await this.app.fileManager.getAvailablePathForAttachment(
							attachment.filename,
							activeFile.path
						);
						
						const newFile = await this.app.vault.createBinary(
							targetPath,
							await file.arrayBuffer()
						) as TFile;
						
						const link = this.app.fileManager.generateMarkdownLink(
							newFile,
							activeFile.path
						);
						editor.replaceSelection(link + '\n');
					}
				}
			}
		} catch (error) {
			new Notice('Failed to process images: ' + error.message);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}

class ImageInlineSettingTab extends PluginSettingTab {
	plugin: ImageInlinePlugin;

	constructor(app: App, plugin: ImageInlinePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// General Settings Section
		containerEl.createEl('h2', { text: 'General Settings' });

		new Setting(containerEl)
			.setName('Convert on paste')
			.setDesc('Convert images pasted into the editor to base64')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.convertOnPaste)
				.onChange(async (value) => {
					this.plugin.settings.convertOnPaste = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Convert on drop')
			.setDesc('Convert images dropped into the editor to base64')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.convertOnDrop)
				.onChange(async (value) => {
					this.plugin.settings.convertOnDrop = value;
					await this.plugin.saveSettings();
				}));

		// Resizing Settings Section
		containerEl.createEl('h2', { text: 'Image Resizing' });

		new Setting(containerEl)
			.setName('Enable resizing')
			.setDesc('Enable image resizing features')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableResizing)
				.onChange(async (value) => {
					this.plugin.settings.enableResizing = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide resizing options
				}));

		if (this.plugin.settings.enableResizing) {
			new Setting(containerEl)
				.setName('Resizing strategy')
				.setDesc('Choose how to handle image resizing')
				.addDropdown(dropdown => dropdown
					.addOption('smaller', 'Convert small images to base64')
					.addOption('larger', 'Resize large images')
					.setValue(this.plugin.settings.resizeStrategy)
					.onChange(async (value: 'smaller' | 'larger') => {
						this.plugin.settings.resizeStrategy = value;
						await this.plugin.saveSettings();
						this.display(); // Refresh to show/hide strategy-specific settings
					}));

			if (this.plugin.settings.resizeStrategy === 'smaller') {
				new Setting(containerEl)
					.setName('Size threshold')
					.setDesc('Images smaller than this size (in KB) will be converted to base64')
					.addText(text => text
						.setValue(this.plugin.settings.smallerThreshold.toString())
						.onChange(async (value) => {
							const num = Number(value);
							if (!isNaN(num)) {
								this.plugin.settings.smallerThreshold = num;
								await this.plugin.saveSettings();
							}
						}));
			} else {
				new Setting(containerEl)
					.setName('Size threshold')
					.setDesc('Images larger than this size (in KB) will be resized')
					.addText(text => text
						.setValue(this.plugin.settings.largerThreshold.toString())
						.onChange(async (value) => {
							const num = Number(value);
							if (!isNaN(num)) {
								this.plugin.settings.largerThreshold = num;
								await this.plugin.saveSettings();
							}
						}));

				new Setting(containerEl)
					.setName('Resize percentage')
					.setDesc('Percentage to resize images to (1-100)')
					.addSlider(slider => slider
						.setLimits(1, 100, 1)
						.setValue(this.plugin.settings.resizePercentage)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.resizePercentage = value;
							await this.plugin.saveSettings();
						}));

				new Setting(containerEl)
					.setName('Backup original images')
					.setDesc('Save original images to media folder when resizing')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.backupOriginalImage)
						.onChange(async (value) => {
							this.plugin.settings.backupOriginalImage = value;
							await this.plugin.saveSettings();
						}));

				new Setting(containerEl)
					.setName('Resize smaller files')
					.setDesc('Also resize files smaller than the threshold when using larger strategy')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.resizeSmallerFiles)
						.onChange(async (value) => {
							this.plugin.settings.resizeSmallerFiles = value;
							await this.plugin.saveSettings();
						}));
			}
		}
	}
}

