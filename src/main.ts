import {
	App,
	Plugin,
	Notice,
	Editor,
	TFile,
	getBlobArrayBuffer,
	MarkdownView,
} from "obsidian";
import {
	arrayBufferToBase64,
	fileToBase64,
	fetchRemoteImageToBase64,
} from "./utils";
import {
	ImageToBase64Settings,
	DEFAULT_SETTINGS,
	ImageToBase64SettingTab,
} from "./settings";
import { ConvertAllModal, shouldSkipImage } from "./modal/convertAllModal";

export default class ImageToBase64Plugin extends Plugin {
	settings: ImageToBase64Settings;

	async onload() {

		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new ImageToBase64SettingTab(this.app, this));

		// Add commands
		this.addCommand({
			id: "toggle-convert-on-paste",
			name: "Enable/disable convert to base64 on paste",
			callback: () => {
				this.settings.convertOnPaste = !this.settings.convertOnPaste;
				this.saveSettings();
				new Notice(
					`Convert on paste is now ${
						this.settings.convertOnPaste ? "enabled" : "disabled"
					}`
				);
			},
		});

		this.addCommand({
			id: "paste-image-as-base64",
			name: "Paste image as Base64",
			editorCallback: async (editor: Editor) => {
				navigator.clipboard
					.read()
					.then(async (items) => {
						for (const clipboardItem of items) {
							for (const type of clipboardItem.types) {
								if (!(type.indexOf("image") === 0)) {
									continue;
								}
								const blob = await clipboardItem.getType(type);
								const arrayBuffer = await new Response(
									blob
								).arrayBuffer();
								const base64 = arrayBufferToBase64(arrayBuffer);

								// Determine where to insert the new line with the image
								const cursor = editor.getCursor();
								const imgMarkdown = `![](data:image/jpeg;base64,${base64})\n`;

								// Insert the base64 image on a new line at the current cursor position
								editor.replaceRange(imgMarkdown, cursor);

								const newCursorPos = {
									line: cursor.line,
									ch: imgMarkdown.length,
								};

								editor.setCursor(newCursorPos);
							}
						}
					})
					.catch((err) => {
						console.error(
							"Failed to read clipboard contents: ",
							err
						);
						new Notice("Error accessing clipboard.");
					});
			},
		});

		this.addCommand({
			id: "convert-all-images-to-base64",
			name: "Convert all image attachments to inline base64",
			editorCallback: async (editor: Editor) => {
				new ConvertAllModal(
					this.app,
					async (filters: {
						skipInternalLinks: boolean;
						skipRemoteLinks: boolean;
						customFilters: string[];
						forAllFiles: boolean;
					}) => {
						if (filters.forAllFiles) {
							// filter to only include md
							var targetFiles = this.app.vault.getFiles().filter(
								(file) => file.extension === "md"
							);
							console.log("Converting " + targetFiles.length + " files");
						} else {
							const afile = this.app.workspace.getActiveFile();
							if (!afile) return;
							var targetFiles = [afile];
						}
						
						// Convert all image attachments to inline base64
						for (const file of targetFiles) {
							console.log("Converting file " + file.path);
							const content = await this.app.vault.read(file);
							const updatedContent =
								await this.convertAllImagesToBase64(
									content,
									file,
									filters
								);

							await this.app.vault.modify(file, updatedContent);
						}

						new Notice(
							"All image attachments have been converted to inline base64."
						);
					}
				).open();
			},
		});

		// Event listener for paste actions
		this.registerEvent(
			this.app.workspace.on(
				"editor-paste",
				async (evt: ClipboardEvent, editor: Editor) => {
					if (!(this.settings.convertOnPaste && evt.clipboardData)) {
						return;
					}
					const items = Array.from(evt.clipboardData.items);
					
					evt.preventDefault();
					if (!items.some(item => item.type.startsWith("image"))) {
						return;
					}
		
					let cursor = editor.getCursor(); // Initial cursor position
		
					items.forEach(async (item) => {
						if (item.type.startsWith("image")) {
							console.log("Detected " + item.type + " kind " + item.kind);
							const file = item.getAsFile();
							console.log("Converting file " + file?.name + " to base64");
							if (file) {
								try {
									const base64String = arrayBufferToBase64(
										await getBlobArrayBuffer(file)
									);
									const imgMarkdown = `![](data:image/png;base64,${base64String})\n`;
		
									// Insert the base64 image at the current cursor position
									editor.replaceRange(imgMarkdown, cursor);
		
									// Update the cursor position
									cursor = { line: cursor.line + 1, ch: 0 };
									editor.setCursor(cursor);
								} catch (error) {
									console.error("Error converting image to base64:", error);
								}
							}
						}
					});
				}
			)
		);
		
        
		// drag file in
		this.registerDomEvent(document, 'drop', async (event: DragEvent) => {
			if (!this.settings.convertOnDrop) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
		
			const editor = this.app.workspace.activeEditor?.editor;
			if (!editor) {
				console.log("No active editor found.");
				return;
			}
			
			if (event.dataTransfer && event.dataTransfer.files.length > 0) {
				let cursor = editor.getCursor(); // Initial cursor position
				console.log(`Initial cursor position: ${cursor.line}, ${cursor.ch}`);
				
				Array.from(event.dataTransfer.files).forEach(async (file, index) => {
					console.log(`Processing file ${index + 1}/${event.dataTransfer?.files.length}: ${file.name} (${file.type})`);
					
					if (file.type.startsWith('image')) {
						const arrayBuffer = await file.arrayBuffer();
						const base64 = arrayBufferToBase64(arrayBuffer);
						
						const imgMarkdown = `![](data:image/${file.type.split('/')[1]};base64,${base64})\n`;
						editor.replaceRange(imgMarkdown, cursor);
						
						// Update the cursor position for the next insertion
						cursor = { line: cursor.line + 1, ch: 0 };
						
						// Log the new cursor position
						console.log(`New cursor position: ${cursor.line}, ${cursor.ch}`);

						editor.setCursor(cursor);
					}
				});
			}
		}, true);

	}


	async convertAllImagesToBase64(
		content: string,
		file: TFile,
		filters: {
			skipInternalLinks: boolean;
			skipRemoteLinks: boolean;
			customFilters: string[];
			forAllFiles: boolean;
		}
	): Promise<string> {
		// Match image links that are not already inline base64 images
		const imageLinks = content.match(
			/!\[.*?\]\(((?!data:).*?)\)|!\[\[([^\]]+?)\]\]/g
		);
		if (!imageLinks) return content;

		for (const link of imageLinks) {
			let match =
				link.match(/!\[.*?\]\((.*?)\)/) ||
				link.match(/!\[\[([^\]]+?)\]\]/);
			if (!match) continue;

			const imagePath = match[1] || match[2];
			if (shouldSkipImage(link, imagePath, filters)) {
				continue;
			}

			let base64: string;

			if (imagePath.startsWith("http")) {
				// Handle remote images
				try {
					base64 = await fetchRemoteImageToBase64(imagePath);
				} catch (error) {
					console.error("Error fetching remote image:", error);
					continue;
				}
			} else {
				// Handle local images
				const imageFile = this.app.metadataCache.getFirstLinkpathDest(
					imagePath,
					file.path
				);
				if (!imageFile) continue;

				base64 = await fileToBase64(imageFile, this.app.vault);
			}

			const dataUrl = `data:image/png;base64,${base64}`;
			content = content.replace(link, `![](${dataUrl})`);
		}

		return content;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
