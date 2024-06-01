import {
	App,
	Plugin,
	Notice,
	Editor,
	TFile,
	getBlobArrayBuffer,
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
					}) => {
						const file = this.app.workspace.getActiveFile();
						if (!file) return;

						const content = await this.app.vault.read(file);
						const updatedContent =
							await this.convertAllImagesToBase64(
								content,
								file,
								filters
							);

						await this.app.vault.modify(file, updatedContent);
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
					if (this.settings.convertOnPaste && evt.clipboardData) {
						const items = Array.from(evt.clipboardData.items);
						for (const item of items) {
							if (item.type.startsWith("image")) {
								evt.preventDefault();
								const file = item.getAsFile();
								if (file) {
									try {
										const base64String =
											arrayBufferToBase64(
												await getBlobArrayBuffer(file)
											);
										editor.replaceSelection(
											`![](data:image/png;base64,${base64String})${
												this.settings
													.appendNewLineAfterPaste
													? "\n"
													: ""
											}`
										);
										console.log(
											"Pasted image converted to base64!"
										);
									} catch (error) {
										console.error(
											"Error converting image to base64:",
											error
										);
									}
									break;
								}
							}
						}
					}
				}
			)
		);
	}

    

	async convertAllImagesToBase64(content: string, file: TFile, filters: { skipInternalLinks: boolean; skipRemoteLinks: boolean; customFilters: string[] }): Promise<string> {
        // Match image links that are not already inline base64 images
        const imageLinks = content.match(/!\[.*?\]\(((?!data:).*?)\)|!\[\[([^\]]+?)\]\]/g);
        if (!imageLinks) return content;
    
        for (const link of imageLinks) {
            let match = link.match(/!\[.*?\]\((.*?)\)/) || link.match(/!\[\[([^\]]+?)\]\]/);
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
                const imageFile = this.app.metadataCache.getFirstLinkpathDest(imagePath, file.path);
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
