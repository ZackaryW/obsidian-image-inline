import { App, Editor, Modal, Notice, TFile } from "obsidian";
import { Base64File, buildOriginalBackupFilename, createImageFile } from "../utils/conversion";
import ImageInlinePlugin from "../main";

/**
 * Converts the selected vault image embed on the current line into an inline base64 image.
 */
class ConvertToBase64Modal extends Modal {
	private file: TFile;
	private editor: Editor;

	/**
	 * Captures the target image file and editor used for the one-line replacement.
	 */
	constructor(app: App, file: TFile, editor: Editor) {
		super(app);
		this.file = file;
		this.editor = editor;
	}

	/**
	 * Replaces the current local image embed with an inline Markdown image in the active editor line.
	 */
	async onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Convert to Base64" });

		try {
			const inlineImage = await Base64File.fromTFile(this.file);
			const markdown = `![[${this.file.name}]]`;
			const newMarkdown = inlineImage.to64Link();

			// Replace the content
			const cursor = this.editor.getCursor();
			const line = this.editor.getLine(cursor.line);

			const newLine = line.replace(markdown, newMarkdown);

			// Get the full line range
			const lineStart = this.editor.posToOffset({
				line: cursor.line,
				ch: 0,
			});
			const lineEnd = this.editor.posToOffset({
				line: cursor.line,
				ch: line.length,
			});

			// Replace the entire line
			this.editor.replaceRange(
				newLine,
				this.editor.offsetToPos(lineStart),
				this.editor.offsetToPos(lineEnd)
			);

			new Notice("Image converted to base64");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			new Notice("Failed to convert image: " + message);
		}

		this.close();
	}

	/**
	 * Clears modal contents when the temporary conversion dialog closes.
	 */
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Downloads a remote image URL and wraps it as a Base64File with inferred filename metadata.
 */
async function fetchOnlineImage(url: string): Promise<Base64File> {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch image: HTTP ${response.status}`);
		}

		// Check if the response is actually an image
		const contentType = response.headers.get("content-type");
		if (!contentType) {
			throw new Error("No content type received from server");
		}

		const mimeType = contentType.split(";")[0].trim();

		if (!contentType.startsWith("image/")) {
			throw new Error(
				`URL does not point to an image (content-type: ${contentType})`
			);
		}

		const blob = await response.blob();
		// Additional check to verify the blob is actually an image
		if (!blob.type.startsWith("image/")) {
			throw new Error(`Invalid image format (blob type: ${blob.type})`);
		}

		const arrayBuffer = await blob.arrayBuffer();

		// Extract filename from URL or use content type
		let filename = url.split("/").pop() || "image";
		// Remove query parameters
		filename = filename.split("?")[0];
		// If no extension in filename, add one based on content type
		if (!filename.includes(".")) {
			const ext = mimeType.split("/")[1] || "png";
			filename = `${filename}.${ext}`;
		}

		return new Base64File({ buffer: arrayBuffer, filename, mimeType });
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch online image: ${error.message}`);
		}
		throw new Error("Failed to fetch online image: Unknown error");
	}
}

/**
 * Applies the plugin's resizing rules and optionally stores a backup of the original source image.
 */
async function handleImageResizing(
	base64File: Base64File,
	plugin: ImageInlinePlugin,
	activeFile: TFile | null
): Promise<{ processedFile: Base64File; shouldSaveAsAttachment: boolean }> {
	const sizeInKB = base64File.size / 1024;
	let processedFile = base64File;
	let shouldSaveAsAttachment = false;

	if (plugin.settings.enableResizing) {
		if (plugin.settings.resizeStrategy === "smaller") {
			if (sizeInKB > plugin.settings.smallerThreshold) {
				shouldSaveAsAttachment = true;
			}
		} else {
			// Larger strategy
			if (
				sizeInKB > plugin.settings.largerThreshold ||
				plugin.settings.resizeSmallerFiles
			) {
				processedFile = await plugin.conversion.resize(
					base64File,
					plugin.settings.resizePercentage
				);

				if (plugin.settings.backupOriginalImage && activeFile) {
					const timestamp = new Date()
						.toISOString()
						.replace(/[:.]/g, "-");
					const backupFilename = buildOriginalBackupFilename(base64File, timestamp);

					const targetPath =
						await plugin.app.fileManager.getAvailablePathForAttachment(
							backupFilename,
							activeFile.path
						);

					const file = createImageFile(base64File, backupFilename);
					await plugin.app.vault.createBinary(
						targetPath,
						await file.arrayBuffer()
					);
				}
			}
		}
	}

	return { processedFile, shouldSaveAsAttachment };
}

/**
 * Replaces a remote image URL on the current line with either an inline image or a local attachment.
 */
async function convertOnlineImageToBase64(
	imageUrl: string,
	plugin: ImageInlinePlugin,
	editor: Editor,
	line: string,
	cursor: { line: number; ch: number },
	onlineMatch: RegExpMatchArray
) {
	try {
		const base64File = await fetchOnlineImage(imageUrl);
		const activeFile = plugin.app.workspace.getActiveFile();

		const { processedFile, shouldSaveAsAttachment } = await handleImageResizing(
			base64File,
			plugin,
			activeFile
		);

		if (shouldSaveAsAttachment && activeFile) {
			const file = createImageFile(base64File);
			const targetPath =
				await plugin.app.fileManager.getAvailablePathForAttachment(
					base64File.filename,
					activeFile.path
				);

			const newFile = (await plugin.app.vault.createBinary(
				targetPath,
				await file.arrayBuffer()
			)) as TFile;

			const link = plugin.app.fileManager.generateMarkdownLink(
				newFile,
				activeFile.path
			);

			// Replace the online image with the local link
			const newLine = line.replace(onlineMatch[0], link);
			const lineStart = editor.posToOffset({
				line: cursor.line,
				ch: 0,
			});
			const lineEnd = editor.posToOffset({
				line: cursor.line,
				ch: line.length,
			});

			editor.replaceRange(
				newLine,
				editor.offsetToPos(lineStart),
				editor.offsetToPos(lineEnd)
			);

			new Notice("Image saved as attachment due to size");
			return;
		}

		// Convert to base64 and replace the online image
		const newLine = line.replace(onlineMatch[0], processedFile.to64Link());
		const lineStart = editor.posToOffset({
			line: cursor.line,
			ch: 0,
		});
		const lineEnd = editor.posToOffset({
			line: cursor.line,
			ch: line.length,
		});

		editor.replaceRange(
			newLine,
			editor.offsetToPos(lineStart),
			editor.offsetToPos(lineEnd)
		);

		new Notice("Online image converted to base64");
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to convert online image: Unknown error";
		new Notice(message);
	}
}

/**
 * Adds context menu actions for converting local and remote images on the active editor line.
 */
export async function registerConvertImage(plugin: ImageInlinePlugin) {
	plugin.registerEvent(
		plugin.app.workspace.on("editor-menu", async (menu, editor) => {
			const cursor = editor.getCursor();
			const line = editor.getLine(cursor.line);

			// Check if cursor is on an image embed or online image
			const localImageRegex = /!\[\[([^\]\n]+\.(png|jpg|jpeg))\]\]/;
			const onlineImageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/;

			const localMatch = line.match(localImageRegex);
			const onlineMatch = line.match(onlineImageRegex);

			if (localMatch) {
				const imagePath = localMatch[1];
				const activeFile = plugin.app.workspace.getActiveFile();
				if (!activeFile) return;

				// Try to find the file using fileManager
				const file = plugin.app.metadataCache.getFirstLinkpathDest(
					imagePath,
					activeFile.path
				);

				if (file instanceof TFile) {
					menu.addItem((item) => {
						item.setTitle("Convert to Base64")
							.setIcon("code-glyph")
							.onClick(async () => {
								new ConvertToBase64Modal(
									plugin.app,
									file,
									editor
								).open();
							});
					});
				}
			} else if (onlineMatch) {
				const imageUrl = onlineMatch[2];
				menu.addItem((item) => {
					item.setTitle("Convert online image to base64")
						.setIcon("code-glyph")
						.onClick(async () => {
							await convertOnlineImageToBase64(
								imageUrl,
								plugin,
								editor,
								line,
								cursor,
								onlineMatch
							);
						});
				});
			}
		})
	);
}

// Add an empty export to make this a module
export {};
